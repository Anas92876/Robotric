const moduleRepo         = require('../repositories/module.repository');
const moduleProgressRepo = require('../repositories/moduleProgress.repository');
const enrollmentRepo     = require('../repositories/enrollment.repository');

const { AppError } = require('../utils/errors');

// ─── Private Helpers ──────────────────────────────────────────────────────────

async function _getOrCreateProgress(studentId, moduleId, courseId) {
  let progress = await moduleProgressRepo.findOne({
    student: studentId,
    module:  moduleId,
    course:  courseId
  });

  if (!progress) {
    progress = await moduleProgressRepo.create({
      student: studentId,
      module:  moduleId,
      course:  courseId,
      status:  'not_started'
    });
  }

  return progress;
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function getModuleContent(moduleId, studentId) {
  const module = await moduleRepo.findById(moduleId, {
    populate: [
      { path: 'quiz',       select: 'title description passingScore timeLimit maxAttempts' },
      { path: 'assignment', select: 'title description dueDate maxScore allowedFileTypes' }
    ]
  });
  if (!module) throw new AppError('Module not found', 404);

  const enrollment = await enrollmentRepo.findOne({
    student: studentId,
    course:  module.course,
    status:  { $in: ['active', 'completed'] }
  });
  if (!enrollment) throw new AppError('You are not enrolled in this course', 403);

  if (module.isLocked && module.unlockAfter) {
    const previousProgress = await moduleProgressRepo.findOne({
      student: studentId,
      module:  module.unlockAfter,
      status:  'completed'
    });
    if (!previousProgress) {
      throw new AppError('This module is locked. Complete the previous module first.', 403);
    }
  }

  const progress = await _getOrCreateProgress(studentId, moduleId, module.course);
  progress.lastAccessedAt = new Date();
  await moduleProgressRepo.save(progress);

  return { module, progress };
}

async function startModule(moduleId, studentId) {
  const module = await moduleRepo.findById(moduleId);
  if (!module) throw new AppError('Module not found', 404);

  const enrollment = await enrollmentRepo.findOne({
    student: studentId,
    course:  module.course,
    status:  'active'
  });
  if (!enrollment) throw new AppError('You are not enrolled in this course', 403);

  const progress = await _getOrCreateProgress(studentId, moduleId, module.course);

  if (progress.status === 'not_started') {
    progress.markAsStarted();
    await moduleProgressRepo.save(progress);

    enrollment.progress.currentModule  = moduleId;
    enrollment.progress.lastAccessedAt = new Date();
    await enrollmentRepo.save(enrollment);
  }

  return progress;
}

async function completeModule(moduleId, studentId) {
  const module = await moduleRepo.findById(moduleId);
  if (!module) throw new AppError('Module not found', 404);

  const enrollment = await enrollmentRepo.findOne({
    student: studentId,
    course:  module.course,
    status:  'active'
  });
  if (!enrollment) throw new AppError('You are not enrolled in this course', 403);

  const progress = await moduleProgressRepo.findOne({
    student: studentId,
    module:  moduleId,
    course:  module.course
  });
  if (!progress) throw new AppError('Module progress not found. Start the module first.', 400);

  if (progress.status !== 'completed') {
    progress.markAsCompleted();
    await moduleProgressRepo.save(progress);

    if (!enrollment.progress.completedModules.includes(moduleId)) {
      enrollment.progress.completedModules.push(moduleId);

      const totalModules = await moduleRepo.countDocuments({ course: module.course, isActive: true });
      await enrollment.updateProgressPercentage(totalModules);

      if (enrollment.progress.percentageComplete >= 100) {
        enrollment.status      = 'completed';
        enrollment.completedAt = new Date();
      }

      await enrollmentRepo.save(enrollment);
    }
  }

  return {
    progress,
    enrollment: {
      percentageComplete: enrollment.progress.percentageComplete,
      completedModules:   enrollment.progress.completedModules.length
    }
  };
}

async function updateModuleProgress(moduleId, studentId, { timeSpent, videoProgress } = {}) {
  const module = await moduleRepo.findById(moduleId);
  if (!module) throw new AppError('Module not found', 404);

  const progress = await _getOrCreateProgress(studentId, moduleId, module.course);

  if (timeSpent !== undefined) {
    progress.addTimeSpent(timeSpent);
  }

  if (videoProgress) {
    progress.videoProgress = {
      currentTime: videoProgress.currentTime || 0,
      duration:    videoProgress.duration    || 0,
      completed:   videoProgress.completed   || false
    };
  }

  await moduleProgressRepo.save(progress);
  return progress;
}

async function getModuleProgress(moduleId, studentId) {
  const module = await moduleRepo.findById(moduleId);
  if (!module) throw new AppError('Module not found', 404);

  const progress = await moduleProgressRepo.findOne({
    student: studentId,
    module:  moduleId
  });

  return progress || {
    status:        'not_started',
    timeSpent:     0,
    videoProgress: { currentTime: 0, duration: 0, completed: false }
  };
}

async function getNextModule(moduleId) {
  const currentModule = await moduleRepo.findById(moduleId);
  if (!currentModule) throw new AppError('Module not found', 404);

  const results = await moduleRepo.find(
    { course: currentModule.course, order: { $gt: currentModule.order }, isActive: true },
    { sort: { order: 1 }, limit: 1 }
  );
  return results[0] || null;
}

async function getPreviousModule(moduleId) {
  const currentModule = await moduleRepo.findById(moduleId);
  if (!currentModule) throw new AppError('Module not found', 404);

  const results = await moduleRepo.find(
    { course: currentModule.course, order: { $lt: currentModule.order }, isActive: true },
    { sort: { order: -1 }, limit: 1 }
  );
  return results[0] || null;
}

module.exports = {
  getModuleContent,
  startModule,
  completeModule,
  updateModuleProgress,
  getModuleProgress,
  getNextModule,
  getPreviousModule
};
