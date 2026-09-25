const SessionEvaluation = require('../models/SessionEvaluation');

async function find(filter = {}, options = {}) {
  let q = SessionEvaluation.find(filter);
  if (options.sort)  q = q.sort(options.sort);
  if (options.limit) q = q.limit(options.limit);
  return q;
}

async function findOne(filter = {}) {
  return SessionEvaluation.findOne(filter);
}

async function findById(id) {
  return SessionEvaluation.findById(id);
}

async function create(data) {
  return SessionEvaluation.create(data);
}

async function save(doc) {
  return doc.save();
}

async function deleteById(id) {
  return SessionEvaluation.findByIdAndDelete(id);
}

async function deleteMany(filter = {}) {
  return SessionEvaluation.deleteMany(filter);
}

async function countDocuments(filter = {}) {
  return SessionEvaluation.countDocuments(filter);
}

module.exports = {
  find,
  findOne,
  findById,
  create,
  save,
  deleteById,
  deleteMany,
  countDocuments
};
