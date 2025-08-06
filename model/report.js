const mongoose = require("mongoose");

const Report = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Post"
    },
    reportType: {
        type: String,
        required: true,
        enum: ["Spam", "Harassment or bullying", "Hate speech", "Nudity or sexual activity", "Violence or threats", "False information", "Scams or fraud", "Suicide or self-injury", "Child exploitation", "Terrorism", "Intellectual property", "Sale of illegal goods", "Other"]
    },
    date: {
        type: String,
        required: true
    }
});

const reportModel = mongoose.model("report", Report);
module.exports = reportModel;