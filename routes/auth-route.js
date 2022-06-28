const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { log } = require("../utils/logger");
const Role = require("../models/Role");
const isAuth = require("../middlewares/is-auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { userid, password } = req.body;

    const user = await User.findOne({
      userid,
      status: 1,
    });

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: "User not found",
      });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({
        code: 401,
        message: "Password incorrect",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.json({
      code: 200,
      message: "Login successful",
      data: {
        token,
        username: user.name,
        profile: user.profile,
      },
    });
  } catch (err) {
    log(err, "error");
    res.code(500).json({
      code: 500,
      message: err.message,
    });
  }
});

router.get("/module-permissions", isAuth, async (req, res) => {
  try {
    const role = await Role.findOne({
      _id: req.role._id,
      status: 1,
    }).populate([
      { path: "modulepermissions.module", select: "name -_id" },
      { path: "modulepermissions.tableheaders", select: "-_id key title" },
    ]);
    if (!role) {
      return res.status(401).json({
        code: 401,
        message: "Unauthorized",
      });
    }

    res.json({
      code: 200,
      message: "Module permissions fetched successfully",
      data: role.modulepermissions,
    });
  } catch (err) {
    log(err, "error");
    res.code(500).json({
      code: 500,
      message: err.message,
    });
  }
});

// router.post("/register", async (req, res) => {
//   try {
//     const { name, userid, password } = req.body;

//     const user = await User.findOne({
//       userid,
//       status: 1,
//     });

//     if (user) {
//       res.json({
//         code: 400,
//         message: "User already exists",
//       });
//     }

//     const newUser = new User({
//       name,
//       userid,
//       password: bcrypt.hashSync(password, 12),
//     });
//     await newUser.save();

//     res.json({
//       code: 200,
//       message: "User created successfully",
//       data: newUser,
//     });
//   } catch (err) {
//     console.log(err);
//     res.json({
//       code: 500,
//       message: err.message,
//     });
//   }
// });

module.exports = router;
