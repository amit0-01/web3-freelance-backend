const mongoose = require("mongoose");

const VirtualAccountSchema = new mongoose.Schema({
    address: { type: String, required: true, unique: true },
    privateKey: { type: String, required: true }
});

const VirtualAccount = mongoose.model("VirtualAccount", VirtualAccountSchema);

module.exports = VirtualAccount;
