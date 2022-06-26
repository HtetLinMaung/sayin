const Module = require("../models/Module");
const mongoose = require("mongoose");
const Role = require("../models/Role");
const User = require("../models/User");

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

exports.getUsersForBroadcast = async (createdby, permission, currentuser) => {
  const roles = await Role.find(
    {
      status: 1,
      $or: [
        {
          superadmin: false,
          "objectpermissions.user": createdby,
          "objectpermissions.permission": { $regex: permission },
        },
        {
          superadmin: true,
        },
      ],
    },
    { _id: 1 }
  );

  const users = await User.find(
    {
      _id: {
        $ne: currentuser,
      },
      status: 1,
      role: { $in: roles.map((r) => r._id) },
    },
    { _id: 1 }
  );
  return users.map((u) => u._id.toString());
};
