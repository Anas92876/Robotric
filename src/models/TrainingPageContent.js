const mongoose = require('mongoose');

const ProgramImageSchema = new mongoose.Schema({
  url:      { type: String, required: true },
  publicId: { type: String, required: true },
}, { _id: false });

const ProgramSchema = new mongoose.Schema({
  title:         { type: String, default: '' },
  age:           { type: String, default: '' },
  description:   { type: String, default: '' },
  hours:         { type: String, default: '' },          // summer/winter total hours
  hoursPerLevel: { type: String, default: '' },          // yearRound hours per level
  levels:        { type: String, default: '' },
  available:     { type: Boolean, default: true },
  prerequisite:  { type: String, default: '' },
  certificate:   { type: Boolean, default: false },
  whatYouLearn:  { type: [String], default: [] },
  images:        { type: [ProgramImageSchema], default: [] },
}, { _id: false });

const FaqItemSchema = new mongoose.Schema({
  question: { type: String, default: '' },
  answer:   { type: String, default: '' },
}, { _id: false });

const DepartmentSchema = new mongoose.Schema({
  name:        { type: String, default: '' },
  tagline:     { type: String, default: '' },
  description: { type: String, default: '' },
  coverImage:  {
    url:       { type: String, default: '' },
    publicId:  { type: String, default: '' },
  },
  programs:    { type: [ProgramSchema], default: [] },
}, { _id: false });

const TrackBaseSchema = new mongoose.Schema({
  title:       { type: String, default: '' },
  subtitle:    { type: String, default: '' },
  description: { type: String, default: '' },
}, { _id: false });

const TrainingPageContentSchema = new mongoose.Schema({
  lang: { type: String, enum: ['ar', 'en'], unique: true, required: true },

  statsValues: {
    studentsTrained: { type: String, default: '2200+' },
    programTracks:   { type: String, default: '25+' },
    yearsExperience: { type: String, default: '6' },
    handsOnLearning: { type: String, default: '100%' },
  },

  tracks: {
    summer: {
      ...TrackBaseSchema.obj,
      programs: { type: [ProgramSchema], default: [] },
    },
    winter: {
      ...TrackBaseSchema.obj,
      programs: { type: [ProgramSchema], default: [] },
    },
    yearRound: {
      ...TrackBaseSchema.obj,
      faq:         { type: [FaqItemSchema], default: [] },
      departments: { type: [DepartmentSchema], default: [] },
    },
    competitions: {
      ...TrackBaseSchema.obj,
      programs: { type: [ProgramSchema], default: [] },
    },
  },
}, {
  timestamps: true,
  collection: 'trainingpagecontent',
});

module.exports = mongoose.model('TrainingPageContent', TrainingPageContentSchema);
