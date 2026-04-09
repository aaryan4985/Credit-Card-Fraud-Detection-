import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Database, Cpu, Activity, Play } from 'lucide-react';
import axios from 'axios';

export default function Home() {
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [isTraining, setIsTraining] = useState(false);

  const startTraining = async () => {
    try {
      setIsTraining(true);
      await axios.post('http://localhost:4000/api/train');
      checkStatus();
    } catch (err) {
      console.error(err);
      setIsTraining(false);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await axios.get('http://localhost:4000/api/status');
      setTrainingStatus(res.data);
      if (res.data.is_training) {
        setTimeout(checkStatus, 3000);
      } else {
        setIsTraining(false);
      }
    } catch (error) {
      setIsTraining(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 max-w-5xl mx-auto space-y-16">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium mb-4">
          <ShieldAlert size={18} />
          <span>Advanced Machine Learning Pipeline</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Credit Card <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
            Fraud Detection
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Powered by Logistic Regression, Random Forests, and Deep Neural Networks. 
          Upload transactions and detect anomalous behavior with high precision.
        </p>
        
        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/predict"
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all w-full md:w-auto"
          >
            Start Predicting
          </Link>
          <button
            onClick={startTraining}
            disabled={isTraining}
            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold border border-slate-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50 w-full md:w-auto"
          >
            {isTraining ? (
              <span className="animate-pulse">Training in progress...</span>
            ) : (
              <>
                <Play size={20} />
                <span>Train Models</span>
              </>
            )}
          </button>
        </div>
      </div>

      {trainingStatus && (
        <div className="w-full glass-panel p-6 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Training Status</h3>
            <span className="text-sm px-3 py-1 bg-slate-800 rounded-full text-slate-300">
              {trainingStatus.progress}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 mb-4">
            <div 
              className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${trainingStatus.progress}%` }}
            ></div>
          </div>
          <p className="text-slate-400 animate-pulse">{trainingStatus.message}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 w-full">
        <div className="glass-panel p-6 space-y-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
            <Database size={24} />
          </div>
          <h3 className="text-xl font-bold">Kaggle Dataset</h3>
          <p className="text-slate-400">Trained on anonymized real-world European cardholder transactions with SMOTE balancing.</p>
        </div>
        
        <div className="glass-panel p-6 space-y-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
            <Cpu size={24} />
          </div>
          <h3 className="text-xl font-bold">Deep Learning</h3>
          <p className="text-slate-400">Utilizes TensorFlow / Keras for detecting complex non-linear fraudulent patterns.</p>
        </div>
        
        <div className="glass-panel p-6 space-y-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400">
            <Activity size={24} />
          </div>
          <h3 className="text-xl font-bold">Real-time Inference</h3>
          <p className="text-slate-400">Instant prediction via robust Flask API and Node.js middleware logging to MongoDB.</p>
        </div>
      </div>
    </div>
  );
}
