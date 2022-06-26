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
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Role",
    },
    createdby: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

userSchema.index({ "$**": "text" });

module.exports = model("User", userSchema);
