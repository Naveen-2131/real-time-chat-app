import { useState, useEffect } from 'react';
import { FiX, FiUsers } from 'react-icons/fi';
import { userService, groupService } from '../services/api';
import { toast } from 'react-hot-toast';

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (searchQuery.length > 1) {
            searchUsers();
        } else {
            setUsers([]);
        }
    }, [searchQuery]);

    const searchUsers = async () => {
        try {
            const { data } = await userService.searchUsers(searchQuery);
            setUsers(data);
        } catch (error) {
            console.error('Failed to search users', error);
        }
    };

    const toggleUser = (user) => {
        if (selectedUsers.find(u => u._id === user._id)) {
            setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();

        if (!groupName.trim()) {
            toast.error('Please enter a group name');
            return;
        }

        if (selectedUsers.length < 2) {
            toast.error('Please select at least 2 members');
            return;
        }

        setLoading(true);
        try {
            const userIds = selectedUsers.map(u => u._id);
            const { data } = await groupService.createGroup({
                name: groupName,
                description: groupDescription,
                users: JSON.stringify(userIds)
            });

            toast.success('Group created successfully!');
            onGroupCreated(data);
            onClose();

            // Reset form
            setGroupName('');
            setGroupDescription('');
            setSelectedUsers([]);
            setSearchQuery('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                            <FiUsers className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Create Group</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <FiX className="w-5 h-5 text-slate-300" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleCreateGroup} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Group Name *
                        </label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Enter group name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            value={groupDescription}
                            onChange={(e) => setGroupDescription(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            placeholder="Enter group description"
                            rows="3"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Add Members * (min 2)
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Search users..."
                        />
                    </div>

                    {/* Selected Users */}
                    {selectedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {selectedUsers.map(user => (
                                <div
                                    key={user._id}
                                    className="flex items-center space-x-2 px-3 py-1 bg-primary/10 text-primary rounded-full"
                                >
                                    <span className="text-sm font-medium">{user.username}</span>
                                    <button
                                        type="button"
                                        onClick={() => toggleUser(user)}
                                        className="hover:bg-primary/20 rounded-full p-0.5"
                                    >
                                        <FiX className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* User Search Results */}
                    {users.length > 0 && (
                        <div className="border border-slate-700 rounded-lg max-h-48 overflow-y-auto">
                            {users.map(user => (
                                <div
                                    key={user._id}
                                    onClick={() => toggleUser(user)}
                                    className={`flex items-center space-x-3 p-3 cursor-pointer hover:bg-slate-700 ${selectedUsers.find(u => u._id === user._id) ? 'bg-primary/5' : ''
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-white font-bold">
                                        {user.username[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-white">{user.username}</p>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                    </div>
                                    {selectedUsers.find(u => u._id === user._id) && (
                                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreateGroup}
                        disabled={loading || !groupName.trim() || selectedUsers.length < 2}
                        className="px-6 py-2 bg-primary hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupModal;
