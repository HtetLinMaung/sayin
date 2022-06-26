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
    tableheaders: [
      {
        module: {
          type: Schema.Types.ObjectId,
          ref: "Module",
          required: true,
        },
        headers: [
          {
            key: {
              type: String,
              required: true,
            },
            title: {
              type: String,
              required: true,
            },
          },
        ],
      },
    ],
    modulepermissions: [
      {
        module: {
          type: Schema.Types.ObjectId,
          ref: "Module",
          required: true,
        },
        permission: {
          type: String,
          default: "crud",
        },
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
