import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserManagement from '../components/admin/UserManagement';
import GroupManagement from '../components/admin/GroupManagement';
import Analytics from '../components/admin/Analytics';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('analytics');
    const { logout } = useAuth();

    const renderContent = () => {
        switch (activeTab) {
            case 'users':
                return <UserManagement />;
            case 'groups':
                return <GroupManagement />;
            case 'analytics':
            default:
                return <Analytics />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-900">
            {/* Header */}
            <div className="bg-slate-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
                        </div>
                        <div className="flex items-center">
                            <button onClick={logout} className="text-slate-300 hover:text-red-600">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tabs */}
                <div className="flex space-x-4 mb-8">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'analytics'
                            ? 'bg-primary text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'users'
                            ? 'bg-primary text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'groups'
                            ? 'bg-primary text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        Groups
                    </button>
                </div>

                {/* Content */}
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminDashboard;
