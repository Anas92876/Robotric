const Joi = require("joi");
const Team = require("../models/Team");
const asyncHandler = require("../utils/asyncHandler");
const { NotFoundError, ValidationError } = require("../utils/errors");
const logger = require("../utils/logger");

/**
 * List all teams (with optional filters)
 * GET /api/teams
 */
const listTeams = asyncHandler(async (req, res) => {
  const filter = {};
  // Check for competitionId from query or from limitJudgeAccess middleware (Express 5 compatibility)
  const competitionId = req.queryCompetitionId || req.query.competitionId;
  if (competitionId) filter.competitionId = competitionId;
  if (req.query.coachId) filter.coachId = req.query.coachId;

  logger.logDB('find', 'Team', { filter });

  const teams = await Team.find(filter).lean();

  logger.info(`Listed ${teams.length} teams`);
  res.json(teams);
});

const createSchema = Joi.object({
  competitionId: Joi.string().required(),
  name: Joi.string().required(),
  members: Joi.array().items(Joi.string()).default([]),
});

/**
 * Create a new team
 * POST /api/teams
 */
const createTeam = asyncHandler(async (req, res) => {
  const { error, value } = createSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('create', 'Team', { name: value.name, coachId: req.user.id });

  const team = await Team.create({ ...value, coachId: req.user.id });

  logger.info(`Created team: ${team.name} (${team._id}) by coach ${req.user.id}`);
  res.status(201).json(team);
});

const updateSchema = Joi.object({
  name: Joi.string(),
  members: Joi.array().items(Joi.string()),
});

/**
 * Get a single team by ID
 * GET /api/teams/:id
 */
const getTeamById = asyncHandler(async (req, res) => {
  logger.logDB('findById', 'Team', { id: req.params.id });

  const team = await Team.findById(req.params.id).lean();

  if (!team) {
    throw new NotFoundError('Team');
  }

  logger.info(`Retrieved team: ${team.name} (${team._id})`);
  res.json(team);
});

/**
 * Update a team
 * PUT /api/teams/:id
 */
const updateTeam = asyncHandler(async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('findOneAndUpdate', 'Team', { id: req.params.id, coachId: req.user.id });

  const team = await Team.findOneAndUpdate(
    { _id: req.params.id, coachId: req.user.id },
    { $set: value },
    { new: true, runValidators: true }
  );

  if (!team) {
    throw new NotFoundError('Team');
  }

  logger.info(`Updated team: ${team.name} (${team._id})`);
  res.json(team);
});

/**
 * Delete a team
 * DELETE /api/teams/:id
 */
const deleteTeam = asyncHandler(async (req, res) => {
  logger.logDB('deleteOne', 'Team', { id: req.params.id, coachId: req.user.id });

  const result = await Team.deleteOne({ _id: req.params.id, coachId: req.user.id });

  if (result.deletedCount === 0) {
    throw new NotFoundError('Team');
  }

  logger.info(`Deleted team ${req.params.id} by coach ${req.user.id}`);
  res.json({ success: true, message: 'Team deleted successfully' });
});

module.exports = { listTeams, getTeamById, createTeam, updateTeam, deleteTeam };
