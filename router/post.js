const route = require("express").Router();
const Post = require("../model/post");
const jwt = require("jsonwebtoken");
const jwt_sicret = "15ef1fr5g4158dwo0k";
const People = require("../model/people");
const multer = require("multer");
const { createNotification } = require("../middleware/notification");
const { deletePreviusFile } = require("../lib/fileHandeler");
const { default: mongoose } = require("mongoose");
const Cloudinary = require("../databas/cloudinary");

const storage = multer.memoryStorage();
const upload = multer({ storage });
const streamifier = require("streamifier");

route.post("/createPost", upload.single("media"), async (req, res) => {
    try {

        const { caption } = req.body;
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const uid = decode.userId;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const mimeType = req.file.mimetype;
        const fileType = mimeType.startsWith("video/") ? "video" : "image";
        const folderName = fileType === "video" ? "postVideo" : "postImage";
        const isVideo = fileType === "video";
        const isImage = fileType === "image";

        const uploadFromBuffer = (fileBuffer) => {
            return new Promise((resolve, reject) => {
                const uploadStream = Cloudinary.uploader.upload_stream(
                    {
                        resource_type: fileType,
                        folder: folderName,
                    },
                    (error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    }
                );

                streamifier.createReadStream(fileBuffer).pipe(uploadStream);
            });
        };

        const result = await uploadFromBuffer(req.file.buffer);

        const newPost = new Post({
            caption,
            postOwner: uid,
            media: result.secure_url,
            video: isVideo,
            image: isImage,
        });

        const response = await newPost.save();
        const user = await People.findById(uid);
        const friends = user.friends;
        createNotification(friends, uid, "post", newPost._id);
        res.status(201).json({ message: "Post created successfully", data: response });

    } catch (error) {
        console.error("Post creation error:", error);
        res.status(500).json({ message: "Server error in /createPost" });
    }
});

route.post("/addcomment", async (req, res) => {
    try {
        const { post_id, comment } = req.body;
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const uid = decode.userId;
        const post = await Post.findById(post_id);
        if (!post) return console.log("Post not found");

        post.comments.push({
            text: comment,
            user: uid
        });
        await post.save();

    } catch (error) {
        console.error("Error adding comment:", error);
    }
});

route.post("/addreplay", async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const uid = decode.userId;
        const { postId, commentId, replyText } = req.body;
        const post = await Post.findById(postId);
        if (!post) return console.log("Post not found");

        const comment = post.comments.id(commentId);
        if (!comment) return console.log("Comment not found");

        comment.replies.push({
            text: replyText,
            user: uid
        });

        await post.save();

    } catch (error) {
        console.error("Error adding reply:", error);
    }
});

route.post("/addlike", async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const uid = decode.userId;
        const { postId, type } = req.body;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        // Check if user already liked with the same type
        const alreadyLiked = post.likes.some(
            like => like.user?.toString() === uid);

        if (!alreadyLiked) {
            // Add like
            post.likes.push({ user: uid, type: type });
        } else {
            // Remove like
            post.likes = post.likes.filter(
                like => !(like.user?.toString() === uid)
            );
        }

        const resposne = await post.save();
        console.log(resposne)

        return res.status(200).json({ message: "Like toggled successfully", post });
    } catch (error) {
        console.error("Error liking/unliking post:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

route.get("/mypost", async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const posts = await Post.find({ postOwner: decode.userId }).populate("postOwner", "name image");
        res.status(200).json({ message: "here is your posts", data: posts })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "server error in post/mypost" });
    }
});

route.get("/getclips/:id", async (req, res) => {
    try {
        const User = await People.findById(req.params.id);
        const notAllowPost = User.notAllowPost.map(id => new mongoose.Types.ObjectId(id));
        const clip = await Post.find({ isClip: true, _id: { $nin: notAllowPost } })
            .populate("postOwner", "username id image name")
            .populate("comments.user", "username email")
            .populate("comments.replies.user", "username email")
            .populate("likes", "username");
        res.status(200).json({ message: "here is your post", clip });
    } catch (error) {
        console.error("Error fetching posts:", error);
    }
});

route.get("/getMyClips/:id", async (req, res) => {
    try {

        const clip = await Post.find({ isClip: true, postOwner: req.params.id })
            .populate("postOwner", "username id image name")
            .populate("comments.user", "username email")
            .populate("comments.replies.user", "username email")
            .populate("likes", "username");
        res.status(200).json({ message: "here is your post", clip });
    } catch (error) {
        console.error("Error fetching posts:", error);
    }
});

