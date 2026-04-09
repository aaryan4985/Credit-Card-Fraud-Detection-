# Credit Card Fraud Detection Pipeline

A full-stack application for detecting credit card fraud using Machine Learning (Logistic Regression, Random Forest) and Deep Learning (Keras/TensorFlow).

## Tech Stack
- Frontend: React + Vite + TailwindCSS + Recharts
- Backend Middleware: Node.js + Express
- ML Service: Python + Flask + Scikit-Learn + TensorFlow
- Database: MongoDB (optional, for prediction logging)

## Folder Structure
- `client/`: React Web Application
- `server/`: Node.js Express Server for middleware API
- `ml-service/`: Flask REST API and ML Training Service
- `models/`: Saved highly accurate trained ML and DL models
- `dataset/`: Where `creditcard.csv` dataset is expected

## Getting Started

### 1. ML Service (Python)
Navigate to \`ml-service\`:
\`\`\`bash
cd ml-service
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python app.py
\`\`\`
*(Runs on port 5000)*

### 2. Backend Server (Node.js)
Navigate to \`server\`:
\`\`\`bash
cd server
npm install
# Ensure you have a MongoDB instance running or uncomment MONGO_URI in .env
npm run dev
\`\`\`
*(Runs on port 4000)*

### 3. Frontend Client (React)
Navigate to \`client\`:
\`\`\`bash
cd client
npm install
npm run dev
\`\`\`
*(Runs on port 5173 typically)*

## Usage
1. Open the React application.
2. Go to the Home Page and click **"Train Models"**. Wait for the process to complete (it handles preprocessing, SMOTE for class imbalance, and training LR, RF, and ANN models).
3. Check the **Dashboard** to view model comparisons and confusion matrices.
4. Go to **Predict** to test transactions. Use the auto-generate buttons to simulate valid and fraudulent transactions.
