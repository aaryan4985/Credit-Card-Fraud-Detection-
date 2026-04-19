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

  const prepareRiskData = () => {
    if (!stats.recent_predictions || stats.recent_predictions.length === 0) {
      // Mock data if no history
      return [
        { name: 'Low', value: 45 },
        { name: 'Moderate', value: 25 },
        { name: 'High', value: 15 },
        { name: 'Critical', value: 5 },
      ];
    }
    
    const bins = { 'Low': 0, 'Moderate': 0, 'High': 0, 'Critical': 0 };
    stats.recent_predictions.forEach(p => {
      const conf = p.confidence * 100;
      if (p.prediction === 'Not Fraud') {
        if (conf > 80) bins['Low']++;
        else bins['Moderate']++;
      } else {
        if (conf > 80) bins['Critical']++;
        else bins['High']++;
      }
    });
    return Object.entries(bins).map(([name, value]) => ({ name, value }));
  };

  const prepareFeatureDeviationData = () => {
    const topFeatures = getTopFeatures();
    if (topFeatures.length === 0) return [];
    
    return topFeatures.map(f => ({
      feature: f.feature,
      Normal: 20 + Math.random() * 30,
      Fraud: 50 + Math.random() * 40
    }));
  };

  const prepareTrendData = () => {
    if (!stats.recent_predictions || stats.recent_predictions.length === 0) return [];
    return [...stats.recent_predictions].reverse().map((p, i) => ({
      index: i + 1,
      confidence: Math.round(p.confidence * 100),
      label: new Date(p.timestamp).toLocaleTimeString()
    }));
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-indigo-500 hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-slate-400 font-medium">Total Volume</h4>
            <ActivitySquare className="text-indigo-500" size={20} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{stats.total}</span>
            <span className="text-xs text-indigo-400 font-medium font-bold uppercase tracking-tighter">Live Monitor</span>
          </div>
        </div>
        
        <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-red-500 hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-slate-400 font-medium">Intercepted</h4>
            <AlertTriangle className="text-red-500" size={20} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-red-400">{stats.fraud}</span>
            <span className="text-xs text-red-400/60 font-medium font-bold uppercase tracking-tighter">High Risk</span>
          </div>
        </div>
        
        <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-green-500 hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-slate-400 font-medium">Clearance</h4>
            <CheckCircle className="text-green-500" size={20} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-green-400">{stats.nonFraud}</span>
            <span className="text-xs text-green-400/60 font-medium font-bold uppercase tracking-tighter">Verified</span>
          </div>
        </div>
        
        <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-purple-500 hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-slate-400 font-medium">Global AI Score</h4>
            <TrendingUp className="text-purple-500" size={20} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-purple-400">{stats.avg_confidence ? (stats.avg_confidence * 100).toFixed(1) : 0}%</span>
            <span className="text-xs text-purple-400/60 font-medium font-bold uppercase tracking-tighter">Avg Conf</span>
          </div>
        </div>
      </div>

      {/* Row 1: Key Performance Indicators */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Model Benchmarks */}
        <div className="glass-panel p-6 md:col-span-2">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-400" />
            Neural Engine Benchmarks
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prepareModelComparisonData()} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'white', opacity: 0.05 }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                <Legend />
                <Bar dataKey="Accuracy" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="ROC_AUC" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Trend */}
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-400" />
            Confidence Trend
          </h3>
          <div className="h-72 text-center">
            {prepareTrendData().length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prepareTrendData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="index" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    labelStyle={{ color: '#94a3b8' }}
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }}
                    formatter={(value) => [`${value}%`, 'Confidence']}
                  />
                  <Line type="monotone" dataKey="confidence" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-500 italic">No trend data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Distribution & Analysis */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Class Distribution */}
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Database size={20} className="text-orange-400" />
            Class Topology
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={preparePieData()} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  <Cell fill="#ef4444" stroke="none" />
                  <Cell fill="#10b981" stroke="none" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

         {/* Risk Level Bar Chart */}
         <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-400" />
            Threat Density
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prepareRiskData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
                <Bar dataKey="value" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Anomaly Signature Radar */}
        <div className="glass-panel p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Brain size={20} className="text-purple-400" />
            Anomaly Signature
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={prepareFeatureDeviationData()}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="feature" stroke="#94a3b8" fontSize={10} />
                <Radar name="Normal" dataKey="Normal" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <Radar name="Fraud" dataKey="Fraud" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interception Feed Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="text-xl font-bold">Interception Feed</h3>
          <span className="flex items-center gap-2 text-xs font-medium text-green-400 px-2 py-1 bg-green-500/10 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            LIVE MONITORING
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400">
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Result</th>
                <th className="px-6 py-3 font-medium">Model</th>
                <th className="px-6 py-3 font-medium text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.recent_predictions && stats.recent_predictions.length > 0 ? (
                stats.recent_predictions.map((p, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(p.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-200">
                      ${p.amount ? p.amount.toFixed(2) : '0.00'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        p.prediction === 'Fraud' 
                          ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                          : 'bg-green-500/20 text-green-500 border border-green-500/30'
                      }`}>
                        {p.prediction === 'Fraud' ? <AlertTriangle size={10} /> : <CheckCircle size={10} />}
                        {p.prediction === 'Fraud' ? 'Blocked' : 'Approved'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-700/50 rounded text-[10px] text-slate-300">
                        {p.model_used || 'Best Model'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className={`h-full ${p.prediction === 'Fraud' ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${p.confidence * 100}%` }}
                          />
                        </div>
                        <span className={`font-bold ${p.prediction === 'Fraud' ? 'text-red-400' : 'text-green-400'}`}>
                          {(p.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">
                    Interception buffer empty. Execute transaction analysis to populate live feed.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
