import {
  DB_URI,
  EMAIL_HOST,
  EMAIL_PASS,
  EMAIL_USER,
  FRONTEND_URL,
  IS_PRODUCTION,
} from "./utils/constants";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import authRoutes from "./routes/auth.routes";
import postsRoutes from "./routes/posts.routes";
import settingsRoutes from "./routes/settings.routes";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import { Server } from "socket.io";
import http from "http";
import authMiddleware from "./middleware/auth.middleware";
import { createPostSocket } from "./sockets/create-post.socket";
import { GoogleGenAI } from "@google/genai";
import { authSocketMiddleware } from "./middleware/auth-socket.middle";
import OpenAI from "openai";
import { test } from "./controllers/test.controller";
import { chatSocket } from "./sockets/chat.socket";

const app = express();

const corsOptions = {
  origin: IS_PRODUCTION ? false : FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
  serveClient: false,
});

export const ai = new GoogleGenAI({});
export const openai = new OpenAI({});

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());
if (IS_PRODUCTION) {
  app.use(csurf({ cookie: true }));
}

export const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: 587,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// app.get("/pop-mongo", async (req: Request, res: Response) => {
//   console.log("Populating MongoDB from CSV...");
//   const start = Date.now();
//   await csvToMongo();
//   const end = Date.now();
//   res.json({
//     message: "MongoDB populated from CSV.",
//     timeTakenSeconds: (end - start) / 1000,
//   });
// });

// Express - Routes & handlers
app.use("/api/auth", authRoutes);
app.use("/api/posts", authMiddleware, postsRoutes);
app.use("/api/settings", authMiddleware, settingsRoutes);
app.use("/api/test", test);

// Sockets - Routes
const createPostIo = io.of("/create-post").use(authSocketMiddleware);
const chatIo = io.of("/chat").use(authSocketMiddleware);

// Sockets - Handlers
createPostSocket(createPostIo);
chatSocket(chatIo);

// Connect to MongoDB and start the server
mongoose
  .connect(DB_URI)
  .then(() => {
    server.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}.`);
    });
  })
  .catch((err) => {
    console.error("Connection error:", err);
    process.exit();
  });