route.post("/createClip/:id", upload.single("media"), async (req, res) => {
    try {
        const { caption } = req.body;
        const uid = new mongoose.Types.ObjectId(req.params.id); // ✅ fixed

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const mimeType = req.file.mimetype;
        const isVideo = mimeType.startsWith("video/");
        const isImage = mimeType.startsWith("image/");
        const folderName = isVideo ? "postVideo" : "postImage";
        const resourceType = isVideo ? "video" : "image";

        const uploadFromBuffer = (fileBuffer) => {
            return new Promise((resolve, reject) => {
                const uploadStream = Cloudinary.uploader.upload_stream(
                    {
                        resource_type: resourceType,
                        folder: folderName,
                    },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );

                streamifier.createReadStream(fileBuffer).pipe(uploadStream);
            });
        };

        const result = await uploadFromBuffer(req.file.buffer);

        const newPost = new Post({
            caption,
            postOwner: uid,
            media: result.secure_url,
            video: isVideo,
            image: isImage,
            isClip: true,
        });

        const response = await newPost.save();

        const user = await People.findById(uid);
        const friends = user.friends;

        // await if it’s async
        await createNotification(friends, uid, "post", newPost._id);

        res.status(201).json({
            message: "Post created successfully",
            data: response,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error while creating clip" });
    }
});


route.get("/publicpost/:id", async (req, res) => {
    try {
        const User = await People.findById(req.params.id);
        const notAllowPost = User.notAllowPost.map(id => new mongoose.Types.ObjectId(id));
        const posts = await Post.find({ _id: { $nin: notAllowPost } })
            .populate("postOwner", "username id image name")
            .populate("comments.user", "username email")
            .populate("comments.replies.user", "username email")
            .populate("likes", "username");

        res.status(200).json({ message: "here is your post", posts });
    } catch (error) {
        console.error("Error fetching posts:", error);
    }
});


route.get("/getpostbyid/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("postOwner", "username id image name")
            .populate("comments.user", "username email")
            .populate("comments.replies.user", "username email")
            .populate("likes", "username");

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        res.status(200).json({ message: "Here is your post", post });
    } catch (error) {
        console.error("Error fetching post:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

route.get("/postinfo/:id", async (req, res) => {
    try {
        const singlePost = await Post.findById(req.params.id)
            .populate("comments.user", "image name")
            .populate("comments.replies.user", "image name")
            .populate("comments.replies.replay.user", "image name")
            .populate("comments.replies.replay.replay.user", "image name gender")
            .populate("postOwner", "name image _id")
        res.status(200).json({ message: "here is your post", singlePost });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "internal server error in postinfo/API" });
    }
});


route.post("/addinnerreplay", async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const uid = decode.userId;
        const { postId, commentId, repId, replyText } = req.body;
        const post = await Post.findById(postId);
        if (!post) return console.log("Post not found");
        const comment = post.comments.id(commentId);
        const replay = comment.replies.id(repId);
        replay.replay.push({ text: replyText, user: uid });
        await post.save();

    } catch (error) {
        console.error("Error adding reply:", error);
    }
});

route.post("/addNestedInnerReplay", async (req, res) => {
    try {
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const uid = decode.userId;
        const { postId, commentId, repId, replyText, replayOf, nestedId } = req.body;
        const post = await Post.findById(postId);
        if (!post) return console.log("Post not found");
        const comment = post.comments.id(commentId);
        const replay = comment.replies.id(repId);
        const nestetdReplay = replay.replay.id(nestedId);
        nestetdReplay.replay.push({ replayOf, text: replyText, user: uid });
        await post.save();
    } catch (error) {
        console.error("Error adding reply:", error);
    }
});

route.post("/addlike_comment", async (req, res) => {
    try {

        const { commentId, postId, type } = req.body;
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const uid = decode.userId;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "post not found 404" });
        const comment = post.comments.id(commentId);
        comment?.likes.push({ user: uid, type: type });
        await post.save();

    } catch (error) {
        console.error("Error adding like:", error);
    }
})

