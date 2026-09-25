const User = require("../models/User");

async function limitJudgeAccess(req, res, next) {
  try {
    if (!req.user || req.user.role !== "judge") return next();

    // Load assigned competition from DB to be source-of-truth
    const user = await User.findById(req.user.id).select("assignedCompetitionId role");
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const assignedId = user.assignedCompetitionId?.toString();
    if (!assignedId) return res.status(403).json({ message: "No competition assigned" });

    req.judgeAssignedCompetitionId = assignedId;

    // If route has :id representing competitionId, enforce equality
    // Applies to routes like /api/competitions/:id/... and similar
    if (req.params && req.params.id) {
      if (req.params.id !== assignedId) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    // For list routes: competitions -> only assigned competition
    // We annotate the request so controllers can filter
    if (req.method === "GET") {
      // For teams listing, force competitionId query
      // Note: In Express 5, req.query is read-only, so we use a custom property
      if (req.baseUrl?.includes("/api/teams")) {
        // Store modified query in a custom property that controllers can check
        req.filterQuery = { ...req.query, competitionId: assignedId };
        // Also store the competitionId separately for easy access
        req.queryCompetitionId = assignedId;
      }
      // For competitions listing, flag to filter to assigned only
      if (req.baseUrl?.includes("/api/competitions") && !req.params.id) {
        req.onlyCompetitionId = assignedId;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { limitJudgeAccess };

