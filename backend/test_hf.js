import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const token = process.env.HF_TOKEN;
// URL from index.js
const url = "https://router.huggingface.co/v1/chat/completions";

console.log("Token:", token ? "Exists (" + token.substring(0, 5) + "...)" : "Missing");

async function test() {
    try {
        console.log("Sending request to:", url);
        const r = await axios.post(
            url,
            {
                model: "Qwen/Qwen2.5-Coder-32B-Instruct",
                messages: [{ role: "user", content: "Hello" }],
                max_tokens: 10,
                stream: false
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log("Success:", r.data);
    } catch (e) {
        console.error("Error status:", e.response?.status);
        if (e.response?.data) {
            console.error("Error data:", JSON.stringify(e.response.data, null, 2));
        }
        console.error("Error message:", e.message);
    }
}

test();
