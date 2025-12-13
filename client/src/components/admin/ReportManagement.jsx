import { useState, useEffect } from 'react';
import { FiCheck, FiTrash2, FiUserX, FiAlertTriangle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const ReportManagement = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const { data } = await api.get('/admin/reports');
            setReports(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch reports', error);
            setLoading(false);
        }
    };

    const handleAction = async (reportId, action) => {
        try {
            await api.put(`/admin/reports/${reportId}`, { status: 'resolved' });

            if (action === 'delete_message') {
                // Ideally backend should handle this deletion based on report ID content
                toast.success('Message deleted (simulation)');
            } else if (action === 'ban_user') {
                // Ideally backend should handle this
                toast.success('User banned (simulation)');
            } else {
                toast.success('Report resolved');
            }

            fetchReports();
        } catch (error) {
            toast.error('Failed to update report');
        }
    };

    if (loading) {
        return <div className="text-white text-center py-8">Loading reports...</div>;
    }

    return (
        <div className="bg-slate-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="text-lg font-bold text-white flex items-center">
                    <FiAlertTriangle className="mr-2 text-yellow-500" />
                    Reported Content
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-900/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Reporter</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Reported User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Reason</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Message</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {reports.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                                    No pending reports found.
                                </td>
                            </tr>
                        ) : (
                            reports.map((report) => (
                                <tr key={report._id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-slate-300">{report.reportedBy?.username || 'Unknown'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-white">{report.reportedUser?.username || 'Unknown'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                            {report.reason}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-300 max-w-xs truncate" title={report.message?.content}>
                                            {report.message?.content || '[File/No Content]'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${report.status === 'resolved'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {report.status !== 'resolved' && (
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => handleAction(report._id, 'dismiss')}
                                                    className="text-green-500 hover:text-green-400"
                                                    title="Mark Resolved"
                                                >
                                                    <FiCheck className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(report._id, 'delete_message')}
                                                    className="text-orange-500 hover:text-orange-400"
                                                    title="Delete Message"
                                                >
                                                    <FiTrash2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(report._id, 'ban_user')}
                                                    className="text-red-500 hover:text-red-400"
                                                    title="Ban User"
                                                >
                                                    <FiUserX className="w-5 h-5" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReportManagement;
