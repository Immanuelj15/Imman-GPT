import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const token = process.env.HF_TOKEN;

async function testOpenAI(model) {
    const url = "https://router.huggingface.co/v1/chat/completions";
    console.log(`Testing OpenAI Endpoint for ${model}...`);
    try {
        const r = await axios.post(
            url,
            {
                model: model,
                messages: [{ role: "user", content: "Hello!" }],
                max_tokens: 10
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );
        console.log(`✅ ${model} SUCCESS:`, r.data.choices[0].message.content);
    } catch (e) {
        console.error(`❌ ${model} FAILED: ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
    }
}

// Try a few models that support chat
testOpenAI("microsoft/Phi-3-mini-4k-instruct");
testOpenAI("HuggingFaceH4/zephyr-7b-beta");
testOpenAI("TinyLlama/TinyLlama-1.1B-Chat-v1.0");
