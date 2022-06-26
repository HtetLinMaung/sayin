const express = require("express");

const isAuth = require("../middlewares/is-auth");
const Category = require("../models/Category");
const {
  createHandler,
  getAllHandler,
  getByIdMiddleware,
  updateHandler,
  deleteHandler,
} = require("../utils/default-handlers");

const router = express.Router();

router
  .route("/")
  .post(
    isAuth,
    createHandler(Category, {
      moduleName: "Category",
      message: "Category created successfully",
    })
  )
  .get(
    isAuth,
    getAllHandler(Category, {
      moduleName: "Category",
      message: "Categories fetched successfully",
      populate: { path: "createdby", select: "name" },
    })
  );

const getCategoryById = getByIdMiddleware(Category, {
  moduleName: "Category",
  message: "Category not found",
});

router
  .route("/:id")
  .get(isAuth, getCategoryById, async (req, res) => {
    res.json({
      code: 200,
      message: "Category fetched successfully",
      data: req.data,
    });
  })
  .put(
    isAuth,
    getCategoryById,
    updateHandler({
      moduleName: "Category",
      message: "Category updated successfully",
    })
  )
  .delete(
    isAuth,
    getCategoryById,
    deleteHandler({
      moduleName: "Category",
      message: "Category deleted successfully",
    })
  );

module.exports = router;
