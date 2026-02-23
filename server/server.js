import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import {sequelize} from "./models/index.js";
import { apiRouter } from "./routes/index.js";

dotenv.config();

const app = express();

// Middlewares
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/", apiRouter)

// ruta test
app.get("/test", (req, res) => {
  res.json({ status: "Server is up and running" });
});

const PORT = process.env.PORT || 8080;

sequelize.sync({ alter: process.env.NODE_ENV === "development" })
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
