const express = require("express");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const moment = require("moment");

const isAuth = require("../middlewares/is-auth");
const Product = require("../models/Product");
const ProductHistory = require("../models/ProductHistory");
const router = express.Router();

router
  .route("/")
  .post(isAuth, async (req, res) => {
    try {
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
  .get(isAuth, async (req, res) => {
    try {
      const { search, page, perpage, fromdate, todate, sort } = req.query;

      const query = {
        status: 1,
        createdby: req.tokenData.id,
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

      const offset = (parseInt(page) - 1) * parseInt(perpage);

      const products = await Product.find(query)
        .sort(sortArg)
        .skip(offset)
        .limit(perpage);

      const total = await Product.find(query).countDocuments();

      res.json({
        code: 200,
        message: "Products fetched successfully",
        data: products,
        total,
        page: parseInt(page),
        perpage: parseInt(perpage),
        pagecount: Math.ceil(total / perpage),
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        code: 500,
        message: err.message,
      });
    }
  });

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

router
  .route("/:id")
  .get(isAuth, async (req, res) => {
    try {
      const product = await Product.findOne({
        status: 1,
        _id: req.params.id,
      });

      if (!product) {
        res.json({
          code: 404,
          message: "Product not found",
        });
      }

      if (product.createdby != req.tokenData.id) {
        res.json({
          code: 401,
          message: "Not authorized",
        });
      }

      res.json({
        code: 200,
        message: "Product fetched successfully",
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
  .put(isAuth, async (req, res) => {
    try {
      const product = await Product.findOne({
        status: 1,
        _id: req.params.id,
      });

      if (!product) {
        res.json({
          code: 404,
          message: "Product not found",
        });
      }

      if (product.createdby != req.tokenData.id) {
        res.json({
          code: 401,
          message: "Not authorized",
        });
      }

      if (product.code != req.body.code) {
        const productExists = await Product.findOne({
          code: req.body.code,
          status: 1,
          createdby: req.tokenData.id,
        });
        if (productExists) {
          return res.status(409).json({
            code: 409,
            message: "Product's code already exists",
          });
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
      product.set(req.body);
      await product.save();

      const productHistory = new ProductHistory({
        ...req.body,
        updatedby: req.tokenData.id,
      });
      productHistory.save();

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
  .delete(isAuth, async (req, res) => {
    try {
      const product = await Product.findOne({
        status: 1,
        _id: req.params.id,
      });

      if (!product) {
        res.json({
          code: 404,
          message: "Product not found",
        });
      }

      if (product.createdby != req.tokenData.id) {
        res.json({
          code: 401,
          message: "Not authorized",
        });
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
