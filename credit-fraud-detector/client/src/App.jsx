import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Prediction from './components/Prediction';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500/30">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/predict" element={<Prediction />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
