
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("ClubFlow AI Backend Running!");
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "success",
    message: "Backend working correctly"
  });
});

app.listen(5000, () => {
  console.log("Backend running on port 5000");
});
