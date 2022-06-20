const { Schema, model } = require("mongoose");

const saleHistorySchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Product",
    },
    price: {
      type: Number,
      required: true,
    },
    qty: {
      type: Number,
      default: 1,
    },
    amount: {
      type: Number,
      default: 0,
    },
    voucher: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Voucher",
    },
    status: {
      type: Number,
      default: 1,
    },
    updatedby: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = model("SaleHistory", saleHistorySchema);
