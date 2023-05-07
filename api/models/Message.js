const mongoose = require("mongoose");

const MsgSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    file: String,
  },
  { timestamps: true }
);

const MsgModel = mongoose.model("Messages", MsgSchema);

module.exports = MsgModel;
