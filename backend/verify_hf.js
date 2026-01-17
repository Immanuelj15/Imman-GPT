import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const token = process.env.HF_TOKEN;

const configs = [
    { name: "OPT-125m", url: "https://router.huggingface.co/hf-inference/models/facebook/opt-125m" },
    { name: "Flan-T5 Small", url: "https://router.huggingface.co/hf-inference/models/google/flan-t5-small" },
    { name: "GPT-2", url: "https://router.huggingface.co/hf-inference/models/gpt2" },
    { name: "SmolLM-135M", url: "https://router.huggingface.co/hf-inference/models/HuggingFaceTB/SmolLM-135M-Instruct" },
    { name: "DialoGPT-medium", url: "https://router.huggingface.co/hf-inference/models/microsoft/DialoGPT-medium" }
];

import fs from 'fs';

async function log(msg) {
    console.log(msg);
    fs.appendFileSync('verify_log.txt', msg + '\n');
}

async function testConfig(config) {
    try {
        await log(`Testing ${config.name}...`);
        const r = await axios.post(
            config.url,
            { inputs: "Hello" },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                timeout: 10000
            }
        );
        await log(`✅ ${config.name} SUCCESS`);
        return true;
    } catch (e) {
        await log(`❌ ${config.name} FAILED: ${e.response?.status} - ${e.response?.data?.error || e.message}`);
        return false;
    }
}

async function runTests() {
    fs.writeFileSync('verify_log.txt', ''); // clear log
    await log("Starting HF API Tests...");
    for (const config of configs) {
        await testConfig(config);
    }
}

runTests();
