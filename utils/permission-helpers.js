const Module = require("../models/Module");
const mongoose = require("mongoose");

exports.isModuleAccessable = async (name, permission, req) => {
  const module = await Module.findOne({ name, status: 1 }, { _id: 1 });
  const mp = req.role.modulepermissions.find((p) => p.module == module._id);
  if (!mp || !mp.permission.includes(permission)) {
    return false;
  }
  return true;
};

exports.getAccessibleUsers = (permission, req) => {
  const users = req.role.objectpermissions
    .filter((p) => p.permission.includes(permission))
    .map((p) => p.user);
  users.push(req.tokenData.id);
  return users;
};

exports.getCreatedByCondition = (req) => ({
  $in: [
    ...req.role.objectpermissions
      .filter((p) => p.permission.includes("r"))
      .map((p) => new mongoose.Types.ObjectId(p.user)),
    new mongoose.Types.ObjectId(req.tokenData.id),
  ],
});
