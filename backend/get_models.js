import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const token = process.env.HF_TOKEN;

async function getModels() {
    const url = "https://router.huggingface.co/v1/models";
    console.log(`Getting supported models from ${url}...`);
    try {
        const r = await axios.get(
            url,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log(`✅ Models:`, r.data.data.map(m => m.id));
    } catch (e) {
        console.error(`❌ FAILED: ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
    }
}

getModels();
