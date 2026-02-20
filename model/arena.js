const mongoose = require("mongoose");

const ArenaSchema = new mongoose.Schema(
    {
        accountId: { type: String, required: true, unique: true },
        hype: { type: Number, default: 0 }
    },
    {
        collection: "arena"
    }
)

const model = mongoose.model('ArenaSchema', ArenaSchema);

module.exports = model;