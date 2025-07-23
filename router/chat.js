const route = require("express").Router();
const Chat = require("../model/chat");
const People = require("../model/people");
const multer = require("multer");
const { deletePreviusFile } = require("../lib/fileHandeler");
const Cloudinary = require("../databas/cloudinary");
const streamifier = require("streamifier");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
});

route.post("/update", async (req, res) => {
    try {
        const { chatId, message } = req.body;
        const messages = await Chat.findByIdAndUpdate(chatId, { messageText: message }, { new: true });
        res.status(200).json({ message: "success", data: messages });
    } catch (error) {
        console.log(error)
    }
})

route.post("/delete", async (req, res) => {
    try {
        const { chatId } = req.body;
        const message = await Chat.findById(chatId);
        deletePreviusFile("/" + message.mediaUrl);
        await Chat.findByIdAndDelete(chatId);
        res.status(200).json({ message: "deleted success" })
    } catch (error) {
        console.log(error);
    }
})

route.post("/unsent", async (req, res) => {
    try {
        const { chatId } = req.body;
        const messages = await Chat.findById(chatId);

        if (!messages) {
            return res.status(404).json({ message: "Message not found" });
        }

        let updatedData = {};

        if (messages.link?.isLink) {
            updatedData = {
                "link.link": "unsent",
                "link.isLink": false
            };
        } else if (typeof messages.mediaUrl === "string" &&
            (messages.mediaUrl.includes("image") ||
                messages.mediaUrl.includes(".jpg") ||
                messages.mediaUrl.includes("video") ||
                messages.mediaUrl.includes(".mp4") ||
                messages.mediaUrl.includes("audio") ||
                messages.mediaUrl.includes(".mp3"))) {

            deletePreviusFile("/" + messages.mediaUrl);
            updatedData = {
                mediaUrl: "unsent"
            };
        } else {
            updatedData = {
                messageText: "unsent"
            };
        }

        const updatedMessage = await Chat.findByIdAndUpdate(chatId, updatedData, { new: true });

        return res.status(200).json({ message: "success", data: updatedMessage });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", error });
    }
});



route.post("/getusr/:id", async (req, res) => {
    try {
        const userId = req.params.id; // Extract user ID from URL parameter
        const user = await People.findById(userId)

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user); // Send user data
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

route.post("/replaychat", async (req, res) => {
    try {
        const { recevireId, senderId, time, user, chatId, replay } = req.body;
        const reply = new Chat({ senderId, recevireId, time, user, isReplay: true, replay: { chatId, text: replay } });
        const response = await reply.save();
        res.status(201).json({ message: "replay created true", response });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


route.get("/deleteall", async (req, res) => {
    try {
        await Chat.deleteMany();
        res.send("<h1>deleted all 📗📗</h1>")
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

route.post("/upload", upload.any(), async (req, res) => {
  try {
    const file = req.files?.[0];
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const { senderId, recevireId, time } = req.body;

    // ✅ Detect type
    const mimetype = file.mimetype;
    const isImage = mimetype.startsWith("image/");
    const isAudio = mimetype.startsWith("audio/");

    if (!isImage && !isAudio) {
      return res.status(400).json({ error: "Only image and audio files are allowed" });
    }

    const resourceType = isImage ? "image" : "video"; // audio uploads go under 'video' in Cloudinary

    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const uploadOptions = {
          resource_type: resourceType,
          folder: "chatUploads",
          use_filename: true,
          unique_filename: true,
          overwrite: true,
        };

        const stream = Cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) {
            console.error("Cloudinary Upload Error:", error);
            return reject(error);
          }
          resolve(result);
        });

        streamifier.createReadStream(file.buffer).pipe(stream);
      });

    const result = await streamUpload();

    const newChat = new Chat({
      recevireId,
      senderId,
      mediaUrl: result.secure_url,
      time,
      user: senderId,
    });

    await newChat.save();

    res.status(201).json({ message: "Upload successful", mediaUrl: result.secure_url });
  } catch (error) {
    console.error("Final Upload Error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

route.post("/upload-video", upload.any(), async (req, res) => {
  try {
    const file = req.files?.[0];
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const { senderId, recevireId, time } = req.body;

    const mimetype = file.mimetype;
    const isVideo = mimetype.startsWith("video/");

    if (!isVideo) {
      return res.status(400).json({ error: "Only video files are allowed" });
    }

    const base64Data = `data:${mimetype};base64,${file.buffer.toString("base64")}`;

    const result = await Cloudinary.uploader.upload(base64Data, {
      resource_type: "video",
      folder: "chatUploads",
      format: "mp4",
      audio_codec: "aac",
      video_codec: "h264",
      use_filename: true,
      unique_filename: true,
      overwrite: true,
    });

    const newChat = new Chat({
      recevireId,
      senderId,
      mediaUrl: result.secure_url,
      time,
      user: senderId,
    });

    await newChat.save();

    res.status(201).json({ message: "Video upload successful", mediaUrl: result.secure_url });
  } catch (error) {
    console.error("Video Upload Error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});



module.exports = route