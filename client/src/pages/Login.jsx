import React, { useState } from 'react';
import { Clock, Mail, Lock, Building, Eye, EyeOff, Sparkles, Shield, Zap } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    ownerName: '',
    email: '',
    password: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const endpoint = isRegister ? '/auth/register-company' : '/auth/login';
      const body = isRegister ? {
        companyName: formData.companyName,
        ownerName: formData.ownerName,
        email: formData.email,
        password: formData.password
      } : {
        email: formData.email,
        password: formData.password
      };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      if (isRegister) {
        alert('Company registered successfully! Please login.');
        setIsRegister(false);
        setFormData({ companyName: '', ownerName: '', email: '', password: '' });
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
          role: data.role,
          orgId: data.orgId,
          name: data.user?.name || data.name || formData.email.split('@')[0] || 'User'
        }));
        onLogin(data.role);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-1/3 -right-20 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="hidden lg:block text-white space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
                <Clock className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                WorkTracker
              </h1>
            </div>
            
            <h2 className="text-5xl font-bold leading-tight text-white">
              Welcome to
              <span className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                TimeFlow Platform
              </span>
            </h2>
            
            <p className="text-xl text-gray-300 leading-relaxed">
              Join thousands of companies tracking time, boosting productivity, and empowering their teams.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="space-y-4">
            {[
              { icon: Shield, text: "Enterprise-grade security" },
              { icon: Zap, text: "Lightning-fast performance" },
              { icon: Sparkles, text: "Modern intuitive interface" }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:from-gray-800/70 hover:to-gray-700/70 transition-all">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-5 h-5" />
                </div>
                <span className="text-lg font-medium text-white">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Social Proof */}
          <div className="pt-8 border-t border-gray-700">
            <p className="text-sm text-gray-400 mb-4">Built for productivity-focused teams</p>
            <div className="flex gap-6 items-center opacity-80">
              <div className="text-2xl font-bold text-white">All-in-one</div>
              <div className="text-gray-300">Time Tracking Platform</div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full">
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-700/50">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4 shadow-lg">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                TimeFlow
              </h1>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 p-1 bg-gray-800/50 rounded-xl mb-8">
              <button
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                }}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                  !isRegister 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsRegister(true);
                  setError('');
                }}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
                  isRegister 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isRegister ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-gray-300">
                {isRegister 
                  ? 'Get started with your company workspace' 
                  : 'Enter your credentials to continue'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border-l-4 border-red-500 rounded-lg animate-shake">
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Form */}
            <div className="space-y-5">
              {isRegister && (
                <>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-300">
                      Company Name
                    </label>
                    <div className="relative group">
                      <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={20} />
                      <input
                        name="companyName"
                        type="text"
                        required
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-800/50 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-white placeholder-gray-500"
                        placeholder="Acme Corporation"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-300">
                      Owner Name
                    </label>
                    <div className="relative">
                      <input
                        name="ownerName"
                        type="text"
                        required
                        value={formData.ownerName}
                        onChange={handleChange}
                        className="w-full px-4 py-3.5 bg-gray-800/50 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-white placeholder-gray-500"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-800/50 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-white placeholder-gray-500"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={20} />
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-800/50 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-white placeholder-gray-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {!isRegister && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500" />
                    <span className="text-gray-300">Remember me</span>
                  </label>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  isRegister ? 'Create Account' : 'Sign In'
                )}
              </button>
            </div>

            {/* Demo Credentials */}
            {!isRegister && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                <p className="text-sm text-gray-300 text-center">
                  <span className="font-semibold text-blue-400">Demo:</span> Create your company or use existing credentials
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-400">
              <p>
                By continuing, you agree to our{' '}
                <button className="text-blue-400 hover:text-blue-300 font-medium">Terms</button>
                {' '}and{' '}
                <button className="text-blue-400 hover:text-blue-300 font-medium">Privacy Policy</button>
              </p>
            </div>
          </div>

          {/* Mobile Features */}
          <div className="lg:hidden mt-6 text-center text-gray-400 text-sm">
            <p>Trusted by 2,500+ companies worldwide</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Login;