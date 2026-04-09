require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

// Optional MongoDB setup
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log('MongoDB Connected'))
        .catch(err => console.log('MongoDB connection error:', err));
}

// Simple Log Schema
const logSchema = new mongoose.Schema({
    features: Array,
    prediction: String,
    confidence: Number,
    timestamp: { type: Date, default: Date.now }
});

let Log;
try {
    Log = mongoose.model('Log', logSchema);
} catch (e) {
    Log = mongoose.model('Log');
}

app.post('/api/predict', async (req, res) => {
    try {
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict`, req.body);
        const predictionData = mlResponse.data;

        // Log to MongoDB if connected
        if (mongoose.connection.readyState === 1 && predictionData && !predictionData.error) {
            const newLog = new Log({
                features: req.body.features,
                prediction: predictionData.prediction,
                confidence: predictionData.confidence
            });
            await newLog.save();
        }

        res.json(predictionData);
    } catch (error) {
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Failed to connect to ML service' });
        }
    }
});

app.post('/api/train', async (req, res) => {
    try {
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/train`);
        res.json(mlResponse.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to start training' });
    }
});

app.get('/api/status', async (req, res) => {
    try {
        const mlResponse = await axios.get(`${ML_SERVICE_URL}/model-status`);
        res.json(mlResponse.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get status' });
    }
});

app.get('/api/dashboard', async (req, res) => {
    if (mongoose.connection.readyState !== 1) {
        return res.json({ total: 0, fraud: 0, nonFraud: 0 });
    }
    try {
        const total = await Log.countDocuments();
        const fraud = await Log.countDocuments({ prediction: 'Fraud' });
        const nonFraud = await Log.countDocuments({ prediction: 'Not Fraud' });
        res.json({ total, fraud, nonFraud });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get dashboard stats' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
