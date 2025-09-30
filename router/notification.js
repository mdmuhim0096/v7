// routes/notifications.js
const express = require('express');
const router = express.Router();
const Notification = require('../model/notification');
const Counter = require("../model/counter");
const { createNotification } = require("../middleware/notification")

router.get('/get_noti/:receiverId', async (req, res) => {
    try {
        const notifications = await Notification.find({ receiverId: req.params.receiverId })
            .populate("postId").populate("senderId", "name image _id");
        res.status(200).json(notifications);
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err.message });
    }
});

router.put('/read_noti/:id', async (req, res) => {
    try {
        const updated = await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.delete('/clear_noti/:receiverId', async (req, res) => {
    try {
        await Notification.deleteMany({ receiverId: req.params.receiverId });
        res.status(200).json({ message: 'Notifications cleared' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/noti_number/:userId", async (req, res) => {
    try {
        const mynumber = await Counter.find({ countWoner: req.params.userId, _type: "notifications" });
        res.status(200).json({ message: "here is your number", mynumber });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "internal server error!" })
    }
})

router.get("/noti_number_/:userId", async (req, res) => {
    try {
        const mynumber = await Counter.find({ countWoner: req.params.userId, _type: "post" });
        res.status(200).json({ message: "here is your number", mynumber });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "internal server error!" })
    }
})

router.get("/noti_number__/:userId", async (req, res) => {
    try {
        const mynumber = await Counter.find({ countWoner: req.params.userId, _type: { $in: ["like", "love", "care", "haha", "sad", "angry", "wow"] } });
        res.status(200).json({ message: "here is your number", mynumber });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "internal server error!" })
    }
});

router.get("/_noti_number__/:userId", async (req, res) => {
    try {
        const mynumber = await Counter.find({ countWoner: req.params.userId, _type: { $in: ["cLike", "cLove", "cCare", "cHaha", "cWow", "cSad", "cAngry"] } });
        res.status(200).json({ message: "here is your number", mynumber });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "internal server error!" })
    }
})

router.post("/delete", async (req, res) => {
    try {
        const { id } = req.body;
        await Notification.findByIdAndDelete(id);
        res.status(200).json({ message: "deleted successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "internal server error!" })
    }
})

router.post("/likeAlert", async (req, res) => {
    try {
        const { receiverId, senderId, postId, reactType } = req.body;
        await createNotification(receiverId, senderId, reactType, postId);
        res.status(201).json({ message: "notification created" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "internal server error" });
    }
})

router.post("/commentLikeAlert", async (req, res) => {
    try {
        const { receiverId, senderId, postId, commentId, text, reactType } = req.body;
        await createNotification([receiverId], senderId, reactType, postId, commentId, null, text);
        res.status(201).json({ message: "notification created" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "internal server error" });
    }
})


module.exports = router;
