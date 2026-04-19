# Credit Card Fraud Detector - Setup Guide

## Prerequisites

Before starting, ensure you have:

- **Node.js** (v18+) - [Download](https://nodejs.org/)
- **Python** (v3.11+) - [Download](https://www.python.org/)
- **MongoDB** (optional) - For prediction logging

---

## Step 1: Clone & Navigate

```powershell
cd c:\Users\Aaryan Pradhan\coding\card
cd credit-fraud-detector
```

---

## Step 2: Set Up Python Environment (ML Service)

### Create virtual environment

```powershell
cd ml-service

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Mac/Linux)
# source venv/bin/activate
```

### Install Python dependencies

```powershell
pip install flask flask-cors scikit-learn pandas numpy imbalanced-learn tensorflow xgboost lightgbm joblib
```

> **Note**: TensorFlow is ~350MB and may take several minutes to download.

---

## Step 3: Set Up Node.js (Server)

```powershell
cd ..\server

# Install dependencies
npm install

# Install additional packages if missing
npm install express cors dotenv mongoose axios
```

---

## Step 4: Set Up React (Client)

```powershell
cd ..\client

# Install dependencies
npm install
```

---

## Step 5: Start the Application

You need **3 separate terminals** (or use `start.ps1`):

### Terminal 1: ML Service (Port 5000)

```powershell
cd ml-service
.\venv\Scripts\python app.py
```

Expected output:

```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

### Terminal 2: Backend Server (Port 4000)

```powershell
cd server
node server.js
```

Expected output:

```
Server running on port 4000
ML Service: http://localhost:5000
```

### Terminal 3: Frontend Client (Port 5173)

```powershell
cd client
npm run dev
```

Expected output:

```
  VITE v8.x.x  ready in 200 ms
  ➜  Local:   http://localhost:5173/
```

---

## Step 6: Use the Application

1. Open **http://localhost:5173** in your browser
2. Go to **Home** tab and click **"Train Models"**
3. Wait for training to complete (~2-5 minutes)
4. Go to **Dashboard** to see model comparisons
5. Use **Prediction** tab to test transactions

---

## Quick Start Script

Instead of manual setup, run:

```powershell
cd credit-fraud-detector
.\start.ps1
```

This opens 3 PowerShell windows with all services running.

---

## Troubleshooting

### Port Already in Use

```powershell
# Find process using port
netstat -ano | findstr :5000

# Kill process
taskkill /PID <PID> /F
```

### MongoDB Connection Error

- MongoDB is optional - predictions will work without it
- To enable, add `MONGO_URI=mongodb://localhost:27017/frauddetector` to `.env`

### TensorFlow Errors

```powershell
# Reinstall TensorFlow
pip uninstall tensorflow
pip install tensorflow
```

### Node Modules Issues

```powershell
# Clear cache and reinstall
cd client
rm -rf node_modules package-lock.json
npm install
```

---

## API Testing with cURL

### Check if services are running

```powershell
# ML Service health
curl http://localhost:5000/model-status

# Server health
curl http://localhost:4000/api/health
```

### Train models

```powershell
curl -X POST http://localhost:4000/api/train
```

### Make prediction

```powershell
curl -X POST http://localhost:4000/api/predict -H "Content-Type: application/json" -d "{\"features\":[100000,-1.2,1.5,-0.8,2.1,-0.5,0.3,-1.1,0.7,-0.2,1.3,-0.9,0.5,-1.4,0.8,-0.3,1.1,-0.6,0.2,-1.5,0.9,-0.4,1.2,-0.7,0.1,-1.0,0.6,-0.8,1.4,150.00]}"
```

---

## Project Files Created

| File              | Description                    |
| ----------------- | ------------------------------ |
| `PROJECT_INFO.md` | Complete project documentation |
| `SETUP.md`        | This step-by-step guide        |
| `README.md`       | Original project readme        |

---

## Next Steps

After running the project:

1. Train models from the UI
2. Compare model performance in Dashboard
3. View feature importance
4. Check ANN training history
5. Make predictions with different confidence levels
