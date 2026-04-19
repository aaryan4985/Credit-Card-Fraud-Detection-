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
    <div className="flex flex-col items-center justify-center py-8 px-4 max-w-6xl mx-auto space-y-10">
      {/* Header Section */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium">
          <ShieldAlert size={18} />
          <span>Advanced Machine Learning Pipeline</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Credit Card <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
            Fraud Detection
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Powered by 9 ML models including XGBoost, LightGBM, and Deep Neural Networks.
        </p>
        
        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/predict"
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all"
          >
            Start Predicting
          </Link>
          <button
            onClick={startTraining}
            disabled={isTraining}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold border border-slate-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isTraining ? (
              <span className="animate-pulse">Training...</span>
            ) : (
              <>
                <Play size={20} />
                <span>Train Models</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Training Status */}
      {trainingStatus && (
        <div className="w-full glass-panel p-5 max-w-2xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold">Training Progress</h3>
            <span className="text-sm px-3 py-1 bg-slate-800 rounded-full">{trainingStatus.progress}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
            <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${trainingStatus.progress}%` }}></div>
          </div>
          <p className="text-slate-400 text-sm animate-pulse">{trainingStatus.message}</p>
        </div>
      )}

      {/* Stats Tabs */}
      {metrics && Object.keys(metrics).length > 0 && (
        <div className="w-full space-y-6">
          {/* Tab Buttons */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'stats' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'models' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              Models
            </button>
            <button
              onClick={() => setActiveTab('confusion')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'confusion' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              Confusion Matrices
            </button>
          </div>

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-5 border-l-4 border-l-indigo-500">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-slate-400 text-sm">Total Predictions</h4>
                    <ActivitySquare className="text-indigo-500" size={18} />
                  </div>
                  <span className="text-3xl font-bold">{stats.total}</span>
                </div>
                
                <div className="glass-panel p-5 border-l-4 border-l-red-500">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-slate-400 text-sm">Fraud Detected</h4>
                    <AlertTriangle className="text-red-500" size={18} />
                  </div>
                  <span className="text-3xl font-bold text-red-400">{stats.fraud}</span>
                </div>
                
                <div className="glass-panel p-5 border-l-4 border-l-green-500">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-slate-400 text-sm">Safe Transactions</h4>
                    <CheckCircle className="text-green-500" size={18} />
                  </div>
                  <span className="text-3xl font-bold text-green-400">{stats.nonFraud}</span>
                </div>
                
                <div className="glass-panel p-5 border-l-4 border-l-purple-500">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-slate-400 text-sm">Avg Confidence</h4>
                    <TrendingUp className="text-purple-500" size={18} />
                  </div>
                  <span className="text-3xl font-bold text-purple-400">{stats.avg_confidence ? (stats.avg_confidence * 100).toFixed(1) : 0}%</span>
                </div>
              </div>

              {/* Pie Chart */}
              {stats.total > 0 && (
                <div className="glass-panel p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Brain size={20} className="text-green-400" />
                    Transaction Distribution
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={preparePieData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {preparePieData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Models Tab */}
          {activeTab === 'models' && (
            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-400" />
                Model Performance
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareModelData()} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="Accuracy" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="F1" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ROC_AUC" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Metrics Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-3 text-slate-400">Model</th>
                      <th className="text-right py-2 px-3 text-slate-400">Accuracy</th>
                      <th className="text-right py-2 px-3 text-slate-400">Precision</th>
                      <th className="text-right py-2 px-3 text-slate-400">Recall</th>
                      <th className="text-right py-2 px-3 text-slate-400">F1</th>
                      <th className="text-right py-2 px-3 text-slate-400">ROC-AUC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(metrics).filter(k => !['training_time_seconds', 'total_samples', 'fraud_samples', 'non_fraud_samples'].includes(k)).map(modelName => (
                      <tr key={modelName} className="border-b border-slate-800 hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-medium text-indigo-300">{modelName}</td>
                        <td className="text-right py-2 px-3">{(metrics[modelName].accuracy * 100).toFixed(1)}%</td>
                        <td className="text-right py-2 px-3">{(metrics[modelName].precision * 100).toFixed(1)}%</td>
                        <td className="text-right py-2 px-3">{(metrics[modelName].recall * 100).toFixed(1)}%</td>
                        <td className="text-right py-2 px-3">{(metrics[modelName].f1 * 100).toFixed(1)}%</td>
                        <td className="text-right py-2 px-3 text-green-400 font-bold">{(metrics[modelName].roc_auc * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Confusion Matrix Tab */}
          {activeTab === 'confusion' && (
            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold mb-4">Confusion Matrices</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.keys(metrics).filter(k => !['training_time_seconds', 'total_samples', 'fraud_samples', 'non_fraud_samples'].includes(k)).map(modelName => {
                  const cm = metrics[modelName].confusion_matrix;
                  return (
                    <div key={modelName} className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                      <h4 className="text-sm font-semibold text-indigo-300 mb-3 truncate">{modelName}</h4>
                      <div className="grid grid-cols-2 gap-2 text-center text-sm">
                        <div className="bg-green-500/10 text-green-400 p-2 rounded">
                          <div className="text-xs opacity-70">TN</div>
                          <span className="font-bold">{cm[0][0]}</span>
                        </div>
                        <div className="bg-red-500/10 text-red-400 p-2 rounded">
                          <div className="text-xs opacity-70">FP</div>
                          <span className="font-bold">{cm[0][1]}</span>
                        </div>
                        <div className="bg-red-500/10 text-red-500 p-2 rounded">
                          <div className="text-xs opacity-70">FN</div>
                          <span className="font-bold">{cm[1][0]}</span>
                        </div>
                        <div className="bg-green-500/10 text-green-500 p-2 rounded">
                          <div className="text-xs opacity-70">TP</div>
                          <span className="font-bold">{cm[1][1]}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-400 text-center">
                        ROC-AUC: {(metrics[modelName].roc_auc * 100).toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feature Cards */}
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
          <h3 className="text-xl font-bold">9 ML Models</h3>
          <p className="text-slate-400">Logistic Regression, Random Forest, XGBoost, LightGBM, SVM, KNN, Gradient Boosting, ANN, Ensemble.</p>
        </div>
        
        <div className="glass-panel p-6 space-y-4 hover:-translate-y-1 transition-transform">
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400">
            <Activity size={24} />
          </div>
          <h3 className="text-xl font-bold">Real-time Inference</h3>
          <p className="text-slate-400">Advanced feature engineering with 1.5s processing time for accurate fraud detection.</p>
        </div>
      </div>
    </div>
  );
}
