const express = require("express");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const moment = require("moment");

const isAuth = require("../middlewares/is-auth");
const Product = require("../models/Product");
const ProductHistory = require("../models/ProductHistory");
const Category = require("../models/Category");
const {
  isModuleAccessable,
  getAccessibleUsers,
  getCreatedByCondition,
} = require("../utils/permission-helpers");
const {
  getAllHandler,
  getByIdMiddleware,
} = require("../utils/default-handlers");
const router = express.Router();

router
  .route("/")
  .post(isAuth, async (req, res) => {
    try {
      if (!req.role.superadmin) {
        let accessable = await isModuleAccessable("Product", "r", req);
        if (!accessable) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }

        accessable = await isModuleAccessable("Product", "c", req);
        if (!accessable) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }

        accessable = await isModuleAccessable("Category", "r", req);
        if (!accessable) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }

        accessable = await isModuleAccessable("Category", "u", req);
        if (!accessable) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }
      }

      let product = await Product.findOne({
        code: req.body.code,
        status: 1,
        createdby: req.tokenData.id,
      });

      if (product) {
        return res.status(409).json({
          code: 409,
          message: "Product's code already exists",
        });
      }

      if (req.body.image.startsWith("data:image")) {
        const base64Data = req.body.image.split("base64,")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `${req.body.code}_${new Date().toISOString()}.png`;
        const filePath = path.join(__dirname, "..", "public", fileName);
        fs.writeFileSync(filePath, buffer);
        req.body.image = `/${fileName}`;
      }

      product = new Product({
        ...req.body,
        createdby: req.tokenData.id,
      });
      await product.save();

      const productHistory = new ProductHistory({
        ...req.body,
        updatedby: req.tokenData.id,
      });
      productHistory.save();

      for (const categoryId of req.body.categories) {
        const category = await Category.findOne({
          _id: categoryId,
          status: 1,
        });
        category.products.push(product._id);
        await category.save();
      }

      res.status(201).json({
        code: 201,
        message: "Product created successfully",
        data: product,
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
    getAllHandler(Product, {
      moduleName: "Product",
      message: "Products fetched successfully",
      populate: { path: "createdby", select: "name" },
    })
  );

router.get("/export", async (req, res) => {
  try {
    const { search, token, fromdate, todate, sort } = req.query;

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodedToken) {
      return res.status(401).json({
        code: 401,
        message: "Not authenticated!",
      });
    }

    const query = {
      status: 1,
      createdby: decodedToken.id,
    };

    if (search) {
      query["$text"] = {
        $search: search,
      };
    }

    if (fromdate && !todate) {
      query["createdAt"] = {
        $gte: moment(fromdate).toDate(),
      };
    } else if (fromdate && todate) {
      query["createdAt"] = {
        $gte: moment(fromdate).toDate(),
        $lt: moment(todate).add(1, "days").toDate(),
      };
    } else if (todate && !fromdate) {
      query["createdAt"] = {
        $lt: moment(todate).add(1, "days").toDate(),
      };
    }

    const sortArg = {};
    if (sort) {
      for (const item of sort.split(",")) {
        const [key, value] = item.split(":");
        sortArg[key] = value;
      }
    }

    const products = await Product.find(query)
      .sort(sortArg)
      .populate("createdby");

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Product");
    ws.addRows([
      [
        "Code",
        "Name",
        "Price",
        "Description",
        "Image",
        "Discount Percentage",
        "In Stock",
        "Reorder Level",
        "Time",
        "Creater",
      ],
      ...products.map((p) => [
        p.code,
        p.name,
        p.price,
        p.description,
        p.image,
        p.discountpercent,
        p.instock,
        p.reorderlevel,
        p.createdAt,
        p.createdby.name,
      ]),
    ]);
    const folderPath = path.join(__dirname, "..", "excels", decodedToken.id);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    const filePath = path.join(
      folderPath,
      `products_${new Date().toISOString()}.xlsx`
    );
    await wb.xlsx.writeFile(filePath);
    res.download(filePath, (err) => {
      if (err) {
        console.log(err);
      }
      fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      code: 500,
      message: err.message,
    });
  }
});

const getProductById = getByIdMiddleware(Product, {
  moduleName: "Product",
  message: "Product not found",
});

