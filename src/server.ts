import express, { Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import csurf from "csurf";

dotenv.config();

const app = express();

const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === "production") {
  app.use(csurf({ cookie: true }));
}

// Simple route for testing
app.get("/", (req: Request, res: Response) => {
  res.cookie("test", false, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({
    message: "Welcome to the Node.js JWT Authentication application.",
  });
});

app.get("/test", (req: Request, res: Response) => {
  const cookies = req.cookies;
  console.log(cookies);
  res.json(cookies);
});

// Routes
app.use("/api/auth", authRoutes);

// Connect to MongoDB and start the server
mongoose
  .connect(
    `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
  )
  .then(() => {
    console.log("Successfully connected to MongoDB.");
    app.listen(process.env.PORT, () => {
      console.log(`Server is running on port ${process.env.PORT}.`);
    });
  })
  .catch((err) => {
    console.error("Connection error:", err);
    process.exit();
  });
