const Group = require('../models/Group');

async function find(filter = {}, options = {}) {
  let q = Group.find(filter);
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
  let q = Group.findOne(filter);
  if (options.populate) {
    const pops = Array.isArray(options.populate) ? options.populate : [options.populate];
    pops.forEach(p => {
      q = q.populate(p);
    });
  }
  return q;
}

async function findById(id, options = {}) {
  let q = Group.findById(id);
  if (options.populate) {
    const pops = Array.isArray(options.populate) ? options.populate : [options.populate];
    pops.forEach(p => {
      q = q.populate(p);
    });
  }
  return q;
}

async function create(data) {
  return Group.create(data);
}

async function save(doc) {
  return doc.save();
}

async function deleteById(id) {
  return Group.findByIdAndDelete(id);
}

async function countDocuments(filter = {}) {
  return Group.countDocuments(filter);
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