route.post("/addlike_replay", async (req, res) => {
    try {
        const { commentId, postId, repId, type } = req.body;
        const token = req.cookies.token;
        const decode = jwt.verify(token, jwt_sicret);
        const uid = decode.userId;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "post not found 404" });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "comment not found" });

        const reply = comment.replies.id(repId);
        if (!reply) return res.status(404).json({ message: "reply not found" });

        reply.likes.push({ user: uid, type });

        await post.save();
        res.json({ message: "Like added successfully", post });
    } catch (error) {
        console.log("Error adding like:", error);
        res.status(500).json({ message: "internal server error" });
    }
});

route.post("/inner_addlike_replay", async (req, res) => {
    try {
        const { commentId, postId, repId, nestId, type } = req.body;
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const decode = jwt.verify(token, jwt_sicret);
        const uid = decode.userId;

        // Find post
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        // Find nested reply
        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const replay = comment.replies.id(repId);
        if (!replay) return res.status(404).json({ message: "Replay not found" });

        const nestrep = replay.replay.id(nestId);
        if (!nestrep) return res.status(404).json({ message: "Nested reply not found" });

        // Like/Unlike logic
        const existingLikeIndex = nestrep.likes.findIndex(
            (like) => like.user.toString() === uid.toString()
        );

        if (existingLikeIndex > -1) {

            if (nestrep.likes[existingLikeIndex].user?.toString() === uid) {
                // Same type → unlike (remove)
                nestrep.likes.splice(existingLikeIndex, 1);
            } else {
                // Different type → update type
                nestrep.likes[existingLikeIndex].type = type;
            }
        } else {
            // Not liked yet → add like
            nestrep.likes.push({ user: uid, type });
        }

        await post.save();

        res.status(200).json({ message: "Like/Unlike updated successfully" });
    } catch (error) {
        console.error("Error adding like:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

route.get("/randompost/:id", async (req, res) => {
    try {
        const posts = await Post.find({ postOwner: req.params.id }).populate("postOwner", "name image");
        res.status(200).json({ message: "here is post", posts });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "internal server error" });
    }
});

route.get("/read_all_video/:id", async (req, res) => {
    try {
        const user = await People.findById(req.params.id);
        const notAllowVideoPost = user.notAllowVideoPost.map(id => new mongoose.Types.ObjectId(id));
        const videos = await Post.find({ _id: { $nin: notAllowVideoPost }, video: true, image: false }).populate("postOwner", "username id image name")
            .populate("comments.user", "username email")
            .populate("comments.replies.user", "username email")
            .populate("likes", "username");

        res.status(200).json({ message: "here is your videos", videos });
    } catch (error) {
        res.status(500).json({ message: "internal server error" });
    }
})

route.post("/upadateCaption/:id", async (req, res) => {
    try {
        const { caption } = req.body;
        const post = await Post.findByIdAndUpdate(req.params.id, { caption }, { new: true });
        res.status(200).json({ message: "update success", post });
    } catch (error) {
        res.status(500).json({ message: "internal server error" });
    }
})


route.post("/upadateMedia/:id", upload.single("media"), async (req, res) => {
    try {
        const beforeUpdatePost = await Post.findById(req.params.id);
        const previusFile = beforeUpdatePost.media;
        deletePreviusFile(previusFile);
        const mimeType = req.file.mimetype;
        const isVideo = mimeType.startsWith("video/");
        const isImage = mimeType.startsWith("image/");
        let directoryName = isVideo ? "postVideo" : isImage ? "postImage" : "";
        const destinationPath = `/${directoryName}/${req.file.filename}`;
        const post = await Post.findByIdAndUpdate(
            req.params.id,
            {
                media: destinationPath,
                image: isImage,
                video: isVideo,
            },
            { new: true }
        );

        res.status(200).json({ message: "update success", post });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "internal server error" });
    }
});

route.delete("/delete/:id", async (req, res) => {
    try {
        const beforDelete = await Post.findById(req.params.id);
        deletePreviusFile(beforDelete.media);
        await Post.findByIdAndDelete(beforDelete.id);
        res.status(200).json({ message: "delete success" })
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "internal server error" });
    }
});

route.get("/deleteall", async (req, res) => {
    try {
        await Post.deleteMany()
        res.send("ok")
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "internal server error" });
    }
})

route.get("/get_react/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)?.populate("likes.user", "image name _id");
        if (!post) return res.status(404).json({ message: "post not found" });
        const react = post.likes;
        res.json(react);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "internal server error" });
    }
});

module.exports = route;