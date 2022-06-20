const { Schema, model } = require("mongoose");

const orderDetailSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Order",
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

module.exports = model("OrderDetail", orderDetailSchema);
