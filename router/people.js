const route = require("express").Router();
const People = require("../model/people");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const multer = require("multer");
const Chat = require("../model/chat");
const jwt_sicret = "15ef1fr5g4158dwo0k";
const mongoose = require("mongoose");
const Group = require("../model/createGroup");
const Cloudinary = require("../databas/cloudinary");
const streamifier = require("streamifier");

const storage = multer.memoryStorage();
const upload = multer({ storage });
route.post("/signup", upload.single("img"), async (req, res) => {
    try {
        const { name, pass, age, email, gender } = req.body;

        // ✅ Basic input validation
        if (!name || !pass || !email || !gender || !req.file) {
            return res.status(400).json({ message: "All fields are required including image" });
        }

        const checkData = await People.findOne({ email });
        if (checkData) return res.status(400).json({ message: "User already exists" });

        const file = req.file;

        // ✅ Upload image to Cloudinary
        const streamUpload = () =>
            new Promise((resolve, reject) => {
                const stream = Cloudinary.uploader.upload_stream(
                    {
                        resource_type: "image",
                        folder: "userImage",
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                streamifier.createReadStream(file.buffer).pipe(stream);
            });

        const result = await streamUpload();

        // ✅ Hash password
        const password = await bcrypt.hash(pass, 10);

        // ✅ Save user to DB
        const user = new People({
            name,
            password,
            age,
            gender,
            email,
            image: result.secure_url,
        });

        const response = await user.save();

        // ✅ Generate JWT
        const token = jwt.sign({ userId: user.id }, jwt_sicret, { expiresIn: "100d" });

        // ✅ Set secure cookie
        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 100 * 24 * 60 * 60 * 1000, // 100 days
            secure: true,
            sameSite: "none",
        });

        res.status(200).json({ message: "User created successfully", data: response });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Server error in user/signup" });
    }
});


route.get("/userData", async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const user = await People.findById(decode.userId).populate("friends", "name image _id");

        res.status(200).json({ message: "user finded successfully", data: user })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in user/userData" })
    }
});

route.get("/simpleInfo", async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const user = await People.findById(decode.userId).select("name image");
        res.status(200).json({ message: "user finded successfully", data: user })
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "server error in user/simpleInfo API" })
    }
});

route.get("/userStyle", async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const user = await People.findById(decode.userId).select("styles -_id");
        res.status(200).json({ message: "user finded successfully", data: user })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in user/userData" })
    }
});

route.post("/updateProfileName", async (req, res) => {
    try {
        const { name } = req.body;
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const user = await People.findByIdAndUpdate(decode.userId, { name }, { new: true });
        res.status(200).json({ message: "user update successfully", data: user })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in user/updateProfile" })
    }
});

route.post("/updateProfileEmail", async (req, res) => {
    try {
        const { email } = req.body;
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const user = await People.findByIdAndUpdate(decode.userId, { email }, { new: true });
        res.status(200).json({ message: "user update successfully", data: user })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in user/updateProfile" })
    }
});

route.post("/updateProfileAge", async (req, res) => {
    try {
        const { age } = req.body;
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const user = await People.findByIdAndUpdate(decode.userId, { age }, { new: true });
        res.status(200).json({ message: "user update successfully", data: user })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in user/updateProfile" })
    }
});

route.post("/updateProfileGender", async (req, res) => {
    try {
        const { gender } = req.body;
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const user = await People.findByIdAndUpdate(decode.userId, { gender }, { new: true });
        res.status(200).json({ message: "user update successfully", data: user })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in user/updateProfile" })
    }
});

route.post("/updateProfileMaritaStatus", async (req, res) => {
    try {
        const { maritalStatus } = req.body;
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const user = await People.findByIdAndUpdate(decode.userId, { maritalStatus }, { new: true });
        res.status(200).json({ message: "user update successfully", data: user })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in user/updateProfile" })
    }
});

