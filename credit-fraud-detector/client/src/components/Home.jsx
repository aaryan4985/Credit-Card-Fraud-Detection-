import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Database, Cpu, Activity, Play, ActivitySquare, CheckCircle, AlertTriangle, TrendingUp, BarChart3, Brain } from 'lucide-react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

export default function Home() {
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [stats, setStats] = useState({ total: 0, fraud: 0, nonFraud: 0, avg_confidence: 0 });
  const [metrics, setMetrics] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, metricsRes] = await Promise.all([
        axios.get('http://localhost:4000/api/dashboard'),
        axios.get('http://localhost:4000/api/metrics')
      ]);
      setStats(dashboardRes.data);
      if (metricsRes.data.metrics && Object.keys(metricsRes.data.metrics).length > 0) {
        setMetrics(metricsRes.data.metrics);
      }
    } catch (err) {
      console.error("Data fetch error", err);
    }
  };

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
        fetchDashboardData();
      }
    } catch (error) {
      setIsTraining(false);
    }
  };

  const prepareModelData = () => {
    if (!metrics) return [];
    return Object.keys(metrics)
      .filter(k => !['training_time_seconds', 'total_samples', 'fraud_samples', 'non_fraud_samples'].includes(k))
      .map(modelName => ({
        name: modelName.length > 12 ? modelName.substring(0, 12) + '..' : modelName,
        Accuracy: Math.round((metrics[modelName].accuracy || 0) * 100),
        F1: Math.round((metrics[modelName].f1 || 0) * 100),
        ROC_AUC: Math.round((metrics[modelName].roc_auc || 0) * 100)
      }));
  };

  const preparePieData = () => {
    if (stats.total === 0) return [];
    return [
      { name: 'Fraud', value: stats.fraud },
      { name: 'Safe', value: stats.nonFraud }
    ];
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 max-w-6xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold text-xs uppercase tracking-widest animate-float">
          <ShieldAlert size={14} />
          <span>Enterprise-Grade Security Engine</span>
        </div>
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none">
          <span className="text-white">FINSHIELD</span> <br />
          <span className="gradient-text uppercase">
            AI RADAR
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
          Advanced real-time credit fraud detection pipeline leveraging ensemble learning and neural architecture for zero-day threat interception.
        </p>
        
        <div className="pt-8 flex flex-col sm:flex-row gap-6 justify-center">
          <Link
            to="/predict"
            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-2xl shadow-indigo-500/40 transition-all hover:-translate-y-1 active:scale-95"
          >
            LAUNCH ANALYSIS
          </Link>
          <button
            onClick={startTraining}
            disabled={isTraining}
            className="px-10 py-4 glass-panel hover:bg-white/10 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            {isTraining ? (
              <span className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                NEURAL TRAINING...
              </span>
            ) : (
              <>
                <Play size={20} fill="currentColor" />
                RE-SYNCHRONIZE MODELS
              </>
            )}
          </button>
        </div>
      </div>

      {/* Training Status */}
      {trainingStatus && (
        <div className="w-full glass-panel p-8 max-w-3xl transform transition-all animate-in zoom-in duration-500">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Pipeline Status</h3>
              <p className="text-2xl font-black text-white">{trainingStatus.progress}% Complete</p>
            </div>
            <p className="text-indigo-400 text-sm font-bold italic">{trainingStatus.message}</p>
          </div>
          <div className="w-full bg-slate-800/50 rounded-full h-3 p-0.5 overflow-hidden border border-white/5">
            <div 
              className="bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 h-full rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
              style={{ width: `${trainingStatus.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
          <div className="glass-panel p-6 text-center border-b-2 border-b-indigo-500/50">
             <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Processed</span>
             <span className="text-4xl font-black text-white">{stats.total?.toLocaleString()}</span>
          </div>
          <div className="glass-panel p-6 text-center border-b-2 border-b-red-500/50">
             <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Intercepted</span>
             <span className="text-4xl font-black text-red-500">{stats.fraud?.toLocaleString()}</span>
          </div>
          <div className="glass-panel p-6 text-center border-b-2 border-b-green-500/50">
             <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Clean</span>
             <span className="text-4xl font-black text-green-500">{stats.nonFraud?.toLocaleString()}</span>
          </div>
          <div className="glass-panel p-6 text-center border-b-2 border-b-purple-500/50">
             <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Confidence</span>
             <span className="text-4xl font-black text-purple-400">{(stats.avg_confidence * 100).toFixed(0)}%</span>
          </div>
      </div>

      {/* Feature Tech Cards */}
      <div className="grid md:grid-cols-3 gap-8 w-full">
        <div className="glass-panel p-10 space-y-6 hover:bg-white/5 transition-all group">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
            <Database size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Unified Corpus</h3>
            <p className="text-slate-400 leading-relaxed">High-fidelity training on anonymized European cardholders with multi-strata SMOTE balancing.</p>
          </div>
        </div>
        
        <div className="glass-panel p-10 space-y-6 hover:bg-white/5 transition-all group">
          <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <Cpu size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Ensemble X-Core</h3>
            <p className="text-slate-400 leading-relaxed">Federated analysis across 9 distinct ML architectures including XGBoost and Deep ANN.</p>
          </div>
        </div>
        
        <div className="glass-panel p-10 space-y-6 hover:bg-white/5 transition-all group border-r-indigo-500/20 border-r-2">
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
            <Activity size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter">Quantum Drift</h3>
            <p className="text-slate-400 leading-relaxed">Instantaneous feature vector analysis with 1.5s cold-start prediction latency.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
