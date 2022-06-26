const bcrypt = require("bcryptjs");
const fs = require("fs");
const Module = require("./models/Module");
const Role = require("./models/Role");
const Sequence = require("./models/Sequence");

const User = require("./models/User");

const init = async () => {
  if (!fs.existsSync("public")) {
    fs.mkdirSync("public");
  }
  if (!fs.existsSync("excels")) {
    fs.mkdirSync("excels");
  }
  const modules = ["Invoice", "Product", "Role", "Sale", "User"];
  for (const name of modules) {
    let module = await Module.findOne({
      name,
      status: 1,
    });
    if (!module) {
      module = new Module({
        name,
      });
      await module.save();
    }
  }

  let role = await Role.findOne({
    name: "Super Admin",
    status: 1,
    superadmin: true,
  });
  if (!role) {
    role = new Role({
      name: "Super Admin",
      superadmin: true,
      objectpermissions: [],
      modulepermissions: [],
    });
    await role.save();
  }
  let user = await User.findOne({
    userid: "admin@gmail.com",
    status: 1,
  });

  if (!user) {
    user = new User({
      name: "Admin",
      userid: "admin@gmail.com",
      password: bcrypt.hashSync("User@123", 12),
      role: role._id,
    });
  }
  user.role = role._id;
  await user.save();

  let sequence = await Sequence.findOne({
    key: "invoiceid",
  });
  if (!sequence) {
    sequence = new Sequence({
      key: "invoiceid",
      minlength: 9,
    });
    await sequence.save();
  }
};

module.exports = init;
