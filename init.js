const bcrypt = require("bcryptjs");
const fs = require("fs");
const ActiveUser = require("./models/ActiveUser");
// const Category = require("./models/Category");
const Module = require("./models/Module");
// const Product = require("./models/Product");
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

  // const categories = await Category.find({ status: 1 });
  // for (const category of categories) {
  //   const productIds = [];
  //   for (const productId of category.products) {
  //     const product = await Product.findById(productId);
  //     if (product && product.status) {
  //       productIds.push(productId);
  //     }
  //   }
  //   category.products = productIds;
  //   await category.save();
  // }

  await ActiveUser.deleteMany();

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
