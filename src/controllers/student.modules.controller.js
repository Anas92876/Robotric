const asyncHandler    = require('../utils/asyncHandler');
const modulesService  = require('../services/student.modules.service');

exports.getModuleContent = asyncHandler(async (req, res) => {
  const data = await modulesService.getModuleContent(req.params.moduleId, req.user._id);
  res.json({ success: true, data });
});

exports.startModule = asyncHandler(async (req, res) => {
  const data = await modulesService.startModule(req.params.moduleId, req.user._id);
  res.json({ success: true, message: 'Module started successfully', data });
});

exports.completeModule = asyncHandler(async (req, res) => {
  const data = await modulesService.completeModule(req.params.moduleId, req.user._id);
  res.json({ success: true, message: 'Module marked as completed', data });
});

exports.updateModuleProgress = asyncHandler(async (req, res) => {
  const data = await modulesService.updateModuleProgress(req.params.moduleId, req.user._id, req.body);
  res.json({ success: true, message: 'Progress updated', data });
});

exports.getModuleProgress = asyncHandler(async (req, res) => {
  const data = await modulesService.getModuleProgress(req.params.moduleId, req.user._id);
  res.json({ success: true, data });
});

exports.getNextModule = asyncHandler(async (req, res) => {
  const data = await modulesService.getNextModule(req.params.moduleId);
  if (!data) {
    return res.json({ success: true, message: 'No next module. You have reached the end of the course.', data: null });
  }
  res.json({ success: true, data });
});

exports.getPreviousModule = asyncHandler(async (req, res) => {
  const data = await modulesService.getPreviousModule(req.params.moduleId);
  if (!data) {
    return res.json({ success: true, message: 'No previous module. This is the first module.', data: null });
  }
  res.json({ success: true, data });
});
