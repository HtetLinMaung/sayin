const express = require("express");
const isAuth = require("../middlewares/is-auth");
const Role = require("../models/Role");
const {
  getAllHandler,
  createHandler,
  getByIdMiddleware,
  updateHandler,
  deleteHandler,
} = require("../utils/default-handlers");

const router = express.Router();

router
  .route("/")
  .post(
    isAuth,
    createHandler(Role, {
      moduleName: "Role",
      message: "Role created successfully",
    })
  )
  .get(
    isAuth,
    getAllHandler(Role, {
      moduleName: "Role",
      message: "Roles fetched successfully",
      populate: { path: "createdby", select: "name" },
    })
  );

const getRoleById = getByIdMiddleware(Role, {
  moduleName: "Role",
  message: "Role not found",
});

router
  .route("/:id")
  .get(isAuth, getRoleById, async (req, res) => {
    res.json({
      code: 200,
      message: "Role fetched successfully",
      data: req.data,
    });
  })
  .put(
    isAuth,
    getRoleById,
    updateHandler({
      moduleName: "Role",
      message: "Role updated successfully",
    })
  )
  .delete(
    isAuth,
    getRoleById,
    deleteHandler({
      moduleName: "Role",
      message: "Role deleted successfully",
    })
  );

module.exports = router;
