import { IS_PRODUCTION } from "./utils/constants";
import express, { Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import postsRoutes from "./routes/posts.routes";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import User from "./models/user.model";
import { Server } from "socket.io";
import http from "http";
import authMiddleware from "./middleware/auth.middleware";
import { getClosestProduct } from "./utils/getClosestProduct";

const app = express();

const corsOptions = {
  origin: IS_PRODUCTION ? false : "http://localhost:3000",
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
// app.use(express.urlencoded({ extended: true }));
if (IS_PRODUCTION) {
  app.use(csurf({ cookie: true }));
}

// Simple route for testing
app.get("/", (req: Request, res: Response) => {
  const wantedProduct = {
    category: "Electronics",
    name: "iPhone 14 Pro",
    units: "1",
    price: "800.00",
    region: "Conakry, Guinea",
  };
  getClosestProduct(wantedProduct);
  // res.cookie("test", false, {
  //   httpOnly: true,
  //   secure: IS_PRODUCTION,
  //   sameSite: "lax",
  // });
  res.json({
    message: "Welcome to the Node.js JWT Authentication application.",
  });
});

app.get(
  "/api/get-user",
  authMiddleware,
  async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    try {
      const user = await User.findById(userId);
      return res.json(user);
    } catch (error) {
      return res.status(400).json({ message: "Error retrieving user" });
    }
  }
);

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

// Connect to MongoDB and start the server
mongoose
  .connect(
    `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
  )
  .then(() => {
    console.log("Successfully connected to MongoDB.");
    server.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}.`);
    });
  })
  .catch((err) => {
    console.error("Connection error:", err);
    process.exit();
  });
