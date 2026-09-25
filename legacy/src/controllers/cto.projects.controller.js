const asyncHandler = require('../utils/asyncHandler');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const logger = require('../utils/logger');
const InternalProject = require('../models/InternalProject');
const InternalTask = require('../models/InternalTask');
const User = require('../models/User');

// Validates that every ID belongs to an existing user with role 'client' — stricter
// than the assignedEngineers check below, since silently linking a non-client user
// would quietly grant them the ability to submit requests on this project.
const validateClients = async (clients) => {
  if (!clients || clients.length === 0) return [];
  const users = await User.find({ _id: { $in: clients } }).select('_id role');
  if (users.length !== clients.length) {
    throw new BadRequestError('One or more client IDs are invalid', 'INVALID_CLIENT_IDS');
  }
  if (users.some(u => u.role !== 'client')) {
    throw new BadRequestError('One or more IDs do not belong to a client account', 'NOT_A_CLIENT');
  }
  return clients;
};

exports.createProject = asyncHandler(async (req, res) => {
  const { name, description, priority, assignedEngineers, clients, parentProject } = req.body;

  if (assignedEngineers && assignedEngineers.length > 0) {
    const users = await User.find({ _id: { $in: assignedEngineers } }).select('_id');
    if (users.length !== assignedEngineers.length) {
      throw new BadRequestError('One or more assigned user IDs are invalid', 'INVALID_USER_IDS');
    }
  }

  await validateClients(clients);

  if (parentProject) {
    const parent = await InternalProject.findById(parentProject);
    if (!parent) throw new NotFoundError('Parent project', 'PARENT_PROJECT_NOT_FOUND');
    if (parent.parentProject) throw new BadRequestError('Cannot nest sub-projects more than one level deep', 'NESTING_NOT_ALLOWED');
  }

  const project = await InternalProject.create({
    name,
    description,
    priority,
    assignedEngineers: assignedEngineers || [],
    clients: clients || [],
    createdBy: req.user._id,
    parentProject: parentProject || null,
  });

  logger.info(`CTO created internal project: ${project.name} (${project._id})`);

  res.status(201).json({ success: true, message: 'Project created', data: project });
});

exports.getProjects = asyncHandler(async (req, res) => {
  // Only return top-level projects (no parent)
  const projects = await InternalProject.find({ parentProject: null })
    .populate('createdBy', 'name email')
    .populate('assignedEngineers', 'name email')
    .populate('clients', 'name email')
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  const projectIds = projects.map(p => p._id);

  const taskCountsRaw = await InternalTask.aggregate([
    { $match: { projectId: { $in: projectIds }, subProjectId: null } },
    { $group: { _id: { projectId: '$projectId', status: '$status' }, count: { $sum: 1 } } },
  ]);

  const subProjectCountsRaw = await InternalProject.aggregate([
    { $match: { parentProject: { $in: projectIds } } },
    { $group: { _id: '$parentProject', count: { $sum: 1 } } },
  ]);

  const taskCountMap = {};
  for (const entry of taskCountsRaw) {
    const pid = entry._id.projectId.toString();
    if (!taskCountMap[pid]) taskCountMap[pid] = { total: 0, todo: 0, in_progress: 0, done: 0 };
    taskCountMap[pid][entry._id.status] = entry.count;
    taskCountMap[pid].total += entry.count;
  }

  const subProjectCountMap = {};
  for (const entry of subProjectCountsRaw) {
    subProjectCountMap[entry._id.toString()] = entry.count;
  }

  const projectsWithCounts = projects.map(project => ({
    ...project,
    taskCounts: taskCountMap[project._id.toString()] || { total: 0, todo: 0, in_progress: 0, done: 0 },
    subProjectCount: subProjectCountMap[project._id.toString()] || 0,
  }));

  res.json({ success: true, count: projectsWithCounts.length, data: projectsWithCounts });
});

exports.getProjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const project = await InternalProject.findById(id)
    .populate('createdBy', 'name email')
    .populate('assignedEngineers', 'name email')
    .populate('clients', 'name email')
    .populate('parentProject', 'name priority')
    .lean();

  if (!project) throw new NotFoundError('Project', 'PROJECT_NOT_FOUND');

  const isSubProject = !!project.parentProject;

  const [todo, in_progress, done] = await Promise.all([
    InternalTask.countDocuments({ projectId: isSubProject ? project.parentProject._id : id, subProjectId: isSubProject ? id : null, status: 'todo' }),
    InternalTask.countDocuments({ projectId: isSubProject ? project.parentProject._id : id, subProjectId: isSubProject ? id : null, status: 'in_progress' }),
    InternalTask.countDocuments({ projectId: isSubProject ? project.parentProject._id : id, subProjectId: isSubProject ? id : null, status: 'done' }),
  ]);

  const taskCounts = { total: todo + in_progress + done, todo, in_progress, done };

  res.json({ success: true, data: { project, taskCounts } });
});

