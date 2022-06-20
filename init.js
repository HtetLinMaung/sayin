const bcrypt = require("bcryptjs");
const fs = require("fs");

const User = require("./models/User");

const init = async () => {
  if (!fs.existsSync("public")) {
    fs.mkdirSync("public");
  }
  if (!fs.existsSync("excels")) {
    fs.mkdirSync("excels");
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
    });
    await user.save();
  }
};

module.exports = init;
