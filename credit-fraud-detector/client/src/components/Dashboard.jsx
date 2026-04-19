import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { ActivitySquare, CheckCircle, AlertTriangle, Database, TrendingUp, Brain, BarChart3 } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, fraud: 0, nonFraud: 0, avg_confidence: 0, recent_predictions: [] });
  const [metrics, setMetrics] = useState(null);
  const [featureImportance, setFeatureImportance] = useState(null);
  const [trainingHistory, setTrainingHistory] = useState(null);
  const [cvScores, setCvScores] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, metricsRes] = await Promise.all([
          axios.get('http://localhost:4000/api/dashboard'),
          axios.get('http://localhost:4000/api/metrics')
        ]);
        setStats(dashboardRes.data);
        if (metricsRes.data.metrics) {
          setMetrics(metricsRes.data.metrics);
          setFeatureImportance(metricsRes.data.feature_importance);
          setTrainingHistory(metricsRes.data.training_history);
          setCvScores(metricsRes.data.cross_validation_scores);
        }
      } catch (err) {
        console.error("Data fetch error", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const prepareModelComparisonData = () => {
    if (!metrics) return [];
    return Object.keys(metrics)
      .filter(k => !['training_time_seconds', 'total_samples', 'fraud_samples', 'non_fraud_samples'].includes(k))
      .map(modelName => ({
        name: modelName.length > 15 ? modelName.substring(0, 15) + '...' : modelName,
        fullName: modelName,
        Accuracy: Math.round((metrics[modelName].accuracy || 0) * 100),
        Precision: Math.round((metrics[modelName].precision || 0) * 100),
        Recall: Math.round((metrics[modelName].recall || 0) * 100),
        F1: Math.round((metrics[modelName].f1 || 0) * 100),
        ROC_AUC: Math.round((metrics[modelName].roc_auc || 0) * 100),
        MCC: Math.round((metrics[modelName].mcc || 0) * 100)
      }));
  };

  const prepareRadarData = () => {
    if (!metrics) return [];
    const models = Object.keys(metrics).filter(k => !['training_time_seconds', 'total_samples', 'fraud_samples', 'non_fraud_samples'].includes(k));
    if (models.length === 0) return [];
    
    return ['Accuracy', 'Precision', 'Recall', 'F1', 'ROC_AUC'].map(metric => {
      const data = { metric };
      models.forEach(model => {
        data[model] = Math.round((metrics[model][metric.toLowerCase()] || metrics[model][metric] || 0) * 100);
      });
      return data;
    });
  };

  const preparePieData = () => {
    if (stats.total === 0) return [];
    return [
      { name: 'Fraud', value: stats.fraud },
      { name: 'Non-Fraud', value: stats.nonFraud }
    ];
  };

  const getTopFeatures = () => {
    if (!featureImportance || Object.keys(featureImportance).length === 0) return [];
    const rfImportance = featureImportance['Random Forest'] || featureImportance['XGBoost'] || featureImportance['LightGBM'];
    if (!rfImportance) return [];
    
    return Object.entries(rfImportance)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([feature, importance]) => ({
        feature: feature.length > 12 ? feature.substring(0, 12) : feature,
        fullFeature: feature,
        importance: Math.round(importance * 100)
      }));
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-indigo-500">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-slate-400 font-medium">Total Predictions</h4>
            <ActivitySquare className="text-indigo-500" size={20} />
          </div>
          <span className="text-4xl font-bold">{stats.total}</span>
        </div>
        
        <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-red-500">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-slate-400 font-medium">Fraud Detected</h4>
            <AlertTriangle className="text-red-500" size={20} />
          </div>
          <span className="text-4xl font-bold text-red-400">{stats.fraud}</span>
        </div>
        
        <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-green-500">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-slate-400 font-medium">Safe Transactions</h4>
            <CheckCircle className="text-green-500" size={20} />
          </div>
          <span className="text-4xl font-bold text-green-400">{stats.nonFraud}</span>
        </div>
        
        <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-purple-500">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-slate-400 font-medium">Avg Confidence</h4>
            <TrendingUp className="text-purple-500" size={20} />
          </div>
          <span className="text-4xl font-bold text-purple-400">{stats.avg_confidence ? (stats.avg_confidence * 100).toFixed(1) : 0}%</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Model Comparison Bar Chart */}
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-400" />
            Model Performance Comparison
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prepareModelComparisonData()} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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
        </div>

        {/* Fraud Distribution Pie Chart */}
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Brain size={20} className="text-green-400" />
            Transaction Distribution
          </h3>
          <div className="h-72 flex items-center justify-center">
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={preparePieData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
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
            ) : (
              <p className="text-slate-400">No prediction data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Confusion Matrices */}
      {metrics && (
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4">Confusion Matrices</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
  );

  const renderModels = () => (
    <div className="space-y-6">
      {/* Radar Chart for model comparison */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-bold mb-4">Model Comparison Radar</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={prepareRadarData()}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="metric" stroke="#94a3b8" />
              {Object.keys(metrics || {}).filter(k => !['training_time_seconds', 'total_samples', 'fraud_samples', 'non_fraud_samples'].includes(k)).slice(0, 5).map((model, idx) => (
                <Radar
                  key={model}
                  name={model}
                  dataKey={model}
                  stroke={COLORS[idx]}
                  fill={COLORS[idx]}
                  fillOpacity={0.3}
                />
              ))}
              <Legend />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cross-Validation Scores */}
      {cvScores && Object.keys(cvScores).length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4">Cross-Validation Scores (5-Fold)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(cvScores).map(([model, score]) => (
              <div key={model} className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
                <h4 className="text-sm font-semibold text-indigo-300 mb-2 truncate">{model}</h4>
                <span className="text-2xl font-bold text-green-400">{(score * 100).toFixed(1)}%</span>
                <p className="text-xs text-slate-400 mt-1">ROC-AUC CV</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Metrics Table */}
      {metrics && (
        <div className="glass-panel p-6 overflow-x-auto">
          <h3 className="text-xl font-bold mb-4">Detailed Metrics</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400">Model</th>
                <th className="text-right py-3 px-4 text-slate-400">Accuracy</th>
                <th className="text-right py-3 px-4 text-slate-400">Precision</th>
                <th className="text-right py-3 px-4 text-slate-400">Recall</th>
                <th className="text-right py-3 px-4 text-slate-400">F1 Score</th>
                <th className="text-right py-3 px-4 text-slate-400">ROC-AUC</th>
                <th className="text-right py-3 px-4 text-slate-400">MCC</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(metrics).filter(k => !['training_time_seconds', 'total_samples', 'fraud_samples', 'non_fraud_samples'].includes(k)).map(modelName => (
                <tr key={modelName} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-medium text-indigo-300">{modelName}</td>
                  <td className="text-right py-3 px-4">{(metrics[modelName].accuracy * 100).toFixed(1)}%</td>
                  <td className="text-right py-3 px-4">{(metrics[modelName].precision * 100).toFixed(1)}%</td>
                  <td className="text-right py-3 px-4">{(metrics[modelName].recall * 100).toFixed(1)}%</td>
                  <td className="text-right py-3 px-4">{(metrics[modelName].f1 * 100).toFixed(1)}%</td>
                  <td className="text-right py-3 px-4 text-green-400 font-bold">{(metrics[modelName].roc_auc * 100).toFixed(1)}%</td>
                  <td className="text-right py-3 px-4">{(metrics[modelName].mcc || 0).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderFeatures = () => (
    <div className="space-y-6">
      {/* Feature Importance */}
      <div className="glass-panel p-6">
        <h3 className="text-xl font-bold mb-4">Top 10 Most Important Features</h3>
        <div className="h-80">
          {getTopFeatures().length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getTopFeatures()} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="feature" type="category" stroke="#94a3b8" width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                <Bar dataKey="importance" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Train models to see feature importance
            </div>
          )}
        </div>
      </div>

      {/* Feature Details */}
      {getTopFeatures().length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4">Feature Importance Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getTopFeatures().map(({ feature, fullFeature, importance }, idx) => (
              <div key={fullFeature} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-medium">{fullFeature}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                      style={{ width: `${importance}%` }}
                    />
                  </div>
                  <span className="text-indigo-400 font-bold w-12 text-right">{importance}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderTraining = () => (
    <div className="space-y-6">
      {/* Training History (ANN) */}
      {trainingHistory && Object.keys(trainingHistory).length > 0 && (
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4">ANN Training History</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-400 mb-3">Loss</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trainingHistory.loss?.map((l, i) => ({ epoch: i + 1, loss: l, val_loss: trainingHistory.val_loss?.[i] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="epoch" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="loss" stroke="#6366f1" name="Training Loss" />
                    <Line type="monotone" dataKey="val_loss" stroke="#ec4899" name="Validation Loss" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-400 mb-3">Accuracy</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trainingHistory.accuracy?.map((a, i) => ({ epoch: i + 1, acc: a, val_acc: trainingHistory.val_accuracy?.[i] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="epoch" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="acc" stroke="#10b981" name="Training Acc" />
                    <Line type="monotone" dataKey="val_acc" stroke="#f59e0b" name="Validation Acc" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Training Info */}
      {metrics?.training_time_seconds && (
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4">Training Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
              <h4 className="text-sm text-slate-400 mb-1">Training Time</h4>
              <span className="text-2xl font-bold text-indigo-400">{metrics.training_time_seconds.toFixed(1)}s</span>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
              <h4 className="text-sm text-slate-400 mb-1">Total Samples</h4>
              <span className="text-2xl font-bold text-green-400">{metrics.total_samples?.toLocaleString()}</span>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
              <h4 className="text-sm text-slate-400 mb-1">Fraud Samples</h4>
              <span className="text-2xl font-bold text-red-400">{metrics.fraud_samples?.toLocaleString()}</span>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 text-center">
              <h4 className="text-sm text-slate-400 mb-1">Non-Fraud Samples</h4>
              <span className="text-2xl font-bold text-blue-400">{metrics.non_fraud_samples?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Analytics Dashboard</h2>
        <div className="flex gap-2">
          {['overview', 'models', 'features', 'training'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'models' && renderModels()}
      {activeTab === 'features' && renderFeatures()}
      {activeTab === 'training' && renderTraining()}

      {!metrics && (
        <div className="glass-panel p-12 text-center">
          <h3 className="text-xl font-semibold mb-2">No Training Data Available</h3>
          <p className="text-slate-400">Please go to the Home page and train the models to see performance metrics.</p>
        </div>
      )}
    </div>
  );
}