route.post("/updateProfileImage", upload.single("img"), async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const user = await People.findById(decode.userId);

        // 🧠 Extract file
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // 🗑️ Delete previous Cloudinary image
        const getPublicId = (url) => {
            const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-z]+$/i);
            return match ? match[1] : null;
        };

        const imagePath = user.image;
        if (imagePath) {
            const publicId = getPublicId(imagePath);
            if (publicId) {
                await Cloudinary.uploader.destroy(publicId);
            }
        }

        // ⬆️ Upload new image to Cloudinary
        const streamUpload = () =>
            new Promise((resolve, reject) => {
                const stream = Cloudinary.uploader.upload_stream(
                    {
                        resource_type: "image",
                        folder: "userImage",
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                streamifier.createReadStream(file.buffer).pipe(stream);
            });

        const resultAsFile = await streamUpload();

        // 📦 Update DB
        const updatedUser = await People.findByIdAndUpdate(
            user.id,
            { image: resultAsFile.secure_url }, // Save only the image URL
            { new: true }
        );

        res.status(200).json({
            message: "User image updated successfully",
            image: updatedUser.image,
        });

    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: "Server error in /updateProfileImage" });
    }
});

route.post("/profileLike", async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await People.findById(userId);
        const uid = user.id;
        const like = user.like + 1;
        await People.findByIdAndUpdate(uid, { like }, { new: true });
        res.status(200).json({ message: "like done" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in user/profileLike" })
    }
});

route.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await People.findOne({ email });
        if (!user) return res.status(400).json({ message: "invalid email" });
        const userPassword = user.password;
        const decode = await bcrypt.compare(password, userPassword);
        if (!decode) return res.status(400).json({ message: "invalid password" });
        const token = jwt.sign({ userId: user.id }, jwt_sicret, { expiresIn: "100d" });
        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 * 100,
            secure: true,
            sameSite: "none"
        });
        res.status(200).json({ message: "logdin successfully" })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in user/login" })
    }
});

route.post("/logout", async (req, res) => {
    try {
        res.clearCookie("token");
        res.status(200).json({ message: "logout successfully" })
        console.log(req.body);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in user/logout" })
    }
});

route.get("/friendlist", async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ message: "Unauthorized" });
        const decode = jwt.verify(token, jwt_sicret);
        const uid = decode.userId;
        const user = await People.findById(uid);
        user.notAllow.push(uid);
        const notAllowArray = user.notAllow.map(id => new mongoose.Types.ObjectId(id));
        const friends = await People.find({ _id: { $nin: notAllowArray } });
        res.status(200).json({ message: "Here is your friend list", data: friends });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error in /friendlist" });
    }
});

route.get("/myfriends", async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const user = await People.findById(decode.userId).populate("friends");
        const friends = user?.friends;
        res.status(200).json({ message: "here is your friends", data: friends });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in people/friendlist" })
    }
});

route.post("/remove_friend", async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const { userId } = req.body;
        const mainUser = await People.findById(decode.userId);
        mainUser.notAllow.push(userId);
        await mainUser.save();
        res.status(200).json({ message: "user removed" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in people/remove_friend" })
    }
});

route.post("/remove_post", async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const { postId } = req.body;
        console.log("post id--: ", postId)
        const mainUser = await People.findById(decode.userId);
        mainUser.notAllowPost.push(postId);
        await mainUser.save();
        res.status(200).json({ message: "user removed" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in people/remove_friend" })
    }
});

route.post("/remove_video_post", async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const { postId } = req.body;
        console.log("post id--: ", postId)
        const mainUser = await People.findById(decode.userId);
        mainUser.notAllowVideoPost.push(postId);
        await mainUser.save();
        res.status(200).json({ message: "user removed" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in people/remove_friend" })
    }
});

route.post("/getChat", async (req, res) => {
    try {
        const { sender, riciver } = req.body;
        const chats = await Chat.find({
            $or: [
                { senderId: sender, recevireId: riciver },
                { senderId: riciver, recevireId: sender }
            ]
        }).populate("user").populate("share").populate({
            path: "replay.chatId",
            populate: {
                path: "share",
                model: "Post"
            }
        });

        res.status(200).json({ message: "here is your chat", data: chats });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error in / getChat api" });
    }
});

