# Imman-GPT

## Prerequisites
- Node.js installed

## How to Run

You need to open **two separate terminal windows**.

### 1. Start the Backend
Navigate to the backend folder and start the server:
```bash
cd backend
node index.js
```
The backend runs on `http://localhost:5000`.

### 2. Start the Frontend
In a new terminal, navigate to the frontend folder and start the React app:
```bash
cd frontend
npm run dev
```
The frontend usually runs on `http://localhost:5173`.

## Environment Variables
Ensure you have a `.env` file in the `backend` folder with your Hugging Face token:
```
HF_TOKEN=your_token_here
```