exports.getSubProjects = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const parent = await InternalProject.findById(id);
  if (!parent) throw new NotFoundError('Project', 'PROJECT_NOT_FOUND');

  const subProjects = await InternalProject.find({ parentProject: id })
    .populate('createdBy', 'name email')
    .populate('assignedEngineers', 'name email')
    .sort({ priority: 1, createdAt: -1 })
    .lean();

  const subProjectIds = subProjects.map(p => p._id);

  const taskCountsRaw = await InternalTask.aggregate([
    { $match: { subProjectId: { $in: subProjectIds } } },
    { $group: { _id: { subProjectId: '$subProjectId', status: '$status' }, count: { $sum: 1 } } },
  ]);

  const taskCountMap = {};
  for (const entry of taskCountsRaw) {
    const pid = entry._id.subProjectId.toString();
    if (!taskCountMap[pid]) taskCountMap[pid] = { total: 0, todo: 0, in_progress: 0, done: 0 };
    taskCountMap[pid][entry._id.status] = entry.count;
    taskCountMap[pid].total += entry.count;
  }

  const result = subProjects.map(sp => ({
    ...sp,
    taskCounts: taskCountMap[sp._id.toString()] || { total: 0, todo: 0, in_progress: 0, done: 0 },
  }));

  res.json({ success: true, count: result.length, data: result });
});

exports.moveProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { parentProject } = req.body;

  if (!parentProject) throw new BadRequestError('parentProject is required', 'MISSING_PARENT');

  const project = await InternalProject.findById(id);
  if (!project) throw new NotFoundError('Project', 'PROJECT_NOT_FOUND');

  if (project._id.toString() === parentProject.toString()) {
    throw new BadRequestError('A project cannot be its own parent', 'SELF_REFERENCE');
  }

  if (project.parentProject) {
    throw new BadRequestError('Project is already a sub-project. Promote it first.', 'ALREADY_SUBPROJECT');
  }

  const newParent = await InternalProject.findById(parentProject);
  if (!newParent) throw new NotFoundError('Target project', 'TARGET_NOT_FOUND');

  if (newParent.parentProject) {
    throw new BadRequestError('Cannot nest sub-projects more than one level deep', 'NESTING_NOT_ALLOWED');
  }

  // Move the project
  project.parentProject = parentProject;
  await project.save();

  // Re-home all tasks: point them at the new parent project, tag with this sub-project id
  await InternalTask.updateMany(
    { projectId: id },
    { $set: { projectId: parentProject, subProjectId: id } }
  );

  logger.info(`CTO moved project ${project.name} (${id}) under ${newParent.name} (${parentProject})`);

  res.json({ success: true, message: 'Project moved successfully', data: project });
});

exports.updateProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, priority, assignedEngineers, clients } = req.body;

  const project = await InternalProject.findById(id);
  if (!project) throw new NotFoundError('Project', 'PROJECT_NOT_FOUND');

  if (assignedEngineers !== undefined && assignedEngineers.length > 0) {
    const users = await User.find({ _id: { $in: assignedEngineers } }).select('_id');
    if (users.length !== assignedEngineers.length) {
      throw new BadRequestError('One or more assigned user IDs are invalid', 'INVALID_USER_IDS');
    }
  }

  if (clients !== undefined) await validateClients(clients);

  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;
  if (priority !== undefined) project.priority = priority;
  if (assignedEngineers !== undefined) project.assignedEngineers = assignedEngineers;
  if (clients !== undefined) project.clients = clients;

  await project.save();
  await project.populate('createdBy', 'name email');
  await project.populate('assignedEngineers', 'name email');
  await project.populate('clients', 'name email');

  logger.info(`CTO updated internal project: ${project.name} (${project._id})`);

  res.json({ success: true, message: 'Project updated', data: project });
});

exports.deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const project = await InternalProject.findById(id);
  if (!project) throw new NotFoundError('Project', 'PROJECT_NOT_FOUND');

  const subProjectCount = await InternalProject.countDocuments({ parentProject: id });
  if (subProjectCount > 0) {
    throw new BadRequestError('Cannot delete project with existing sub-projects', 'PROJECT_HAS_SUBPROJECTS');
  }

  const taskCount = await InternalTask.countDocuments({ projectId: id });
  if (taskCount > 0) {
    throw new BadRequestError('Cannot delete project with existing tasks', 'PROJECT_HAS_TASKS');
  }

  await InternalProject.findByIdAndDelete(id);

  logger.info(`CTO deleted internal project: ${project.name} (${project._id})`);

  res.json({ success: true, message: 'Project deleted successfully', data: null });
});
