const { Schema, model } = require("mongoose");

const saleSchema = new Schema(
  {
    invoice: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Invoice",
    },
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
    status: {
      type: Number,
      default: 1,
    },
    createdby: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = model("Sale", saleSchema);
