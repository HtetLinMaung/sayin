const express = require("express");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const isAuth = require("../middlewares/is-auth");
const User = require("../models/User");
const {
  isModuleAccessable,
  getCreatedByCondition,
  getAccessibleUsers,
} = require("../utils/permission-helpers");
const Role = require("../models/Role");
const {
  getAllHandler,
  getByIdMiddleware,
  deleteHandler,
} = require("../utils/default-handlers");

const router = express.Router();

router
  .route("/")
  .post(isAuth, async (req, res) => {
    try {
      let createdby = null;
      if (!req.role.superadmin) {
        createdby = getCreatedByCondition(req);
        let accessable = await isModuleAccessable("User", "c", req);
        if (!accessable) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }

        accessable = await isModuleAccessable("Role", "r", req);
        if (!accessable) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }

        accessable = await isModuleAccessable("User", "r", req);
        if (!accessable) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }
      }
      const { name, userid, password } = req.body;

      const query = {
        _id: req.body.role,
        status: 1,
      };
      if (createdby) {
        query["createdby"] = createdby;
      }
      const role = await Role.findOne(query);

      if (!role) {
        return res.status(400).json({
          code: 400,
          message: "Role not found",
        });
      }

      let user = await User.findOne({
        userid,
        status: 1,
      });

      if (user) {
        return res.status(400).json({
          code: 400,
          message: "User already exists",
        });
      }

      if (req.body.profile.startsWith("data:image")) {
        const base64Data = req.body.profile.split("base64,")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `${req.body.name}_${new Date().toISOString()}.png`;
        const filePath = path.join(__dirname, "..", "public", fileName);
        fs.writeFileSync(filePath, buffer);
        req.body.profile = `/${fileName}`;
      }

      user = new User({
        name,
        userid,
        password: bcrypt.hashSync(password, 12),
        role: role._id,
        profile: req.body.profile,
        createdby: req.tokenData.id,
      });
      await user.save();

      res.status(201).json({
        code: 201,
        message: "User created successfully",
        data: user,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        code: 500,
        message: err.message,
      });
    }
  })
  .get(
    isAuth,
    getAllHandler(User, {
      moduleName: "User",
      message: "Users fetched successfully",
      populate: { path: "createdby", select: "name" },
    })
  );

const getUserById = getByIdMiddleware(User, {
  moduleName: "User",
  message: "User not found",
});

router
  .route("/:id")
  .get(isAuth, getUserById, async (req, res) => {
    res.json({
      code: 200,
      message: "User fetched successfully",
      data: req.data,
    });
  })
  .put(isAuth, getUserById, async (req, res) => {
    try {
      const user = req.data;
      const { name, userid, password, profile } = req.body;
      let updatedby = null;
      if (!req.role.superadmin) {
        updatedby = getCreatedByCondition(req);
        let accessable = await isModuleAccessable("User", "u", req);
        if (
          !accessable ||
          !getAccessibleUsers("u", req).includes(req.data.createdby)
        ) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }

        accessable = await isModuleAccessable("Role", "r", req);
        if (!accessable) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }

        accessable = await isModuleAccessable("User", "r", req);
        if (!accessable) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }
      }
      const query = {
        _id: req.body.role,
        status: 1,
      };
      if (updatedby) {
        query["createdby"] = updatedby;
      }
      const role = await Role.findOne(query);

      if (!role) {
        return res.status(400).json({
          code: 400,
          message: "Role not found",
        });
      }

      if (req.body.profile.startsWith("data:image")) {
        const base64Data = req.body.profile.split("base64,")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `${req.body.name}_${new Date().toISOString()}.png`;
        const filePath = path.join(__dirname, "..", "public", fileName);
        fs.writeFileSync(filePath, buffer);
        req.body.profile = `/${fileName}`;
      }

      user.name = name;

      if (userid != user.userid) {
        let otherUser = await User.findOne({
          userid,
          status: 1,
        });

        if (otherUser) {
          return res.status(400).json({
            code: 400,
            message: "User already exists",
          });
        }
        user.userid = userid;
      }

      if (password != user.password) {
        user.password = bcrypt.hashSync(password, 12);
      }
      user.role = role._id;
      user.profile = profile;
      await user.save();

      res.json({
        code: 200,
        message: "User updated successfully",
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        code: 500,
        message: err.message,
      });
    }
  })
  .delete(
    isAuth,
    getUserById,
    deleteHandler({
      moduleName: "User",
      message: "User deleted successfully",
    })
  );

module.exports = router;
