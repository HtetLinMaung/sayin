const express = require("express");
const isAuth = require("../middlewares/is-auth");
const generateSequence = require("../utils/generate-sequence");
const money = require("mm-money");
const Sale = require("../models/Sale");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const jwt = require("jsonwebtoken");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const mongoose = require("mongoose");

const router = express.Router();

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

    const invoices = await Invoice.find(query)
      .sort(sortArg)
      .populate("createdby");

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Invoice");
    ws.addRows([
      [
        "Invoice ID",
        "Discount",
        "Tax",
        "Subtotal",
        "Nett",
        "Payment Method",
        "Time",
        "Creater",
      ],
      ...invoices.map((i) => [
        i.invoiceid,
        i.discount,
        i.tax,
        i.subtotal,
        i.total,
        i.paymentmethod,
        i.createdAt,
        i.createdby.name,
      ]),
    ]);
    const folderPath = path.join(__dirname, "..", "excels", decodedToken.id);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    const filePath = path.join(
      folderPath,
      `invoices_${new Date().toISOString()}.xlsx`
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
  .route("/")
  .post(isAuth, async (req, res) => {
    try {
      const { items, paymentmethod, tax, discount } = req.body;

      const invoiceid = await generateSequence("invoiceid");
      const invoice = new Invoice({
        invoiceid,
        subtotal: 0,
        total: 0,
        createdby: req.tokenData.id,
        tax,
        discount,
        paymentmethod,
      });
      await invoice.save();

      for (const item of items) {
        const product = await Product.findOneAndUpdate(
          {
            _id: item.product,
            status: 1,
            instock: { $gte: item.qty },
          },
          {
            $inc: {
              instock: -item.qty,
            },
          }
        );
        if (product) {
          const price =
            product.price - product.price * (product.discountpercent / 100);
          const subtotal = price * item.qty;
          invoice.subtotal += subtotal;

          const sale = new Sale({
            invoice: invoice._id,
            product: item.product,
            price,
            qty: item.qty,
            amount: subtotal,
            createdby: req.tokenData.id,
          });
          sale.save();
        }
      }
      invoice.total = money.default.parseNumber(
        money.default.sum([
          invoice.subtotal,
          invoice.tax,
          `-${invoice.discount}`,
        ])
      );
      await invoice.save();

      res.status(201).json({
        code: 201,
        message: "Invoice created successfully",
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
        createdby: new mongoose.Types.ObjectId(req.tokenData.id),
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

      const data = await Invoice.find(query)
        .sort(sortArg)
        .skip(offset)
        .limit(perpage);

      const total = await Invoice.find(query).countDocuments();
      const aggregate = await Invoice.aggregate([
        {
          $match: query,
        },
        {
          $group: {
            _id: null,
            grandtotal: { $sum: "$total" },
          },
        },
      ]);

      res.json({
        code: 200,
        message: "Invoices fetched successfully",
        data,
        total,
        page: parseInt(page),
        perpage: parseInt(perpage),
        pagecount: Math.ceil(total / perpage),
        grandtotal: aggregate.length
          ? money.default.format(aggregate[0].grandtotal)
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

router.route("/:id").get(isAuth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      status: 1,
      createdby: req.tokenData.id,
    });

    if (!invoice) {
      return res.status(404).json({
        code: 404,
        message: "Invoice not found",
      });
    }

    res.json({
      code: 200,
      message: "Invoice fetched successfully",
      data: invoice,
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
