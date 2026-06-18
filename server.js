// server.ts
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
dotenv.config();
var app = express();
var PORT = process.env.PORT || 3e3;
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});
app.listen(PORT, () => {
  console.log(`Production server running on port ${PORT}`);
});
