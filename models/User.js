const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    profile: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      required: true,
    },
    userid: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
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

module.exports = model("User", userSchema);
