const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const path = require("path");
const mongoose = require("mongoose");
const userSchema = require("./models/user.model");
const chatSchema = require("./models/chat.model");

mongoose
  .connect(
    "mongodb+srv://PM:paYYbC4K8KgWdDEw@cluster0.hawin.mongodb.net/socket-test?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((e) => {
    console.log(e);
  });

const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, "client/build")));

app.get("/*", function (req, res) {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

let usersConnected = new Map();

io.on("connection", (socket) => {
  let { id } = socket.client;
  socket.on("user nickname", (nickname) => {
    var myData = new userSchema({ nickname });
    myData.save();
    usersConnected.set(nickname, [socket.client.id, socket.id]);

    io.emit("users-on", Array.from(usersConnected.keys()));
    socket.broadcast.emit("welcome", nickname);
  });

  socket.on("chat message", ({ nickname, msg }) => {
    if (msg) {
      var myData1 = new chatSchema({ chatMessage: msg });
      myData1.save();
    }
    console.log(nickname, msg, "++++++++++++++++++++++++++");
    socket.broadcast.emit("chat message", { nickname, msg });
  });

  socket.on("chat message private", ({ toUser, nickname, msg }) => {
    let socketId = usersConnected.get(toUser)[1];
    io.to(socketId).emit("private msg", { id, nickname, msg });
  });

  socket.on("disconnect", () => {
    let tempUserNickname;

    for (let key of usersConnected.keys()) {
      if (usersConnected.get(key)[0] === id) {
        tempUserNickname = key;
        usersConnected.delete(key);
        break;
      }
    }
    io.emit("users-on", Array.from(usersConnected.keys()));
    socket.broadcast.emit("user-disconnected", tempUserNickname);
  });
  //new image get
  socket.on("img", function (imgData, color) {
    socket.broadcast.emit("newImg", socket.nickname, imgData, color);
  });
});

server.listen(PORT, () => console.log(`Listen on *: ${PORT}`));
