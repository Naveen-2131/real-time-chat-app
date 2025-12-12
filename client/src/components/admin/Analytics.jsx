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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-slate-400 text-sm font-medium uppercase">Total Users</h3>
                <p className="text-3xl font-bold text-white mt-2">{stats.totalUsers}</p>
            </div>
            <div className="bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-slate-400 text-sm font-medium uppercase">Active Users</h3>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeUsers}</p>
            </div>
            <div className="bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-slate-400 text-sm font-medium uppercase">Total Groups</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalGroups}</p>
            </div>
            <div className="bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-slate-400 text-sm font-medium uppercase">Total Messages</h3>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.totalMessages}</p>
            </div>
        </div>
    );
};

export default Analytics;
