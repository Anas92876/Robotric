const Session = require('../models/Session');

async function find(filter = {}, options = {}) {
  let q = Session.find(filter);
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
  let q = Session.findOne(filter);
  if (options.populate) {
    const pops = Array.isArray(options.populate) ? options.populate : [options.populate];
    pops.forEach(p => {
      q = q.populate(p);
    });
  }
  return q;
}

async function findById(id, options = {}) {
  let q = Session.findById(id);
  if (options.populate) {
    const pops = Array.isArray(options.populate) ? options.populate : [options.populate];
    pops.forEach(p => {
      q = q.populate(p);
    });
  }
  return q;
}

async function create(data) {
  return Session.create(data);
}

async function save(doc) {
  return doc.save();
}

async function deleteById(id) {
  return Session.findByIdAndDelete(id);
}

async function countDocuments(filter = {}) {
  return Session.countDocuments(filter);
}

module.exports = {
  find,
  findOne,
  findById,
  create,
  save,
  deleteById,
  countDocuments
};
