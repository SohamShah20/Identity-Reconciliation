import dotenv from "dotenv";
import express from "express";
import { prisma } from "./config/prisma";
import identifyRoutes from "./routes/identify.routes";

dotenv.config();

prisma.$connect()
  .then(() => console.log("Database connected"))
  .catch(err => console.error("DB connection error:", err));

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Bitespeed Identity Service Running");
});

app.use("/", identifyRoutes);

app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({
      message: err.message || "Internal Server Error",
    });
  }
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});