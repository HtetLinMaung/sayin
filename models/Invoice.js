const { Schema, model } = require("mongoose");

const invoiceSchema = new Schema(
  {
    invoiceid: {
      type: String,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
    paymentmethod: {
      type: String,
      default: "Cash",
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

module.exports = model("Invoice", invoiceSchema);
