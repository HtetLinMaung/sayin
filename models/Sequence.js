const { Schema, model } = require("mongoose");

const sequenceSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
    },
    start: {
      type: Number,
      default: 1,
    },
    n: {
      type: Number,
      default: 1,
    },
    prefixchar: {
      type: String,
      default: "0",
    },
    minlength: {
      type: Number,
      default: 1,
    },
    format: {
      type: String,
      default: "{n}",
    },
    step: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = model("Sequence", sequenceSchema);
