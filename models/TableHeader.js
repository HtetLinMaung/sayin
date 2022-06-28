const { Schema, model } = require("mongoose");

const tableHeaderSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    status: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

module.exports = model("TableHeader", tableHeaderSchema);
