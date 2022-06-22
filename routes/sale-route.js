const express = require("express");
const isAuth = require("../middlewares/is-auth");
const Sale = require("../models/Sale");

const router = express.Router();

router.route("/").get(isAuth, async (req, res) => {
  try {
    const { search, page, perpage, invoice } = req.query;

    const query = {
      status: 1,
      createdby: req.tokenData.id,
    };

    if (search) {
      query["$text"] = {
        $search: search,
      };
    }

    if (invoice) {
      query["invoice"] = invoice;
    }

    const offset = (parseInt(page) - 1) * parseInt(perpage);

    const data = await Sale.find(query)
      .sort({ createdAt: "desc" })
      .skip(offset)
      .limit(perpage)
      .populate("product");

    const total = await Sale.find(query).countDocuments();

    res.json({
      code: 200,
      message: "Sales fetched successfully",
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

module.exports = router;
