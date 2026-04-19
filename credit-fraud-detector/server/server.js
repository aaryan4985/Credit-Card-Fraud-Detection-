require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5000";

// MongoDB connection (optional)
if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log("MongoDB connection error:", err));
}

// Transaction Log Schema
const logSchema = new mongoose.Schema({
  features: Array,
  prediction: String,
  confidence: Number,
  model_used: String,
  amount: Number,
  timestamp: { type: Date, default: Date.now },
});

let Log;
try {
  Log = mongoose.model("Log", logSchema);
} catch (e) {
  Log = mongoose.model("Log");
}

// ==================== ML Service Proxy Endpoints ====================

// Train models
app.post("/api/train", async (req, res) => {
  try {
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/train`);
    res.json(mlResponse.data);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to start training", details: error.message });
  }
});

// Get training status
app.get("/api/status", async (req, res) => {
  try {
    const mlResponse = await axios.get(`${ML_SERVICE_URL}/model-status`);
    res.json(mlResponse.data);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get status", details: error.message });
  }
});

// Get all models
app.get("/api/models", async (req, res) => {
  try {
    const mlResponse = await axios.get(`${ML_SERVICE_URL}/models`);
    res.json(mlResponse.data);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get models", details: error.message });
  }
});

// Get comprehensive metrics
app.get("/api/metrics", async (req, res) => {
  try {
    const mlResponse = await axios.get(`${ML_SERVICE_URL}/metrics`);
    res.json(mlResponse.data);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get metrics", details: error.message });
  }
});

// Get feature importance
app.get("/api/feature-importance", async (req, res) => {
  try {
    const mlResponse = await axios.get(`${ML_SERVICE_URL}/feature-importance`);
    res.json(mlResponse.data);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to get feature importance",
        details: error.message,
      });
  }
});

// Get training history (for ANN)
app.get("/api/training-history", async (req, res) => {
  try {
    const mlResponse = await axios.get(`${ML_SERVICE_URL}/training-history`);
    res.json(mlResponse.data);
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to get training history",
        details: error.message,
      });
  }
});

// Single prediction
app.post("/api/predict", async (req, res) => {
  try {
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, req.body);
    const predictionData = mlResponse.data;

    // Log to MongoDB if connected
    if (
      mongoose.connection.readyState === 1 &&
      predictionData &&
      !predictionData.error
    ) {
      const newLog = new Log({
        features: req.body.features,
        prediction: predictionData.prediction,
        confidence: predictionData.confidence,
        model_used: predictionData.model_used,
        amount: req.body.features ? req.body.features[29] : null,
      });
      await newLog.save();
    }

    res.json(predictionData);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res
        .status(500)
        .json({
          error: "Failed to connect to ML service",
          details: error.message,
        });
    }
  }
});

// Batch predictions
app.post("/api/predict-batch", async (req, res) => {
  try {
    const mlResponse = await axios.post(
      `${ML_SERVICE_URL}/predict-batch`,
      req.body,
    );
    res.json(mlResponse.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res
        .status(500)
        .json({
          error: "Failed to connect to ML service",
          details: error.message,
        });
    }
  }
});

// ==================== Dashboard & Analytics Endpoints ====================

// Get dashboard statistics
app.get("/api/dashboard", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    // Return mock data if MongoDB not connected
    return res.json({
      total: 0,
      fraud: 0,
      nonFraud: 0,
      avg_confidence: 0,
      recent_predictions: [],
    });
  }
  try {
    const total = await Log.countDocuments();
    const fraud = await Log.countDocuments({ prediction: "Fraud" });
    const nonFraud = await Log.countDocuments({ prediction: "Not Fraud" });

    const confidenceAgg = await Log.aggregate([
      { $group: { _id: null, avg: { $avg: "$confidence" } } },
    ]);

    const recent = await Log.find().sort({ timestamp: -1 }).limit(10);

    res.json({
      total,
      fraud,
      nonFraud,
      avg_confidence: confidenceAgg[0]?.avg || 0,
      recent_predictions: recent,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get dashboard stats", details: error.message });
  }
});

// Get prediction history with pagination
app.get("/api/history", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  if (mongoose.connection.readyState !== 1) {
    return res.json({
      predictions: [],
      total: 0,
      page,
      totalPages: 0,
    });
  }

  try {
    const predictions = await Log.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Log.countDocuments();

    res.json({
      predictions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get history", details: error.message });
  }
});

// Get analytics by time period
app.get("/api/analytics/time", async (req, res) => {
  const period = req.query.period || "day"; // day, hour, week

  if (mongoose.connection.readyState !== 1) {
    return res.json({ labels: [], fraud: [], nonFraud: [] });
  }

  try {
    let groupBy;
    switch (period) {
      case "hour":
        groupBy = { $hour: "$timestamp" };
        break;
      case "week":
        groupBy = { $week: "$timestamp" };
        break;
      default:
        groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
    }

    const fraudByTime = await Log.aggregate([
      { $match: { prediction: "Fraud" } },
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const nonFraudByTime = await Log.aggregate([
      { $match: { prediction: "Not Fraud" } },
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      labels: fraudByTime.map((x) => x._id),
      fraud: fraudByTime.map((x) => x.count),
      nonFraud: nonFraudByTime.map((x) => x.count),
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get time analytics", details: error.message });
  }
});

// Get model performance comparison
app.get("/api/analytics/models", async (req, res) => {
  try {
    const mlResponse = await axios.get(`${ML_SERVICE_URL}/metrics`);
    const metrics = mlResponse.data.metrics;

    // Extract key metrics for comparison
    const modelComparison = Object.keys(metrics)
      .filter(
        (k) =>
          k !== "training_time_seconds" &&
          k !== "total_samples" &&
          k !== "fraud_samples" &&
          k !== "non_fraud_samples",
      )
      .map((model) => ({
        name: model,
        accuracy: metrics[model]?.accuracy || 0,
        precision: metrics[model]?.precision || 0,
        recall: metrics[model]?.recall || 0,
        f1: metrics[model]?.f1 || 0,
        roc_auc: metrics[model]?.roc_auc || 0,
        cv_score: metrics[model]?.cv_score || 0,
      }));

    res.json({ models: modelComparison });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to get model analytics", details: error.message });
  }
});

// Clear prediction history
app.delete("/api/history", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json({ message: "MongoDB not connected" });
  }

  try {
    await Log.deleteMany({});
    res.json({ message: "History cleared successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to clear history", details: error.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`ML Service: ${ML_SERVICE_URL}`);
});
