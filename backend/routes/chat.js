import express from "express";
import Chat from "../models/Chat.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Get all chats for the user (Sidebar list)
router.get("/", verifyToken, async (req, res) => {
    try {
        const chats = await Chat.find({ userId: req.user.id })
            .sort({ updatedAt: -1 })
            .select("title updatedAt"); // Only return title and ID for sidebar
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// Get a specific chat (Load messages)
router.get("/:id", verifyToken, async (req, res) => {
    try {
        const chat = await Chat.findOne({ _id: req.params.id, userId: req.user.id });
        if (!chat) return res.status(404).json({ error: "Chat not found" });
        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// Create a new chat or add message to existing chat
router.post("/", verifyToken, async (req, res) => {
    const { chatId, role, text, image } = req.body;

    try {
        let chat;
        if (chatId) {
            // Update existing chat
            chat = await Chat.findOne({ _id: chatId, userId: req.user.id });
            if (!chat) return res.status(404).json({ error: "Chat not found" });

            chat.messages.push({ role, text, image });
            chat.updatedAt = Date.now();
        } else {
            // Create new chat
            // First 30 chars of message as title
            const title = text.substring(0, 30) + (text.length > 30 ? "..." : "");
            chat = new Chat({
                userId: req.user.id,
                title,
                messages: [{ role, text, image }]
            });
        }

        await chat.save();
        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// Update Chat Title (Rename)
router.put("/:id", verifyToken, async (req, res) => {
    try {
        const { title } = req.body;
        const chat = await Chat.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { title, updatedAt: Date.now() },
            { new: true }
        );
        if (!chat) return res.status(404).json({ error: "Chat not found" });
        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// Delete a chat
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        res.json({ message: "Chat deleted" });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

export default router;
