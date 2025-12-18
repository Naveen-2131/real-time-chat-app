import { useState, useEffect } from 'react';
import api from '../../services/api';

const Analytics = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalGroups: 0,
        totalMessages: 0
    });

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const { data } = await api.get('/admin/analytics');
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch analytics', error);
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-6 transform hover:scale-[1.02] transition-all">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Users</h3>
                    <p className="text-3xl font-extrabold text-white mt-2">{stats.totalUsers}</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-6 transform hover:scale-[1.02] transition-all">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Users</h3>
                    <p className="text-3xl font-extrabold text-green-500 mt-2">{stats.activeUsers}</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-6 transform hover:scale-[1.02] transition-all">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Groups</h3>
                    <p className="text-3xl font-extrabold text-blue-500 mt-2">{stats.totalGroups}</p>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-6 transform hover:scale-[1.02] transition-all">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Messages Sent</h3>
                    <p className="text-3xl font-extrabold text-purple-500 mt-2">{stats.totalMessages}</p>
                </div>
            </div>

            {/* Trends Section */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-6">
                <h3 className="text-white text-lg font-bold mb-6">Recent Activity Highlights (Last 7 Days)</h3>
                <div className="grid grid-cols-7 gap-2 h-32 items-end">
                    {stats.messageTrends?.length > 0 ? (
                        stats.messageTrends.map((trend) => (
                            <div key={trend._id} className="flex flex-col items-center">
                                <div
                                    className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-lg transition-all"
                                    style={{ height: `${Math.min(100, (trend.count / (stats.totalMessages || 1)) * 500 + 10)}%` }}
                                    title={`${trend.count} messages on ${trend._id}`}
                                ></div>
                                <span className="text-[10px] text-slate-500 mt-2 rotate-45 md:rotate-0">{trend._id.split('-').slice(1).join('/')}</span>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-7 text-center text-slate-500 py-8">No recent activity data available.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
