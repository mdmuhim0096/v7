
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const http = require('http');
const { Server } = require('socket.io');
const Chat = require("./model/chat");

// Express app and HTTP server
const app = express();
const server = http.createServer(app);

// ✅ Socket.IO with cross-origin support
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", // Local development
      "https://mdmuhim0096.github.io",
      "https://v7-client.onrender.com"
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ✅ Socket.IO logic
io.on('connection', (socket) => {
  socket.broadcast.emit("alert", null);
  socket.on("block_user", data => {
    socket.broadcast.emit("block_user", data);
  })
  socket.on("gmessage", data => {
    socket.broadcast.emit("gmessage", data);
  });
  socket.on("comment", data => {
    io.emit("comment", data);
  });
  socket.on("join_video_room", roomId => {
    socket.broadcast.emit("join_video_room", roomId);
  });
  socket.on("join_audio_room", data => {
    socket.broadcast.emit("join_audio_room", data);
  });

  socket.on("aftersent", roomId => {
    socket.broadcast.emit("aftersent", roomId);
  });

  socket.on("gaftersent", roomId => {
    socket.broadcast.emit("gaftersent", roomId);
  });

  socket.on("end_call", data => {
    socket.broadcast.emit("end_call", data);
  });

  socket.on("join_call_a", data => {
    socket.broadcast.emit("join_call_a", data);
  });

  socket.on("join_call_v", data => {
    socket.broadcast.emit("join_call_v", data);
  })

  socket.on("end_call_a", data => {
    socket.broadcast.emit("end_call_a", data);
  });

  socket.on("incoming_call_a", data => {
    socket.broadcast.emit("incoming_call_a", data);
  })

  socket.on("groupvideocall", data => {
    socket.broadcast.emit("groupvideocall", data);
  });

  socket.on("incoming_call", userId => {
    socket.broadcast.emit("incoming_call", userId);
  });

  socket.on("____incoming_call____", data => {
    socket.broadcast.emit("____incoming_call____", data);
  });

  socket.on("____recive_call____", data => {
    socket.broadcast.emit("____recive_call____", data);
  });

  socket.on("callend", userId => {
    socket.broadcast.emit("callend", userId);
  });

  socket.on("onRGAC", data => {
    socket.broadcast.emit("onRGAC", data);
  })
  socket.on("onRGACM2E", data => {
    socket.broadcast.emit("onRGACM2E", data);
  })

  socket.on("onGVC", data => {
    socket.broadcast.emit("onGVC", data);
  })
  socket.on("onGVCE", data => {
    socket.broadcast.emit("onGVCE", data);
  })

  socket.on('send_message', async (data) => {
    const messageObject = {
      recevireId: data.riciver,
      senderId: data.sender,
      user: data.sender,
      time: data.realtime,
      messageText: null,
    };

    if (data.message.includes("https://") || data.message.includes("http://")) {
      messageObject["link.link"] = data.message;
      messageObject["link.isLink"] = true;
    }

    const isLoop = data.message.match(/^\$(\d+)\s?\{(.+)\}$/);
    if (isLoop) {
      const count = parseInt(isLoop[1]);
      const text = isLoop[2];
      messageObject.messageText = Array(count).fill(text).join(", ") + ".";
    } else {
      messageObject.messageText = data.message;
    }

    if (data.mediaUrl) {
      messageObject.mediaUrl = data.mediaUrl;
    }

    try {
      if (data.call?.type && data.call?.duration) {
        messageObject["call.callType"] = data.call.type;
        messageObject["call.duration"] = data.call.duration;
      }
    } catch (error) {
      console.log(error.message);
    }

    try {
      const newChat = new Chat(messageObject);
      const user = await newChat.save();
      const realchat = await Chat.findById(user.id).populate("user");
      io.emit('receive_message', realchat);
    } catch (err) {
      console.log("Chat Save Error:", err.message);
    }
  });

  socket.on("send_replay", async data => {
    await Chat.findByIdAndUpdate(data.chatId, {
      "replay.text": data.replay,
      "replay.image": data.image,
      isReplay: true
    }, { new: true });
    io.emit("replay", null);
  });

  socket.on("__load_data__", data => {
    socket.broadcast.emit("__load_data__", data);
  });

  socket.on("see", data => {
    socket.broadcast.emit("see", data);
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit("alert", null);
  });
});

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));


const allowedOrigins = [
  "http://localhost:5173", // local dev
  "https://mdmuhim0096.github.io", // deployed GitHub Pages root
  "https://v7-client.onrender.com" // optional if subpath used
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.error(`❌ CORS blocked: ${origin}`);
      return callback(new Error("CORS not allowed"));
    }
  },
  credentials: true,
}));


// ✅ Routers
const databas = require("./databas/databas");
const userRouter = require("./router/people");
const postRouter = require("./router/post");
const saveRouter = require("./router/save");
const friendRouter = require("./router/friend");
const messageRouter = require("./router/chat");
const notificatioRouter = require("./router/notification");
const createNotificatioRouter = require("./router/createNotifications");
const createGroupRouter = require("./router/createGroup");
const groupChatRouter = require("./router/groupChat");
const shareRouter = require("./router/share");
const reportRouter = require("./router/report");

app.use("/api/people", userRouter);
app.use("/api/post", postRouter);
app.use("/api/save", saveRouter);
app.use("/api/friend", friendRouter);
app.use("/api/chat", messageRouter);
app.use("/api/noti", notificatioRouter);
app.use("/api/addNoti", createNotificatioRouter);
app.use("/api/group", createGroupRouter);
app.use("/api/gchat", groupChatRouter);
app.use("/api/share", shareRouter);
app.use("/api/report", reportRouter);

// ✅ Health check
app.get("/isOk", (req, res) => {
  res.send('<h1>All Right</h1>');
});

// ✅ Start server
const port = 4000;
server.listen(port, () => {
  console.log(`✅ Server running: http://localhost:${port}`);
});
