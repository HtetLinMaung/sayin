const express = require("express");
const mongoose = require("mongoose");
const isAuth = require("../middlewares/is-auth");
const Invoice = require("../models/Invoice");
const Sale = require("../models/Sale");
const money = require("mm-money");
const Product = require("../models/Product");
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const generateSequence = require("../utils/generate-sequence");
const router = express.Router();
const moment = require("moment");

router.get("/export", async (req, res) => {
  try {
    const { search, token, invoiceid, sort, fromdate, todate } = req.query;

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    if (!decodedToken) {
      return res.status(401).json({
        code: 401,
        message: "Not authenticated!",
      });
    }

    const query = {
      status: 1,
      createdby: new mongoose.Types.ObjectId(decodedToken.id),
    };

    if (search) {
      query["$or"] = [];
      const products = await Product.find(
        {
          status: 1,
          $text: {
            $search: search,
          },
          createdby: new mongoose.Types.ObjectId(decodedToken.id),
        },
        { _id: 1 }
      );
      if (products.length) {
        query["$or"].push({
          product: {
            $in: products.map(
              (product) => new mongoose.Types.ObjectId(product._id)
            ),
          },
        });
      }

      const invoices = await Invoice.find(
        {
          status: 1,
          $text: {
            $search: search,
          },
          createdby: new mongoose.Types.ObjectId(decodedToken.id),
        },
        { _id: 1 }
      );
      if (invoices.length) {
        query["$or"].push({
          invoice: {
            $in: invoices.map(
              (invoice) => new mongoose.Types.ObjectId(invoice._id)
            ),
          },
        });
      }

      if (!query["$or"].length) {
        delete query["$or"];
      }
    }

    if (invoiceid) {
      const invoice = await Invoice.findOne({
        invoiceid,
        status: 1,
        createdby: new mongoose.Types.ObjectId(decodedToken.id),
      });
      query["invoice"] = null;
      if (invoice) {
        query["invoice"] = new mongoose.Types.ObjectId(invoice._id);
      }
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

    const sales = await Sale.find(query)
      .sort(sortArg)
      .populate(["createdby", "invoice", "product"]);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sale");
    ws.addRows([
      [
        "Product Code",
        "Product Name",
        "Qty",
        "Price",
        "Subtotal",
        "Invoice ID",
        "Time",
        "Creater",
      ],
      ...sales.map((s) => [
        s.product.code,
        s.product.name,
        s.qty,
        s.price,
        s.amount,
        s.invoice.invoiceid,
        s.createdAt,
        s.createdby.name,
      ]),
    ]);
    const folderPath = path.join(__dirname, "..", "excels", decodedToken.id);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    const filePath = path.join(
      folderPath,
      `sales_${new Date().toISOString()}.xlsx`
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
      `sale_${new Date().toISOString()}.xlsx`
    );
    fs.writeFileSync(filePath, buffer);

    const invoiceid = await generateSequence("invoiceid");
    const invoice = new Invoice({
      invoiceid,
      createdby: req.tokenData.id,
      subtotal: 0,
      total: 0,
    });
    await invoice.save();

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const sheet = wb.getWorksheet(1);
    let count = 0;
    for (let i = 1; i < sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      if (!row.getCell(1).value && !row.getCell(2).value) {
        break;
      }

      const product = await Product.findOneAndUpdate(
        {
          code: row.getCell(1).value,
          status: 1,
          instock: { $gte: item.quantity },
        },
        {
          $inc: {
            instock: -row.getCell(2).value,
          },
        }
      );
      if (product) {
        const price =
          product.price - product.price * (product.discountpercent / 100);
        const subtotal = row.getCell(2).value * price;
        invoice.subtotal += subtotal;

        const sale = new Sale({
          product: product._id,
          qty: row.getCell(2).value,
          price,
          amount: subtotal,
          createdby: req.tokenData.id,
          invoice: invoice._id,
        });

        try {
          await sale.save();
          count++;
        } catch (err) {
          console.log(err);
        }
      }
    }
    invoice.total = money.default.parseNumber(
      money.default.sum([invoice.subtotal, invoice.tax, `-${invoice.discount}`])
    );
    await invoice.save();
    res.json({
      code: 200,
      message: `${count} item${count > 1 ? "s" : ""} imported successfully`,
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

router.route("/").get(isAuth, async (req, res) => {
  try {
    const { search, page, perpage, invoiceid, fromdate, todate, sort } =
      req.query;

    const query = {
      status: 1,
      createdby: new mongoose.Types.ObjectId(req.tokenData.id),
    };

    if (search) {
      query["$or"] = [];
      const products = await Product.find(
        {
          status: 1,
          $text: {
            $search: search,
          },
          createdby: new mongoose.Types.ObjectId(req.tokenData.id),
        },
        { _id: 1 }
      );
      if (products.length) {
        query["$or"].push({
          product: {
            $in: products.map(
              (product) => new mongoose.Types.ObjectId(product._id)
            ),
          },
        });
      }

      const invoices = await Invoice.find(
        {
          status: 1,
          $text: {
            $search: search,
          },
          createdby: new mongoose.Types.ObjectId(req.tokenData.id),
        },
        { _id: 1 }
      );
      if (invoices.length) {
        query["$or"].push({
          invoice: {
            $in: invoices.map(
              (invoice) => new mongoose.Types.ObjectId(invoice._id)
            ),
          },
        });
      }

      if (!query["$or"].length) {
        delete query["$or"];
      }
    }

    if (invoiceid) {
      const invoice = await Invoice.findOne({
        invoiceid,
        status: 1,
        createdby: new mongoose.Types.ObjectId(req.tokenData.id),
      });
      query["invoice"] = null;
      if (invoice) {
        query["invoice"] = new mongoose.Types.ObjectId(invoice._id);
      }
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

    const data = await Sale.find(query)
      .sort(sortArg)
      .skip(offset)
      .limit(perpage)
      .populate(["product", "invoice"]);

    const total = await Sale.find(query).countDocuments();
    const aggregate = await Sale.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: null,
          totalqty: { $sum: "$qty" },
          totalamount: { $sum: "$amount" },
        },
      },
    ]);

    res.json({
      code: 200,
      message: "Sales fetched successfully",
      data: data.map((d) => ({
        ...d._doc,
        productname: d.product.name,
        productcode: d.product.code,
        invoiceid: d.invoice.invoiceid,
        price: money.default.format(d.price),
        amount: money.default.format(d.amount),
      })),
      total,
      page: parseInt(page),
      perpage: parseInt(perpage),
      pagecount: Math.ceil(total / perpage),
      totalqty: aggregate.length ? aggregate[0].totalqty : 0,
      totalamount: aggregate.length
        ? money.default.format(aggregate[0].totalamount)
        : "0.00",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      code: 500,
      message: err.message,
    });
  }
});

module.exports = router;
