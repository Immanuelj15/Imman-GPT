import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const token = process.env.HF_TOKEN;

const models = [
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5",
    "CompVis/stable-diffusion-v1-4",
    "prompthero/openjourney",
    "stabilityai/stable-diffusion-2-1"
];

import fs from 'fs';

async function log(msg) {
    console.log(msg);
    fs.appendFileSync('verify_image_log.txt', msg + '\n');
}

async function testImage(model) {
    const url = `https://router.huggingface.co/hf-inference/models/${model}`;
    await log(`Testing Image Model: ${model}...`);
    try {
        const r = await axios.post(
            url,
            { inputs: "A futuristic city" },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "image/png"
                },
                responseType: "arraybuffer"
            }
        );
        await log(`✅ ${model} SUCCESS (Size: ${r.data.length} bytes)`);
    } catch (e) {
        const errMsg = e.response?.data ? JSON.stringify(e.response.data.toString()) : e.message;
        await log(`❌ ${model} FAILED: ${e.response?.status} - ${errMsg}`);
    }
}

async function runTests() {
    fs.writeFileSync('verify_image_log.txt', '');
    for (const m of models) {
        await testImage(m);
    }
}

runTests();