router
  .route("/:id")
  .get(isAuth, getProductById, async (req, res) => {
    res.json({
      code: 200,
      message: "Product fetched successfully",
      data: req.data,
    });
  })
  .put(isAuth, getProductById, async (req, res) => {
    try {
      const product = req.data;
      let createdby = null;
      if (!req.role.superadmin) {
        createdby = getCreatedByCondition(req);
        let accessable = await isModuleAccessable("Product", "u", req);
        if (
          !accessable ||
          !getAccessibleUsers("u", req).includes(req.data.createdby)
        ) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }

        accessable = await isModuleAccessable("Category", "r", req);
        if (!accessable) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }

        accessable = await isModuleAccessable("Category", "u", req);
        if (!accessable) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }
      }

      let query = {
        code: req.body.code,
        status: 1,
      };
      if (product.code != req.body.code) {
        if (createdby) {
          query["createdby"] = createdby;
        }
        const productExists = await Product.findOne(query);
        if (productExists) {
          return res.status(409).json({
            code: 409,
            message: "Product's code already exists",
          });
        }
      }

      for (const categoryId of product.categories) {
        query = {
          _id: categoryId,
          status: 1,
        };
        if (createdby) {
          query["createdby"] = createdby;
        }
        const category = await Category.findOne(query);
        if (category) {
          category.products = category.products.filter(
            (id) => id != product._id
          );
          await category.save();
        }
      }

      if (req.body.image.startsWith("data:image")) {
        const base64Data = req.body.image.split("base64,")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `${req.body.code}_${new Date().toISOString()}.png`;
        const filePath = path.join(__dirname, "..", "public", fileName);
        fs.writeFileSync(filePath, buffer);
        req.body.image = `/${fileName}`;
      }

      const history = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (
          !["_id", "createdby", "createdAt", "updatedAt", "status"].includes(
            key
          )
        ) {
          product[key] = value;
          history[key] = value;
        }
      }
      await product.save();

      const productHistory = new ProductHistory({
        ...history,
        updatedby: req.tokenData.id,
      });
      productHistory.save();

      for (const categoryId of req.body.categories) {
        query = {
          _id: categoryId,
          status: 1,
        };
        if (createdby) {
          query["createdby"] = createdby;
        }
        const category = await Category.findOne(query);
        if (category) {
          category.products.push(product._id);
          await category.save();
        }
      }

      res.json({
        code: 200,
        message: "Product updated successfully",
        data: product,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        code: 500,
        message: err.message,
      });
    }
  })
  .delete(isAuth, getProductById, async (req, res) => {
    try {
      const product = req.data;
      if (!req.role.superadmin) {
        const accessable = await isModuleAccessable("Product", "d", req);
        if (
          !accessable ||
          !getAccessibleUsers("d", req).includes(req.data.createdby)
        ) {
          return res.status(403).json({
            code: 403,
            message: "You are not authorized to perform this action",
          });
        }
      }

      product.status = 0;
      await product.save();

      const productHistory = new ProductHistory({
        ...product._doc,
        updatedby: req.tokenData.id,
      });
      productHistory.save();

      res.json({
        code: 200,
        message: "Product deleted successfully",
        data: product,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        code: 500,
        message: err.message,
      });
    }
  });

router.post("/import", isAuth, async (req, res) => {
  try {
    const { dataurl } = req.body;
    const base64Data = dataurl.split("base64,")[1];

    const buffer = Buffer.from(base64Data, "base64");
    const folderPath = path.join(__dirname, "..", "excels", req.tokenData.id);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(`excels/${req.tokenData.id}`);
    }
    const filePath = path.join(
      folderPath,
      `product_${new Date().toISOString()}.xlsx`
    );
    fs.writeFileSync(filePath, buffer);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const sheet = wb.getWorksheet(1);
    let count = 0;
    for (let i = 1; i < sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      if (
        !row.getCell(1).value &&
        !row.getCell(2).value &&
        !row.getCell(3).value &&
        !row.getCell(4).value &&
        !row.getCell(5).value &&
        !row.getCell(6).value &&
        !row.getCell(7).value &&
        !row.getCell(8).value
      ) {
        break;
      }
      let product = await Product.findOne({
        status: 1,
        code: row.getCell(1).value,
        createdby: req.tokenData.id,
      });
      if (product) {
        product.name = row.getCell(2).value;
        product.price = parseFloat(row.getCell(3).value);
        product.description = row.getCell(4).value;
        product.image = row.getCell(5).value;
        product.discountpercent = parseFloat(row.getCell(6).value);
        product.instock = row.getCell(7).value;
        product.reorderlevel = row.getCell(8).value;
      } else {
        product = new Product({
          code: row.getCell(1).value,
          name: row.getCell(2).value,
          price: parseFloat(row.getCell(3).value),
          description: row.getCell(4).value,
          image: row.getCell(5).value,
          createdby: req.tokenData.id,
          discountpercent: parseFloat(row.getCell(6).value),
          instock: row.getCell(7).value,
          reorderlevel: row.getCell(8).value,
        });
      }

      const history = new ProductHistory({
        code: row.getCell(1).value,
        name: row.getCell(2).value,
        price: parseFloat(row.getCell(3).value),
        description: row.getCell(4).value,
        image: row.getCell(5).value,
        updatedby: req.tokenData.id,
        discountpercent: parseFloat(row.getCell(6).value),
        instock: row.getCell(7).value,
        reorderlevel: row.getCell(8).value,
      });
      try {
        await product.save();
        history.save();
        count++;
      } catch (err) {
        console.log(err);
      }
    }
    res.json({
      code: 200,
      message: `${count} product${count > 1 ? "s" : ""} imported successfully`,
    });
    fs.unlinkSync(filePath);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      code: 500,
      message: err.message,
    });
  }
});

module.exports = router;
