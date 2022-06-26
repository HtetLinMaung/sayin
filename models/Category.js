const { Schema, model } = require("mongoose");

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    status: {
      type: Number,
      default: 1,
    },
    createdby: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ "$**": "text" });

module.exports = model("Category", categorySchema);
