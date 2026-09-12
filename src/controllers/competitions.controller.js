const Joi = require("joi");
const Competition = require("../models/Competition");
const Team = require("../models/Team");
const Evaluation = require("../models/Evaluation");
const { Types } = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const { NotFoundError, ValidationError, BadRequestError } = require("../utils/errors");
const logger = require("../utils/logger");

/**
 * List all competitions
 * GET /api/competitions
 */
const listCompetitions = asyncHandler(async (req, res) => {
  // If judge-limited, only return the assigned competition
  const filter = {};
  if (req.user?.role === "judge" && req.onlyCompetitionId) {
    filter._id = req.onlyCompetitionId;
  }

  logger.logDB('find', 'Competition', { filter });

  const comps = await Competition.find(filter).lean();

  logger.info(`Listed ${comps.length} competitions`);
  res.json(comps);
});

const createCompetitionSchema = Joi.object({
  title: Joi.string().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  description: Joi.string().allow(""),
  maxTeams: Joi.number().min(0).default(0),
});

/**
 * Create a new competition
 * POST /api/competitions
 */
const createCompetition = asyncHandler(async (req, res) => {
  const { error, value } = createCompetitionSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('create', 'Competition', { title: value.title });

  const comp = await Competition.create(value);

  logger.info(`Created competition: ${comp.title} (${comp._id})`);
  res.status(201).json(comp);
});

/**
 * List teams for a competition
 * GET /api/competitions/:id/teams
 */
const listTeams = asyncHandler(async (req, res) => {
  logger.logDB('find', 'Team', { competitionId: req.params.id });

  const teams = await Team.find({ competitionId: req.params.id }).lean();

  logger.info(`Listed ${teams.length} teams for competition ${req.params.id}`);
  res.json(teams);
});

const createTeamSchema = Joi.object({
  name: Joi.string().required(),
  members: Joi.array().items(Joi.string()).default([]),
});

/**
 * Create a team in a competition
 * POST /api/competitions/:id/teams
 */
const createTeam = asyncHandler(async (req, res) => {
  const { error, value } = createTeamSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('findById', 'Competition', { id: req.params.id });

  const comp = await Competition.findById(req.params.id);

  if (!comp) {
    throw new NotFoundError('Competition');
  }

  const count = await Team.countDocuments({ competitionId: req.params.id });

  if (comp.maxTeams && count >= comp.maxTeams) {
    throw new BadRequestError('Max teams reached for this competition', 'MAX_TEAMS_REACHED');
  }

  logger.logDB('create', 'Team', { name: value.name, competitionId: req.params.id });

  const team = await Team.create({
    competitionId: req.params.id,
    name: value.name,
    members: value.members,
    coachId: req.user.id,
  });

  logger.info(`Created team ${team.name} (${team._id}) for competition ${comp.title}`);
  res.status(201).json(team);
});

const createEvaluationSchema = Joi.object({
  teamId: Joi.string().required(),
  scores: Joi.object().default({}),
  comments: Joi.string().allow(""),
});

/**
 * Create an evaluation for a team
 * POST /api/competitions/:id/evaluations
 */
const createEvaluation = asyncHandler(async (req, res) => {
  const { error, value } = createEvaluationSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  const total = Object.values(value.scores).reduce(
    (a, b) => a + Number(b || 0),
    0
  );

  logger.logDB('create', 'Evaluation', {
    judgeId: req.user.id,
    competitionId: req.params.id,
    teamId: value.teamId
  });

  const evaln = await Evaluation.create({
    judgeId: req.user.id,
    competitionId: req.params.id,
    teamId: value.teamId,
    scores: value.scores,
    totalScore: total,
    comments: value.comments,
  });

  logger.info(`Created evaluation (${evaln._id}) by judge ${req.user.id} for team ${value.teamId}`);
  res.status(201).json(evaln);
});

const updateCompetitionSchema = Joi.object({
  title: Joi.string(),
  startDate: Joi.date(),
  endDate: Joi.date(),
  description: Joi.string().allow(""),
  maxTeams: Joi.number().min(0),
});

/**
 * Update a competition
 * PUT /api/competitions/:id
 */
const updateCompetition = asyncHandler(async (req, res) => {
  const { error, value } = updateCompetitionSchema.validate(req.body);

  if (error) {
    throw new ValidationError(error.message);
  }

  logger.logDB('findByIdAndUpdate', 'Competition', { id: req.params.id });

  const comp = await Competition.findByIdAndUpdate(req.params.id, value, {
    new: true,
    runValidators: true
  });

  if (!comp) {
    throw new NotFoundError('Competition');
  }

  logger.info(`Updated competition: ${comp.title} (${comp._id})`);
  res.json(comp);
});

/**
 * Delete a competition
 * DELETE /api/competitions/:id
 */
const deleteCompetition = asyncHandler(async (req, res) => {
  logger.logDB('findByIdAndDelete', 'Competition', { id: req.params.id });

  const comp = await Competition.findByIdAndDelete(req.params.id);

  if (!comp) {
    throw new NotFoundError('Competition');
  }

  // Also delete associated teams and evaluations
  await Promise.all([
    Team.deleteMany({ competitionId: req.params.id }),
    Evaluation.deleteMany({ competitionId: req.params.id })
  ]);

  logger.info(`Deleted competition: ${comp.title} (${comp._id})`);
  res.json({ success: true, message: 'Competition deleted successfully' });
});

/**
 * Get competition rankings
 * GET /api/competitions/:id/rankings
 */
const rankings = asyncHandler(async (req, res) => {
  logger.logDB('aggregate', 'Evaluation', { competitionId: req.params.id });

  // MVP: join evaluations with teams to return the team name
  const agg = await Evaluation.aggregate([
    { $match: { competitionId: new Types.ObjectId(req.params.id) } },
    { $group: { _id: "$teamId", total: { $sum: "$totalScore" } } },
    { $sort: { total: -1 } },
    // Lookup team names for UX clarity
    {
      $lookup: {
        from: "teams",
        localField: "_id",
        foreignField: "_id",
        as: "team",
      },
    },
    { $unwind: "$team" },
    {
      $project: {
        teamId: "$team._id",
        teamName: "$team.name",
        total: 1,
      },
    },
  ]);

  const ranks = agg.map((r, i) => ({
    teamId: r.teamId,
    teamName: r.teamName,
    total: r.total,
    rank: i + 1,
  }));

  logger.info(`Generated rankings for competition ${req.params.id}: ${ranks.length} teams`);
  res.json(ranks);
});

module.exports = {
  listCompetitions,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  listTeams,
  createTeam,
  createEvaluation,
  rankings,
};
