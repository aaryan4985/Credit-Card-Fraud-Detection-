import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import axios from 'axios';

export default function Prediction() {
  const [formData, setFormData] = useState({
    time: '',
    amount: '',
    features: Array(28).fill('')
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const autoGenerate = () => {
    // Generate NORMAL transaction - typical legitimate transaction patterns
    // Normal transactions have: moderate amounts, V features near 0 (center of PCA space)
    const newFeatures = Array(28).fill(0).map(() => {
      // V1-V28: normal transactions cluster around 0 with small variance
      const base = (Math.random() - 0.5) * 1.5; // range roughly -0.75 to 0.75
      return base.toFixed(4);
    });
    setFormData({
      time: Math.floor(Math.random() * 150000 + 10000).toString(),
      amount: (Math.random() * 200 + 10).toFixed(2), // $10-$210 typical legitimate
      features: newFeatures
    });
  };
  
  const generateFraudList = () => {
    // Generate FRAUD transaction - anomalous patterns
    // Fraud has: high amounts, extreme V values (away from center of PCA space)
    const newFeatures = Array(28).fill(0).map((_, idx) => {
      // Make some features extreme (fraud detection patterns)
      // V1, V2, V3, V4, V5, V14, V17 are most important for fraud detection
      const importantFeatures = [0, 1, 2, 3, 12, 16, 17];
      if (importantFeatures.includes(idx)) {
        // Extreme values for important features
        return ((Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3)).toFixed(4);
      }
      // Other features also slightly more extreme than normal
      return ((Math.random() - 0.5) * 3).toFixed(4);
    });
    setFormData({
      time: Math.floor(Math.random() * 86400).toString(), // Any time
      amount: (Math.random() * 2000 + 500).toFixed(2), // $500-$2500 unusual high
      features: newFeatures
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    // Validate
    if (!formData.time || !formData.amount || formData.features.some(f => f === '')) {
      setError("Please fill all fields or use Auto-Generate.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        features: [
          parseFloat(formData.time),
          ...formData.features.map(f => parseFloat(f)),
          parseFloat(formData.amount)
        ]
      };
      
      const res = await axios.post('http://localhost:4000/api/predict', payload);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred during prediction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Transaction Analysis</h2>
        <p className="text-slate-400">Input transaction details or auto-generate for testing</p>
      </div>

      <div className="flex gap-4 justify-end">
        <button 
          onClick={autoGenerate}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          Generate Normal
        </button>
        <button 
          onClick={generateFraudList}
          className="px-4 py-2 bg-red-900/30 text-red-400 border border-red-500/30 hover:bg-red-900/50 rounded-lg text-sm font-medium transition-colors"
        >
          Generate Fraud
        </button>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Time (Seconds)</label>
            <input
              type="number"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
              placeholder="e.g. 120534"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Amount ($)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 outline-none focus:border-indigo-500"
              placeholder="e.g. 150.50"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300 border-b border-white/10 pb-2">V1 - V28 Principal Components</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {formData.features.map((val, idx) => (
              <div key={idx}>
                <label className="text-xs text-slate-500 mb-1 block">V{idx + 1}</label>
                <input
                  type="number"
                  step="any"
                  value={val}
                  onChange={(e) => handleFeatureChange(idx, e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-2 py-1 outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Predict Transaction'}
          </button>
          <button
            type="button"
            onClick={() => setFormData({ time: '', amount: '', features: Array(28).fill('') })}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <RotateCcw size={18} />
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className={`p-6 rounded-2xl border ${result.prediction === 'Fraud' ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'} flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative`}>
          {result.prediction === 'Fraud' && (
            <div className="absolute inset-0 bg-red-500/5 animate-pulse rounded-2xl pointer-events-none"></div>
          )}
          <div className="flex items-center gap-4 z-10">
            {result.prediction === 'Fraud' ? (
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                <AlertCircle size={32} />
              </div>
            ) : (
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                <CheckCircle2 size={32} />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-400">Analysis Result</p>
              <h3 className={`text-4xl font-black uppercase tracking-wider ${result.prediction === 'Fraud' ? 'text-red-500' : 'text-green-500'}`}>
                {result.prediction}
              </h3>
            </div>
          </div>
          
          <div className="text-center md:text-right z-10">
            <p className="text-sm font-medium text-slate-400 mb-1">Confidence Score</p>
            <div className="flex items-end gap-2 justify-center md:justify-end">
              <span className="text-5xl font-bold">{result.probability_percentage}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
