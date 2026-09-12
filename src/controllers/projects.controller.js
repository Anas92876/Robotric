const Joi = require("joi");
const Project = require("../models/Project");
const asyncHandler = require("../utils/asyncHandler");
const { NotFoundError, ValidationError } = require("../utils/errors");
const logger = require("../utils/logger");

/**
 * List all projects
 * GET /api/projects
 */
const listProjects = asyncHandler(async (req, res) => {
  const filter =
    req.user.role === "admin" || req.user.role === "superadmin"
      ? {}
      : { ownerId: req.user.id };

  logger.logDB('find', 'Project', { filter });

  const projects = await Project.find(filter).lean();

  logger.info(`Listed ${projects.length} projects for user ${req.user.id}`);
  res.json(projects);
});

const createSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow(""),
  parts: Joi.array()
    .items(
      Joi.object({
        partId: Joi.string().required(),
        qty: Joi.number().min(1).required(),
      })
    )
    .default([]),
});

/**
 * Create a new project
 * POST /api/projects
 */
const createProject = asyncHandler(async (req, res) => {
  const { error, value } = createSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('create', 'Project', { title: value.title, ownerId: req.user.id });

  const project = await Project.create({ ...value, ownerId: req.user.id });

  logger.info(`Created project: ${project.title} (${project._id}) by user ${req.user.id}`);
  res.status(201).json(project);
});

const updatePartsSchema = Joi.object({
  parts: Joi.array()
    .items(
      Joi.object({
        partId: Joi.string().required(),
        qty: Joi.number().min(1).required(),
      })
    )
    .required(),
});

const updateProjectSchema = Joi.object({
  title: Joi.string(),
  description: Joi.string().allow(""),
});

/**
 * Update project metadata
 * PUT /api/projects/:id
 */
const updateProject = asyncHandler(async (req, res) => {
  const { error, value } = updateProjectSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('findOneAndUpdate', 'Project', { id: req.params.id, ownerId: req.user.id });

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.id },
    value,
    { new: true, runValidators: true }
  );

  if (!project) {
    throw new NotFoundError('Project');
  }

  logger.info(`Updated project: ${project.title} (${project._id})`);
  res.json(project);
});

/**
 * Delete project
 * DELETE /api/projects/:id
 */
const deleteProject = asyncHandler(async (req, res) => {
  logger.logDB('findOneAndDelete', 'Project', { id: req.params.id, ownerId: req.user.id });

  const project = await Project.findOneAndDelete({
    _id: req.params.id,
    ownerId: req.user.id,
  });

  if (!project) {
    throw new NotFoundError('Project');
  }

  logger.info(`Deleted project: ${project.title} (${project._id})`);
  res.json({ success: true, message: 'Project deleted successfully' });
});

/**
 * Update project parts
 * PUT /api/projects/:id/parts
 */
const updateProjectParts = asyncHandler(async (req, res) => {
  const { error, value } = updatePartsSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('findOneAndUpdate', 'Project', { id: req.params.id, ownerId: req.user.id });

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user.id },
    { $set: { parts: value.parts } },
    { new: true, runValidators: true }
  );

  if (!project) {
    throw new NotFoundError('Project');
  }

  logger.info(`Updated project parts: ${project.title} (${project._id})`);
  res.json(project);
});

module.exports = { listProjects, createProject, updateProject, deleteProject, updateProjectParts };
