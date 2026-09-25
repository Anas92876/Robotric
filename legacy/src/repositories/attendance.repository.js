const Attendance = require('../models/Attendance');

async function find(filter = {}, options = {}) {
  let q = Attendance.find(filter);
  if (options.sort)  q = q.sort(options.sort);
  if (options.skip)  q = q.skip(options.skip);
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
  let q = Attendance.findOne(filter);
  if (options.populate) {
    const pops = Array.isArray(options.populate) ? options.populate : [options.populate];
    pops.forEach(p => {
      q = q.populate(p);
    });
  }
  return q;
}

async function findById(id, options = {}) {
  let q = Attendance.findById(id);
  if (options.populate) {
    const pops = Array.isArray(options.populate) ? options.populate : [options.populate];
    pops.forEach(p => {
      q = q.populate(p);
    });
  }
  return q;
}

async function create(data) {
  return Attendance.create(data);
}

async function save(doc) {
  return doc.save();
}

async function deleteById(id) {
  return Attendance.findByIdAndDelete(id);
}

async function deleteMany(filter = {}) {
  return Attendance.deleteMany(filter);
}

async function countDocuments(filter = {}) {
  return Attendance.countDocuments(filter);
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
