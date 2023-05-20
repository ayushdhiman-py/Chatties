const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const ws = require("ws");
const MsgModel = require("./models/Message");
const fs = require("fs");
const cloudinary = require("./cloudinary.js");
const axios = require("axios");
const UserModel = require("./models/User");
const path = require("path");

dotenv.config();
const jwtSecret = process.env.JWT_SECRET;

mongoose.connect(process.env.MONGO_URL);
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
    optionSuccessStatus: 200,
  })
);
// app.use("/uploads", express.static(__dirname + "/uploads"));

async function getUserDataFromReq(req) {
  return new Promise((res, rej) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        res(userData);
      });
    } else {
      rej("NO TOKEN");
    }
  });
}

const __dirname1 = path.resolve();
if (process.env.NODE_ENV === "production") {
  // app.use(express.static(path.join(__dirname1, "/client/dist")));
  // app.get("*", (req, res) => {
  //   res.sendFile(path.join(__dirname1, "client", "dist", "index.html"));
  // });
  app.get("/", (req, res) => {
    res.json("ok tested");
  });
} else {
}

app.get("/messages/:userId", async (req, res) => {
  const { userId } = req.params;
  const userData = await getUserDataFromReq(req);
  const ourUserId = userData.userId;
  const msges = await MsgModel.find({
    sender: { $in: [userId, ourUserId] },
    recipient: { $in: [userId, ourUserId] },
  }).sort({ createdAt: 1 });
  res.json(msges);
});

// here we get all the people
app.get("/people", async (req, res) => {
  const users = await UserModel.find({}, { _id: 1, username: 1 });
  res.json(users);
});

app.get("/profile", (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      res.json(userData);
    });
  } else {
    res.status(401).json("NO TOKEN");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const foundUser = await UserModel.findOne({ username });
  if (foundUser) {
    console.log(password, foundUser.password);
    if (password == foundUser.password) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token).json({
            id: foundUser._id,
          });
        }
      );
    }
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("logged out ok");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const createdUser = await UserModel.create({ username, password });
    jwt.sign(
      { userId: createdUser._id, username },
      jwtSecret,
      {},
      (err, token) => {
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(201)
          .json({
            id: createdUser._id,
          });
      }
    );
  } catch (err) {
    if (err) throw err;
    res.status(500).json("err");
  }
});
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT);

const wss = new ws.WebSocketServer({ server }); // all connections sit inside the ws
wss.on("connection", (connection, req) => {
  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
          })),
        })
      );
    });
  }
  connection.isAlive = true;
  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
      console.log("dead");
    }, 1000);
  }, 2000);
  connection.on("pong", () => {
    clearTimeout(connection.deathTimer);
  });

  // user data collected form the cookie for this connection
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(";")
      .find((str) => str.startsWith("token="));
    if (tokenCookieString) {
      const token = tokenCookieString.split("=")[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) throw err;
          const { userId, username } = userData;
          // web socket connection to the client
          connection.userId = userId;
          connection.username = username;
        });
      }
    }
  }

  // take the upper connection and do further things
  connection.on("message", async (message) => {
    const messageData = JSON.parse(message.toString());
    const { recipient, text, file } = messageData;
    let filename = null;
    let result = null;
    if (file) {
      console.log("size", file.data.length);
      const parts = file.name.split(".");
      const ext = parts[parts.length - 1];
      filename = Date.now() + "." + ext;
      const path = __dirname + "/uploads/" + filename;
      const bufferData = new Buffer.from(file.data.split(",")[1], "base64");
      fs.writeFile(path, bufferData, () => {
        console.log("file saved:" + path);
      });
      try {
        result = await cloudinary.uploader.upload(file.data, {
          upload_preset: "chatapp",
          cloud_name: process.env.CLOUD_NAME,
          api_key: process.env.API_KEY,
          api_secret: process.env.API_SECRET,
        });
        console.log(result.public_id);
        app.get("/", (req, res) => {
          const data = {
            image: result.public_id,
          };
        });
      } catch (error) {
        console.log("error", error);
      }
    }
    if (recipient && (text || file)) {
      const messageDoc = await MsgModel.create({
        sender: connection.userId,
        recipient,
        text,
        file: file ? result.public_id : null,
      });
      console.log("created message");
      [...wss.clients]
        .filter((c) => c.userId === recipient)
        .forEach((c) =>
          c.send(
            JSON.stringify({
              text,
              sender: connection.userId,
              recipient,
              file: file ? result.public_id : null,
              _id: messageDoc._id,
            })
          )
        );
    }
  });

  // now showing who is online
  // grabbing all the clients
  notifyAboutOnlinePeople();
});
