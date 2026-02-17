import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import {sequelize} from "./models/index.js";

import {router as authRouter} from "./routes/authRouter.js"

dotenv.config();

const app = express();

// Middlewares

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// dacă folosești cookies pentru JWT
import cookieParser from "cookie-parser";
app.use(cookieParser());

// API Routes
app.use("/auth", authRouter);

// Test route
app.get("/test", (req, res) => {
  res.json({ status: "Server is up and running" });
});

const PORT = process.env.PORT || 8080;

sequelize.sync({ alter: true })
  .then(() => {
    console.log("DB connection established and tables synced.");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database synchronization failed:", err);
  }
);
