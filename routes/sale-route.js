const express = require("express");
const mongoose = require("mongoose");
const isAuth = require("../middlewares/is-auth");
const Invoice = require("../models/Invoice");
const Sale = require("../models/Sale");
const money = require("mm-money");
const Product = require("../models/Product");

const router = express.Router();

router.route("/").get(isAuth, async (req, res) => {
  try {
    const { search, page, perpage, invoiceid } = req.query;

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

    const offset = (parseInt(page) - 1) * parseInt(perpage);

    const data = await Sale.find(query)
      .sort({ createdAt: "desc" })
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
