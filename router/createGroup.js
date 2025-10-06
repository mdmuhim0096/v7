const Group = require("../model/createGroup");
const route = require("express").Router();
const multer = require("multer");
const People = require("../model/people");
const { default: mongoose } = require("mongoose");
const Cloudinary = require("../databas/cloudinary");
const streamifier = require("streamifier");
const storage = multer.memoryStorage();
const upload = multer({ storage });


route.post("/create", async (req, res) => {
    try {
        const { groupName, myId, realTime, firstuser = [] } = req.body;
        const group = new Group({ name: groupName, admin: myId, createdAt: realTime });
        firstuser.forEach(id => {
            group.members.push({ userId: id });
        });
        const response = await group.save();
        const me = await People.findById(myId);
        me.groups.push(response.id);
        await me.save();
        res.status(201).json({ message: "group created", response })
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "server error" })
    }
});


// Helper: Upload buffer to Cloudinary
const uploadFromBuffer = (buffer, publicId) => {
    return new Promise((resolve, reject) => {
        const stream = Cloudinary.uploader.upload_stream(
            {
                folder: "groupImages",
                publicId,
                resource_type: "image",
            },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
};


route.post("/changeImage/:id", upload.single("img"), async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: "Group not found" });

        const publicId = `group_${req.params.id}_${Date.now()}`;

        // Upload to Cloudinary from buffer
        const result = await uploadFromBuffer(req.file.buffer, publicId);

        // If previous image is not the default, delete it
        if (group.groupImage && !group.groupImage.includes("group.png")) {
            const parts = group.groupImage.split("/");
            const lastPart = parts[parts.length - 1]; // e.g. group_abc_12345.jpg
            const oldPublicId = `groupImages/${lastPart.split(".")[0]}`;
            await Cloudinary.uploader.destroy(oldPublicId);
        }

        // Update group with new image URL
        const updatedGroup = await Group.findByIdAndUpdate(
            req.params.id,
            { groupImage: result.secure_url },
            { new: true }
        );

        res.status(200).json({ message: "Image changed", img: updatedGroup.groupImage });
    } catch (err) {
        console.error("Image upload error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


route.post("/changeName", async (req, res) => {
    try {
        const { groupId, groupName } = req.body;
        const response = await Group.findByIdAndUpdate(groupId, { name: groupName }, { new: true });
        res.status(200).json({ message: "name changed", name: response.name })
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "server error" })
    }
})

route.post("/addmember/:id", async (req, res) => {
    try {
        const { members } = req.body;
        const member = await People.findById(members);
        member.groups.push(req.params.id);
        const objmembers = new mongoose.Types.ObjectId(member.id);
        const ourGroup = await Group.findById(req.params.id);
        ourGroup.members.push({ userId: objmembers })
        await ourGroup.save();
        await member.save();
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "server error" })
    }
});

// Remove a member from a group AND remove the group from that user
route.post("/removemember/:id", async (req, res) => {
    try {
        const { userId } = req.body; // just send userId in body

        // 1. Pull the user from the group's members array
        const groupUpdate = await Group.findByIdAndUpdate(
            req.params.id,
            { $pull: { members: { userId: userId } } },
            { new: true }
        );

        // 2. Pull the group from the user's groups array
        const userUpdate = await People.findByIdAndUpdate(
            userId,
            { $pull: { groups: req.params.id } },
            { new: true }
        );

        res.status(200).json({
            message: "Member removed successfully",
            group: groupUpdate,
            user: userUpdate
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Server error" });
    }
});

route.get("/myGroup/:id", async (req, res) => {
    try {
        const groups = await People.findById(req.params.id).populate("groups");
        if (!groups) {
            return res.status(404).json({ messae: "group not found" });
        }
        res.status(200).json({ message: "here is your groups", groups });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "server error" })
    }
});

route.post("/changebg", async (req, res) => {
    try {
        const { bgColor, bgImage, bgType, group } = req.body;
        await Group.findByIdAndUpdate(group, { style: { background: { bgType, bgDesign: bgType == "color" ? bgColor : bgImage } } }, { new: true });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "server error" })
    }
});

route.post("/font", async (req, res) => {
    try {
        const { color, italic, bg, family, group, } = req.body;
        let styleObj = {};
        if (color) {
            styleObj["color"] = color;
        }
        if (bg) {
            styleObj["bg"] = bg;
        }
        if (italic) {
            styleObj["italic"] = italic;
        }
        if (family) {
            styleObj["family"] = family;
        }
        await Group.findByIdAndUpdate(group, { style: { text: styleObj } }, { new: true });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "server error" })
    }
});

route.get("/members/:id", async (req, res) => {
    try {
        const __group__ = await Group.findById(req.params.id).populate("members.userId", "_id name image")
        if (!__group__) {
            return res.status(404).json({ message: "group not found" })
        }
        const members = __group__.members;
        res.status(200).json({ message: "here is your group", members })
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "server error" })
    }
})

route.get("/deleteGroup", async (req, res) => {
    try {
        await Group.deleteMany();
        res.send("<h1>success ✨</h1>")
    } catch (error) {

    }
});

route.get("/isMatchGroup/:id/:uid", async (req, res) => {
    try {
        const user = await People.findById(req.params.uid);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Ensure `user.groups` exists and is an array
        const isMatch = user.groups?.some(
            (groupId) => groupId.toString() === req.params.id
        );

        console.log(isMatch, "isMatch");
        res.status(200).json({ isMatch });
    } catch (error) {
        console.error(error); // you had `err` which was undefined
        res.status(500).json({ message: "Server error" });
    }
});


route.post("/filteruser", async (req, res) => {
    try {
        const { admin, gid } = req.body;

        const group = await Group.findById(gid);
        const memberIds = group.members.map(member => member.userId?.toString()); // Ensure string comparison

        const user = await People.findById(admin).populate({
            path: "friends",
            select: "name image _id",
            match: { _id: { $nin: memberIds } } // $nin with string IDs
        });

        console.log(user)

        res.status(200).json({ message: "here is your friend", friends: user.friends });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


route.get("/:name", async (req, res) => {
    try {
        const { name } = req.params;

        const groups = await Group.find({
            name: { $regex: name, $options: "i" } // partial + case-insensitive
        }).select("name description groupImage members"); // return only needed fields

        res.json(groups);
    } catch (error) {
        console.error("Error fetching group:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = route;