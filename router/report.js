const route = require("express").Router();
const Report = require("../model/report");
const Post = require("../model/post");
const Notification = require("../model/notification");
const Counter = require("../model/counter");

route.post("/submit", async (req, res) => {
    try {
        const { postId, reportType, toSent, sender, date } = req.body;
        console.log(postId, reportType, toSent, sender, date)
        const newReport = new Report({ postId, reportType, date });
        const response = await newReport.save();
        const numberOfReport = (await Report.find({ postId })).length;
        const noti = new Notification({ receiverId: toSent, senderId: sender, type: "report", text: reportType, postId });
        const counter = new Counter({ countWoner: toSent, _type: "notifications" })
        await noti.save();
        await counter.save();
        if (numberOfReport > 2) {
            const noti = new Notification({ receiverId: toSent, senderId: sender, type: "report", text: reportType, postId, text: "we removed you post for many resone" });
            const counter = new Counter({ countWoner: toSent, _type: "notifications" })
            await noti.save();
            await counter.save();
            const isPost = await Post.findById(postId);
            if (!isPost) return res.status(404).json({ message: "post not found" });
            await Post.findByIdAndDelete(isPost.id);
        }
        res.status(200).json({ message: "report submited", response });
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: "server error" })
    }
});

module.exports = route;