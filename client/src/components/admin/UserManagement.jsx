import { useState, useEffect } from 'react';
import api from '../../services/api'; // Assuming api is exported as default or named export
import { toast } from 'react-hot-toast';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [keyword, setKeyword] = useState('');

    useEffect(() => {
        fetchUsers();
    }, [page, keyword]);

    const fetchUsers = async () => {
        try {
            const { data } = await api.get(`/admin/users?pageNumber=${page}&keyword=${keyword}`);
            setUsers(data.users);
            setTotalPages(data.pages);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch users', error);
            toast.error('Failed to load users');
            setLoading(false);
        }
    };

    const handleStatusChange = async (userId, isActive) => {
        try {
            await api.put(`/admin/users/${userId}/status`, { isActive });
            setUsers(users.map(user => user._id === userId ? { ...user, isActive } : user));
            toast.success(`User ${isActive ? 'activated' : 'deactivated'}`);
        } catch (error) {
            toast.error('Failed to update user status');
        }
    };

    return (
        <div className="bg-slate-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">User Management</h2>
                <input
                    type="text"
                    placeholder="Search users..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            {loading ? (
                <div className="text-center py-4">Loading...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700">
                        <thead className="bg-slate-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-slate-800 divide-y divide-slate-700">
                            {users.map((user) => (
                                <tr key={user._id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold overflow-hidden">
                                                {user.profilePicture ? (
                                                    <img
                                                        src={user.profilePicture.startsWith('data:')
                                                            ? user.profilePicture
                                                            : `${import.meta.env.VITE_SOCKET_URL}${user.profilePicture}`
                                                        }
                                                        alt={user.username}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    user.username[0].toUpperCase()
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-white">{user.username}</div>
                                                <div className="text-sm text-slate-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                        {user.role}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleStatusChange(user._id, !user.isActive)}
                                            className={`text-indigo-400 hover:text-indigo-300 mr-4`}
                                        >
                                            {user.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination controls could go here */}
        </div>
    );
};

export default UserManagement;
