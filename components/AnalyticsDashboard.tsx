import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users } from 'lucide-react';

interface AnalyticsDashboardProps {
  currentUser: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ currentUser }) => {
  // This is a mock Analytics Dashboard - admin only
  // In real implementation, fetch from Firebase Analytics API
  const ADMIN_EMAIL = 'admin@sharedparentingapp.com'; // Change this to your admin email

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if current user is admin
    setIsAdmin(currentUser === ADMIN_EMAIL);
  }, [currentUser]);

  if (!isAdmin) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center">
        <p className="text-rose-600 font-bold">🔒 גישה מוגבלת</p>
        <p className="text-xs text-rose-500 mt-2">
          דף זה זמין רק לאדמין של האפליקציה
        </p>
      </div>
    );
  }

  // Mock analytics data
  const mockData = {
    totalSignups: 142,
    signupsThisMonth: 28,
    totalLogins: 423,
    emailVerifications: 121,
    smsVerifications: 21,
    socialLogins: {
      google: 45,
      facebook: 12
    },
    averageSessionTime: '12.4 min',
    activeUsers: 89
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 size={28} className="text-white" />
          <h1 className="text-2xl font-bold text-white">📊 Analytics Dashboard</h1>
        </div>
        <p className="text-blue-100 text-sm">Admin Only - Application Analytics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-600 font-bold mb-2">👥 Total Signups</p>
          <p className="text-2xl font-bold text-blue-700">{mockData.totalSignups}</p>
          <p className="text-xs text-blue-500 mt-1">↑ {mockData.signupsThisMonth} this month</p>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <p className="text-xs text-purple-600 font-bold mb-2">🔓 Total Logins</p>
          <p className="text-2xl font-bold text-purple-700">{mockData.totalLogins}</p>
          <p className="text-xs text-purple-500 mt-1">Active users: {mockData.activeUsers}</p>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs text-green-600 font-bold mb-2">✉️ Email Verified</p>
          <p className="text-2xl font-bold text-green-700">{mockData.emailVerifications}</p>
          <p className="text-xs text-green-500 mt-1">{Math.round((mockData.emailVerifications / mockData.totalSignups) * 100)}% of signups</p>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-xs text-yellow-600 font-bold mb-2">📱 SMS Verified</p>
          <p className="text-2xl font-bold text-yellow-700">{mockData.smsVerifications}</p>
          <p className="text-xs text-yellow-500 mt-1">{Math.round((mockData.smsVerifications / mockData.totalSignups) * 100)}% of signups</p>
        </div>
      </div>

      {/* Social Login Stats */}
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Social Login Stats
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-white rounded-lg">
            <span className="text-sm font-medium text-slate-700">Google Sign-ins</span>
            <span className="text-lg font-bold text-blue-600">{mockData.socialLogins.google}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-white rounded-lg">
            <span className="text-sm font-medium text-slate-700">Facebook Sign-ins</span>
            <span className="text-lg font-bold text-blue-800">{mockData.socialLogins.facebook}</span>
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="p-6 bg-indigo-50 border border-indigo-200 rounded-2xl">
        <h2 className="text-lg font-bold text-indigo-800 mb-4 flex items-center gap-2">
          <Users size={20} />
          User Session Info
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-indigo-600 font-bold mb-1">Avg Session Time</p>
            <p className="text-xl font-bold text-indigo-700">{mockData.averageSessionTime}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-600 font-bold mb-1">Active Users (24h)</p>
            <p className="text-xl font-bold text-indigo-700">{mockData.activeUsers}</p>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-xs text-amber-700">
          ⚠️ <strong>Note:</strong> This is a mock dashboard. To view real analytics:
        </p>
        <p className="text-xs text-amber-600 mt-2">
          1. Go to Firebase Console → Analytics<br />
          2. View real-time events and user data<br />
          3. Integrate Firebase Analytics API for live data
        </p>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
