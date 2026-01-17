import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module"; // Import createRequire
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";

const require = createRequire(import.meta.url); // Create require
const pdf = require("pdf-parse"); // Require pdf-parse

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = "uploads/";
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});
const upload = multer({ storage });

// Database Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/imman-gpt")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);

const modes = {
    coding: "You are Imman-GPT, an expert Coding Assistant. Your goal is to write clean, efficient, and bug-free code. Explanation should be clear and concise. Always prioritize modern best practices.",
    idea: "You are Imman-GPT, a Creative Idea Generator. Brainstorm innovative concepts, startup ideas, and unique solutions. Be inspiring, think outside the box, and provide actionable next steps.",
    placement: "You are Imman-GPT, a Placement Preparation Coach. Help users prepare for interviews, solve aptitude questions, review resumes, and practice technical interview problems. Be professional and motivating.",
    normal: "You are Imman-GPT, a friendly and helpful AI assistant. Engage in natural conversation, answer questions, and assist with general tasks."
};

// Text Chat
app.post("/chat", async (req, res) => {
    const { message, mode } = req.body;
    const systemPrompt = modes[mode] || modes.normal;

    try {
        const r = await axios.post(
            "https://router.huggingface.co/v1/chat/completions",
            {
                model: "Qwen/Qwen2.5-Coder-32B-Instruct",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                max_tokens: 500
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );
        res.json({ reply: r.data.choices[0].message.content });
    } catch (e) {
        console.error("HF Inference Error:", e.response ? e.response.data : e.message);
        const errorMessage = e.response?.data?.error?.message || e.response?.data?.error || e.message || "Unknown error";
        res.json({ reply: `Error from AI service: ${errorMessage}` });
    }
});

// Image Generation
app.post("/image", async (req, res) => {
    const { prompt } = req.body;
    // FLUX.1 performs best with natural descriptions, but we'll add minimal quality boosters
    const enhancedPrompt = `${prompt}, high quality, realistic`;

    try {
        const r = await axios.post(
            "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
            { inputs: enhancedPrompt },
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_TOKEN}`,
                    "Content-Type": "application/json",
                    "Accept": "image/png"
                },
                responseType: "arraybuffer"
            }
        );
        const base64 = Buffer.from(r.data).toString("base64");
        res.json({ image: `data:image/png;base64,${base64}` });
    } catch (e) {
        console.error("Image Gen Error:", e.response ? e.response.data.toString() : e.message);
        res.json({ error: "Image generation failed." });
    }
});

// File Upload & Analyze Endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = req.file.path;
    const fileType = req.file.mimetype;

    try {
        let content = "";
        let type = "file";

        // Document Analysis (PDF)
        if (fileType === "application/pdf") {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            content = data.text; // Extracted text
            type = "document";
        }
        // Text Files
        else if (fileType.startsWith("text/")) {
            content = fs.readFileSync(filePath, "utf8");
            type = "document";
        }
        // Images (Prepare for Vision/Editing)
        else if (fileType.startsWith("image/")) {
            content = `http://localhost:5000/${filePath.replace(/\\/g, "/")}`; // Return public URL
            type = "image";
        }

        res.json({
            message: "File uploaded successfully",
            url: content,
            type,
            originalName: req.file.originalname
        });

    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ error: "File processing failed" });
    }
});

app.listen(process.env.PORT || 5000, () => console.log("Backend running"));
