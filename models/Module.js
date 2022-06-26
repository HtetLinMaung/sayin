const { Schema, model } = require("mongoose");

const moduleSchema = new Schema(
  {
    name: {
      unique: true,
      type: String,
      required: true,
    },
    status: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("Module", moduleSchema);
