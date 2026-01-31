import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import { LogOut } from 'lucide-react';

function App() {
  const [view, setView] = useState('landing'); // 'landing', 'login', 'dashboard'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (token && user.role) {
      setIsAuthenticated(true);
      setUserRole(user.role);
      setView('dashboard');
    }
  }, []);

  const handleGetStarted = () => {
    setView('login');
  };

  const handleLogin = (role) => {
    setIsAuthenticated(true);
    setUserRole(role);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUserRole(null);
    setView('landing');
  };

  const handleBackToLanding = () => {
    setView('landing');
  };

  // Show landing page
  if (view === 'landing') {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  // Show login page
  if (view === 'login') {
    return (
      <div>
        <button
          onClick={handleBackToLanding}
          className="fixed top-4 left-4 z-50 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
        >
          ← Back
        </button>
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  // Show dashboard
  if (view === 'dashboard' && isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="fixed top-6 right-6 z-50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-800 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-200 border border-gray-300 bg-white shadow-sm"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>

        {(userRole === 'owner' || userRole === 'admin') ? (
          <AdminDashboard />
        ) : (
          <EmployeeDashboard />
        )}
      </div>
    );
  }

  return null;
}

export default App;