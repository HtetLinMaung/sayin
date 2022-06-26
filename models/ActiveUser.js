const { Schema, model } = require("mongoose");

const activeUserSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    socketid: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = model("ActiveUser", activeUserSchema);
