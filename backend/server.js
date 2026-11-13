import "dotenv/config";
import express from "express";
import cors from "cors";
import api from "./routes/api.js";

const app = express();

// FRONTEND_URL empty = allow all (fine for the hackathon).
// After deploying, set it to your Vercel link, e.g. https://impactx.vercel.app
const origins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
  : true;

app.use(cors({ origin: origins }));
app.use(express.json());

app.get("/", (req, res) => res.send("ClubFlow AI backend is running"));
app.use("/api", api);

app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
