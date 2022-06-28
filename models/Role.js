const { Schema, model } = require("mongoose");

const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    superadmin: {
      type: Boolean,
      default: false,
    },
    modulepermissions: [
      {
        module: {
          type: Schema.Types.ObjectId,
          ref: "Module",
          required: true,
          unique: true,
        },
        permission: {
          type: String,
          default: "crud",
        },
        tableheaders: [
          {
            type: Schema.Types.ObjectId,
            ref: "TableHeader",
          },
        ],
      },
    ],
    objectpermissions: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        permission: {
          type: String,
          default: "crud",
        },
      },
    ],
    status: {
      type: Number,
      default: 1,
    },
    createdby: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

roleSchema.index({ "$**": "text" });

module.exports = model("Role", roleSchema);
