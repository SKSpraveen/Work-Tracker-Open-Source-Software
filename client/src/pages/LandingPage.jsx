import React, { useState, useEffect } from 'react';
import { Clock, Users, BarChart3, Shield, Zap, ChevronRight, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

const LandingPage = ({ onGetStarted }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-gray-900/95 backdrop-blur-lg shadow-xl shadow-black/20' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              WorkTracker
            </span>
          </div>
          <button 
            onClick={onGetStarted}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full text-blue-300 text-sm font-semibold backdrop-blur-sm">
              <Sparkles size={16} />
              Modern Time Tracking Platform
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              Work Smarter,
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Track Better.
              </span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Enterprise-grade time tracking solution that helps teams stay organized, productive, and accountable. Built for companies that value transparency.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={onGetStarted}
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/30 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl font-bold text-lg hover:bg-white/20 transition-all shadow-lg hover:shadow-xl">
                View Demo
              </button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Enterprise ready</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything you need to
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> scale your team</span>
            </h2>
            <p className="text-xl text-gray-300">Powerful features designed for modern workplaces</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: "Real-Time Tracking",
                description: "Monitor employee hours with precision. Clock in/out with one click and track attendance in real-time.",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: Users,
                title: "Team Management",
                description: "Add team members, assign roles, and manage your entire workforce from a unified dashboard.",
                gradient: "from-purple-500 to-pink-500"
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description: "Get actionable insights into work patterns, attendance trends, and productivity metrics.",
                gradient: "from-orange-500 to-amber-500"
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "Secure your data with granular permissions, audit logs, and SOC2 compliance.",
                gradient: "from-emerald-500 to-green-500"
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Built with modern architecture for instant updates and seamless performance.",
                gradient: "from-yellow-500 to-orange-500"
              },
              {
                icon: CheckCircle,
                title: "Easy Setup",
                description: "Get started in minutes. No complex configuration or technical knowledge required.",
                gradient: "from-indigo-500 to-purple-500"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group relative p-8 bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl hover:from-gray-800/70 hover:to-gray-700/70 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-12 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl overflow-hidden border border-gray-700">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
            <div className="relative z-10 text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready to transform your team's productivity?
              </h2>
              <p className="text-xl mb-8 text-gray-300">
                Join forward-thinking companies that trust TimeFlow for their time tracking
              </p>
              <button 
                onClick={onGetStarted}
                className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105 inline-flex items-center gap-3 shadow-lg"
              >
                Get Started Free
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Work Tracker
            </span>
          </div>
          <p className="text-gray-400 mb-2">© 2026 Work Tracker. All rights reserved.</p>
          <p className="text-gray-400 mb-2">Enterprise Time Tracking Platform.</p>
          <p className="text-sm text-gray-500">Built with ❤️ for teams everywhere</p>
          <p className="text-sm text-gray-500">
            Created by <span className="font-medium text-gray-400">FriendStack Developers</span>
          </p>
        </div>
      </footer>

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
      `}</style>
    </div>
  );
};

export default LandingPage;