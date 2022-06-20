const { Schema, model } = require("mongoose");

const voucherSchema = new Schema(
  {
    voucherno: {
      type: String,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    customername: {
      type: String,
      default: "",
    },
    remark: {
      type: String,
      default: "",
    },
    createdby: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    status: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = model("Voucher", voucherSchema);
