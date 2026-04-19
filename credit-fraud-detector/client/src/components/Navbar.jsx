import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Activity, LayoutDashboard, BrainCircuit } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/', icon: <ShieldCheck size={20} /> },
    { name: 'Predict', path: '/predict', icon: <Activity size={20} /> },
    { name: 'Analytics', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  ];

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-white/10 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-indigo-500/20 rounded-lg group-hover:bg-indigo-500/30 transition-colors">
            <BrainCircuit className="text-indigo-400" size={24} />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            SecureGuard AI
          </span>
        </Link>
        
        <div className="flex gap-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {link.icon}
                <span className="font-medium">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