route.post("/activeuser", async (req, res) => {
    try {
        const { userId } = req.body;
        await People.findByIdAndUpdate(userId, { isActive: true }, { new: true });
        res.status(200).json({ message: "active succssfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error in activeuser /  api" });
    }
});

route.post("/dactiveuser", async (req, res) => {
    try {
        const { userId } = req.body;
        await People.findByIdAndUpdate(userId, { isActive: false }, { new: true });
        res.status(200).json({ message: "active succssfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error in activeuser /  api" });
    }
});

route.get("/randomuser/:id", async (req, res) => {
    try {
        console.log(req.params.id)
        const user = await People.findById(req.params.id).populate("friends", "name image _id");
        if (!user) return res.status(404).json({ message: "user not found" });
        console.log(user)
        res.status(200).json({ message: "here is your useer", user });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error in randomuser /  api" });
    }
});

route.post("/addbio", async (req, res) => {
    try {
        const { bio } = req.body;
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const uid = decode.userId;
        await People.findByIdAndUpdate(uid, { bio }, { new: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error in addbio /  api" });
    }
});


route.post("/checkauth", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(password)
        const user = await People.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "Invalid email", success: false });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(404).json({ message: "Invalid password", success: false });
        }

        res.status(200).json({ message: "This is you", success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", success: false });
    }
});

route.post("/restpassword", async (req, res) => {
    try {
        const { password } = req.body;
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const hashpassword = await bcrypt.hash(password, 10);
        await People.findByIdAndUpdate(decode.userId, { password: hashpassword }, { new: true });
        res.status(200).json({ message: "password reset success", success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// user style controler section //

route.post("/textcolor", async (req, res) => {
    try {
        const { textColor, id } = req.body;
        await People.findByIdAndUpdate(id, { "styles.textColor": textColor }, { new: true });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error in textcolor /  api" })
    }
});

route.post("/textstyle", async (req, res) => {
    try {
        const { textStyle, id } = req.body;
        console.log(textStyle);
        await People.findByIdAndUpdate(id, { "styles.textStyle": textStyle }, { new: true });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error in textcolor /  api" })
    }
});

route.post("/themebg", async (req, res) => {
    try {
        const { themebg, id } = req.body;
        await People.findByIdAndUpdate(id, { "styles.themebg": themebg }, { new: true });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error in textcolor /  api" });
    }
});

route.post("/postbg", async (req, res) => {
    try {
        const { postbg, id } = req.body;
        await People.findByIdAndUpdate(id, { "styles.postbg": postbg }, { new: true });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error in textcolor /  api" });
    }
});

route.get("/friendData/:id", async (req, res) => {
    try {
        const user = await People.findById(req.params.id).select("image name _id");
        if (!user) {
            return res.status(404).json({ message: "user not found 404" })
        };
        res.status(200).json({ message: "here is your user", user });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error in textcolor /  userData" });
    }
});

route.post("/leftfromgroup", async (req, res) => {
    try {
        const { user, group } = req.body;
        console.log("uid", user, "gid", group);
        await People.findByIdAndUpdate(user, { $pull: { groups: group } }, { new: true });
        await Group.findByIdAndUpdate(group, { $pull: { members: { userId: user } } }, { new: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "error in textcolor /  userData" });
    }
})

route.get("/:name", async (req, res) => {
    try {
        const { name } = req.params;

        // Use regex for case-insensitive partial search
        const users = await People.find({
            name: { $regex: name, $options: "i" }
        }).select("username email name image"); // select only what you need

        res.json(users);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Server error while fetching user" });
    }
});


route.get("/dp", async (req, res) => {
    await People.deleteMany();
    res.send("<h1>deleted all user 🎉🎉<h1>")
})

module.exports = route;