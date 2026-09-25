const router = require("express").Router();
const Joi = require("joi");
const { protect, restrictTo } = require("../middleware/auth");
const User = require("../models/User");

const schema = Joi.object({ competitionId: Joi.string().allow(null, "") });

router.put(
  "/:id/assigned-competition",
  protect,
  restrictTo("superadmin"),
  async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
    const update = {
      assignedCompetitionId: value.competitionId || null,
    };
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).lean();
    if (!user) return res.status(404).json({ message: "Not found" });
    res.json({
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      assignedCompetitionId: user.assignedCompetitionId,
    });
  }
);

module.exports = router;

