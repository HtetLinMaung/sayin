const { Schema, model } = require("mongoose");

const productSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    instock: {
      type: Number,
      default: 0,
    },
    discountpercent: {
      type: Number,
      default: 0,
    },
    reorderlevel: {
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

productSchema.index({ "$**": "text" });

module.exports = model("Product", productSchema);
