const TaskSubmission = require('../models/TaskSubmission');

async function find(filter = {}, options = {}) {
  let q = TaskSubmission.find(filter);
  if (options.sort)  q = q.sort(options.sort);
  if (options.limit) q = q.limit(options.limit);
  if (options.populate) {
    const pops = Array.isArray(options.populate) ? options.populate : [options.populate];
    pops.forEach(p => {
      q = q.populate(p);
    });
  }
  return q;
}

async function findOne(filter = {}, options = {}) {
  let q = TaskSubmission.findOne(filter);
  if (options.populate) {
    const pops = Array.isArray(options.populate) ? options.populate : [options.populate];
    pops.forEach(p => {
      q = q.populate(p);
    });
  }
  return q;
}

async function findById(id, options = {}) {
  let q = TaskSubmission.findById(id);
  if (options.populate) {
    const pops = Array.isArray(options.populate) ? options.populate : [options.populate];
    pops.forEach(p => {
      q = q.populate(p);
    });
  }
  return q;
}

async function create(data) {
  return TaskSubmission.create(data);
}

async function save(doc) {
  return doc.save();
}

async function deleteById(id) {
  return TaskSubmission.findByIdAndDelete(id);
}

async function deleteMany(filter = {}) {
  return TaskSubmission.deleteMany(filter);
}

async function countDocuments(filter = {}) {
  return TaskSubmission.countDocuments(filter);
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
