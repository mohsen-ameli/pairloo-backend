import {
  EMAIL_HOST,
  EMAIL_PASS,
  EMAIL_USER,
  FRONTEND_URL,
  IS_PRODUCTION,
} from "./utils/constants";
import express, { Request, Response } from "express";
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
import { getClosestProducts } from "./utils/getClosestProducts";
import { csvToMongo } from "./utils/csvToMongo";

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

// Simple route for testing
app.get("/", (req: Request, res: Response) => {
  const wantedProduct = {
    category: "Electronics",
    name: "iPhone 14 Pro",
    quantity: "1",
    price: "800.00",
    region: "Conakry, Guinea",
  };
  getClosestProducts(wantedProduct);
  // res.cookie("test", false, {
  //   httpOnly: true,
  //   secure: IS_PRODUCTION,
  //   sameSite: "lax",
  // });
  res.json({
    message: "Welcome to the Node.js JWT Authentication application.",
  });
});
app.get("/pop-mongo", async (req: Request, res: Response) => {
  console.log("Populating MongoDB from CSV...");
  const start = Date.now();
  await csvToMongo();
  const end = Date.now();
  res.json({
    message: "MongoDB populated from CSV.",
    timeTakenSeconds: (end - start) / 1000,
  });
});

io.on("connection", (socket) => {
  console.log(socket.id, " connected");
  socket.emit("message", {
    text: "hi",
    num: 123,
    arr: [1, 2, 3],
    jjj: { a: "b" },
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", authMiddleware, postsRoutes);
app.use("/api/settings", authMiddleware, settingsRoutes);

// Connect to MongoDB and start the server
mongoose
  .connect(
    `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
  )
  .then(() => {
    server.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}.`);
    });
  })
  .catch((err) => {
    console.error("Connection error:", err);
    process.exit();
  });
