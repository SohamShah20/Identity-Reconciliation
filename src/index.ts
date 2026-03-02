import dotenv from "dotenv";
import express from "express";
import { prisma } from "./config/prisma";

dotenv.config();

prisma.$connect()
  .then(() => console.log("Database connected"))
  .catch(err => console.error("DB connection error:", err));

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bitespeed Identity Service Running");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});