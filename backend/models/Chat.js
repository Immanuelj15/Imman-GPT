import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "New Chat" },
    messages: [
        {
            role: { type: String, required: true }, // 'user' or 'bot'
            text: { type: String, required: true },
            image: { type: String }, // Optional generated image URL/Base64
            timestamp: { type: Date, default: Date.now }
        }
    ],
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("Chat", ChatSchema);
