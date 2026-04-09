import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ActivitySquare, CheckCircle, AlertTriangle, Database } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, fraud: 0, nonFraud: 0 });
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:4000/api/dashboard');
        setStats(res.data);
      } catch (err) {
        console.error("Dashboard DB stats error", err);
      }
    };
    
    const fetchMetrics = async () => {
      try {
        const res = await axios.get('http://localhost:4000/api/status');
        if (res.data.metrics) {
            setMetrics(res.data.metrics);
        }
      } catch (err) {
        console.error("Metrics error", err);
      }
    };

    fetchStats();
    fetchMetrics();
    // Refresh basic stats every 5s
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const prepareChartData = () => {
    if (!metrics) return [];
    return Object.keys(metrics).map(modelName => ({
      name: modelName,
      Accuracy: Math.round(metrics[modelName].accuracy * 100),
      Precision: Math.round(metrics[modelName].precision * 100),
      Recall: Math.round(metrics[modelName].recall * 100),
      F1: Math.round(metrics[modelName].f1 * 100)
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <h2 className="text-3xl font-bold">System Dashboard</h2>
      
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
            <h4 className="text-slate-400 font-medium">Database Status</h4>
            <Database className="text-purple-500" size={20} />
          </div>
          <span className="text-lg font-bold text-purple-400">Connected</span>
        </div>
      </div>

      {metrics && (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 glass-panel p-6">
                <h3 className="text-xl font-bold mb-6">Model Comparison</h3>
                <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareChartData()} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="Accuracy" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="F1" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Recall" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
                </div>
            </div>
            
            <div className="glass-panel p-6 space-y-6">
                <h3 className="text-xl font-bold">Confusion Matrices</h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {Object.keys(metrics).map(modelName => {
                        const cm = metrics[modelName].confusion_matrix;
                        return (
                            <div key={modelName} className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                <h4 className="text-sm font-semibold text-indigo-300 mb-3">{modelName}</h4>
                                <div className="grid grid-cols-2 gap-2 text-center text-sm">
                                    <div className="bg-green-500/10 text-green-400 p-2 rounded">
                                        <div className="text-xs opacity-70">True Neg</div>
                                        {cm[0][0]}
                                    </div>
                                    <div className="bg-red-500/10 text-red-400 p-2 rounded">
                                        <div className="text-xs opacity-70">False Pos</div>
                                        {cm[0][1]}
                                    </div>
                                    <div className="bg-red-500/10 text-red-500 p-2 rounded">
                                        <div className="text-xs opacity-70">False Neg</div>
                                        {cm[1][0]}
                                    </div>
                                    <div className="bg-green-500/10 text-green-500 p-2 rounded">
                                        <div className="text-xs opacity-70">True Pos</div>
                                        {cm[1][1]}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      )}
      
      {!metrics && (
          <div className="glass-panel p-12 text-center">
              <h3 className="text-xl font-semibold mb-2">No Training Data Available</h3>
              <p className="text-slate-400">Please go to the Home page and train the models to see performance metrics and comparison charts.</p>
          </div>
      )}
    </div>
  );
}
