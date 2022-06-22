const express = require("express");
const isAuth = require("../middlewares/is-auth");
const generateSequence = require("../utils/generate-sequence");
const money = require("mm-money");
const Sale = require("../models/Sale");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");

const router = express.Router();

router
  .route("/")
  .post(isAuth, async (req, res) => {
    try {
      const { items, paymentmethod } = req.body;

      const invoiceid = await generateSequence("invoiceid");
      const invoice = new Invoice({
        invoiceid,
        subtotal: 0,
        total: 0,
        createdby: req.tokenData.id,
        paymentmethod,
      });
      await invoice.save();

      for (const item of items) {
        const product = await Product.findById(item.product);
        const subtotal = product.price * item.qty;
        invoice.subtotal += subtotal;

        const sale = new Sale({
          invoice: invoice._id,
          product: item.product,
          price: product.price,
          qty: item.qty,
          amount: subtotal,
          createdby: req.tokenData.id,
        });
        sale.save();
      }
      invoice.total = invoice.subtotal;
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
      const { search, page, perpage } = req.query;

      const query = {
        status: 1,
        createdby: req.tokenData.id,
      };

      if (search) {
        query["$text"] = {
          $search: search,
        };
      }

      const offset = (parseInt(page) - 1) * parseInt(perpage);

      const data = await Invoice.find(query)
        .sort({ createdAt: "desc" })
        .skip(offset)
        .limit(perpage);

      const total = await Invoice.find(query).countDocuments();

      res.json({
        code: 200,
        message: "Invoices fetched successfully",
        data,
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

router.route("/:id").get(isAuth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

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
