# Credit Card Fraud Detector - Project Overview

## 📁 Project Structure

```
credit-fraud-detector/
├── client/                    # React Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx  # Analytics & model comparison
│   │   │   ├── Home.jsx       # Training interface
│   │   │   ├── Navbar.jsx     # Navigation
│   │   │   └── Prediction.jsx # Transaction prediction
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/                    # Node.js Backend API
│   ├── server.js              # Express server with all endpoints
│   └── package.json
│
├── ml-service/                # Python ML Service (Flask)
│   ├── app.py                 # Flask API endpoints
│   ├── train.py               # ML training pipeline
│   ├── venv/                  # Python virtual environment
│   └── requirements.txt
│
├── dataset/                   # Training data
│   └── creditcard.csv         # (auto-generated if missing)
│
├── models/                    # Trained model files
│   ├── *.pkl                  # Scikit-learn models
│   ├── *.h5                   # Keras neural network
│   └── scaler.pkl             # Feature scaler
│
├── start.ps1                  # Quick start script
└── README.md                  # This file
```

## 🧠 ML Models Available

The system trains **9 different models** for comparison:

| Model               | Type           | Key Features                            |
| ------------------- | -------------- | --------------------------------------- |
| Logistic Regression | Linear         | L2 regularization, hyperparameter tuned |
| Random Forest       | Ensemble       | 100-200 trees, GridSearchCV tuning      |
| Gradient Boosting   | Ensemble       | 100 estimators, learning rate 0.1       |
| XGBoost             | Ensemble       | Gradient boosting, GPU-compatible       |
| LightGBM            | Ensemble       | Fast training, leaf-wise growth         |
| SVM                 | Kernel         | RBF kernel, probability estimation      |
| KNN                 | Instance-based | k=5, distance-weighted                  |
| Deep Learning (ANN) | Neural Network | 128→64→32→16→1, BatchNorm, Dropout      |
| Ensemble (Voting)   | Meta-ensemble  | Soft voting from top 3-5 models         |

## 📊 Features Engineered

- **Original**: Time, Amount, V1-V28 (PCA features)
- **Engineered**:
  - `log_amount` - Log-transformed amount
  - `amount_squared` - Amount squared
  - `time_hour` - Hour of transaction
  - `time_is_night` - Night transaction flag
  - `normAmount`, `normTime`, `normLogAmount` - Scaled features

## 🔧 API Endpoints

### ML Service (Port 5000)

```
POST /train              - Start model training
GET  /model-status       - Get training progress & metrics
GET  /models             - List available trained models
GET  /metrics            - Comprehensive metrics for all models
GET  /feature-importance - Feature importance from tree models
GET  /training-history   - ANN training curves
POST /predict            - Single transaction prediction
POST /predict-batch      - Batch prediction
```

### Server API (Port 4000)

```
POST /api/train          - Proxy to ML service
GET  /api/status         - Training status
GET  /api/models         - Available models
GET  /api/metrics        - Model metrics
GET  /api/feature-importance
GET  /api/training-history
POST /api/predict        - Make prediction
POST /api/predict-batch  - Batch predictions
GET  /api/dashboard      - Dashboard statistics
GET  /api/history        - Prediction history (paginated)
GET  /api/analytics/time - Time-based analytics
GET  /api/analytics/models - Model comparison
GET  /api/health         - Health check
```

## 🎯 Sample Requests

### 1. Train Models

```bash
curl -X POST http://localhost:4000/api/train
```

### 2. Get Training Status

```bash
curl http://localhost:4000/api/status
```

### 3. Make a Prediction (30 features)

```bash
curl -X POST http://localhost:4000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": [
      100000,  # Time
      -1.2, 1.5, -0.8, 2.1, -0.5,  # V1-V5
      0.3, -1.1, 0.7, -0.2, 1.3,   # V6-V10
      -0.9, 0.5, -1.4, 0.8, -0.3,  # V11-V15
      1.1, -0.6, 0.2, -1.5, 0.9,   # V16-V20
      -0.4, 1.2, -0.7, 0.1, -1.0,  # V21-V25
      0.6, -0.8, 1.4,              # V26-V28
      150.00                       # Amount
    ]
  }'
```

### 4. Batch Predictions

```bash
curl -X POST http://localhost:4000/api/predict-batch \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [
      [100000, -1.2, 1.5, -0.8, 2.1, -0.5, 0.3, -1.1, 0.7, -0.2, 1.3, -0.9, 0.5, -1.4, 0.8, -0.3, 1.1, -0.6, 0.2, -1.5, 0.9, -0.4, 1.2, -0.7, 0.1, -1.0, 0.6, -0.8, 1.4, 150.00],
      [150000, 0.5, -0.3, 1.2, -0.8, 0.9, -1.1, 0.4, -0.6, 1.5, -0.2, 0.8, -1.3, 0.6, -0.4, 1.1, -0.7, 0.3, -1.0, 0.5, -0.9, 1.4, -0.1, 0.7, -1.2, 0.2, -0.5, 1.3, -0.8, 75.50]
    ]
  }'
```

### 5. Get Model Metrics

```bash
curl http://localhost:4000/api/metrics
```

### 6. Get Feature Importance

```bash
curl http://localhost:4000/api/feature-importance
```

### 7. Get Dashboard Stats

```bash
curl http://localhost:4000/api/dashboard
```

## 📈 Metrics Returned

Each model returns:

```json
{
  "accuracy": 0.95,
  "precision": 0.88,
  "recall": 0.82,
  "f1": 0.85,
  "roc_auc": 0.94,
  "mcc": 0.78,
  "confusion_matrix": [
    [980, 20],
    [15, 85]
  ],
  "tn": 980,
  "fp": 20,
  "fn": 15,
  "tp": 85,
  "specificity": 0.98,
  "cv_score": 0.92
}
```

## 🚀 Quick Start

Run the entire application:

```powershell
cd credit-fraud-detector
.\start.ps1
```

Or manually:

```powershell
# Terminal 1 - ML Service
cd ml-service
.\venv\Scripts\python app.py

# Terminal 2 - Server
cd server
node server.js

# Terminal 3 - Client
cd client
npm run dev
```

Then open **http://localhost:5173** in your browser.
