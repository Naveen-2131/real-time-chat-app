import { useState } from 'react';
import { FiX, FiUserPlus, FiUserMinus, FiEdit2, FiUsers } from 'react-icons/fi';
import { groupService, userService } from '../services/api';
import { toast } from 'react-hot-toast';

const GroupInfoModal = ({ isOpen, onClose, group, onGroupUpdated }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [groupName, setGroupName] = useState(group?.name || '');
    const [groupDescription, setGroupDescription] = useState(group?.description || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const searchUsers = async (query) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const { data } = await userService.searchUsers(query);
            // Filter out users already in group
            const filtered = data.filter(user =>
                !group.members.some(member => member._id === user._id)
            );
            setSearchResults(filtered);
        } catch (error) {
            console.error('Search failed', error);
        }
    };

    const handleUpdateGroup = async () => {
        setLoading(true);
        try {
            const { data } = await groupService.renameGroup(group._id, groupName);
            toast.success('Group updated successfully!');
            setIsEditing(false);
            onGroupUpdated(data);
        } catch (error) {
            toast.error('Failed to update group');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async (userId) => {
        try {
            const { data } = await groupService.addToGroup(group._id, userId);
            toast.success('Member added successfully!');
            setSearchQuery('');
            setSearchResults([]);
            onGroupUpdated(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add member');
        }
    };

    const handleRemoveMember = async (userId) => {
        console.log('[DEBUG] handleRemoveMember called with userId:', userId);
        if (!userId) {
            console.error('[DEBUG] userId is missing!');
            toast.error('Error: User ID missing');
            return;
        }

        if (!window.confirm('Are you sure you want to remove this member?')) {
            console.log('[DEBUG] User cancelled removal');
            return;
        }

        try {
            console.log(`[DEBUG] Calling API to remove member ${userId} from group ${group._id}`);
            const { data } = await groupService.removeFromGroup(group._id, userId);
            console.log('[DEBUG] API success:', data);
            toast.success('Member removed successfully!');
            onGroupUpdated(data);
        } catch (error) {
            console.error('[DEBUG] API failed:', error);
            toast.error('Failed to remove member');
        }
    };

    if (!isOpen || !group) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-white">
                            <FiUsers className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Group Info</h2>
                            <p className="text-sm text-slate-500">{group.members?.length} members</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <FiX className="w-5 h-5 text-slate-300" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Group Name */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-300">
                                Group Name
                            </label>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className="text-primary hover:text-indigo-600"
                            >
                                <FiEdit2 className="w-4 h-4" />
                            </button>
                        </div>
                        {isEditing ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <div className="flex space-x-2">
                                    <button
                                        onClick={handleUpdateGroup}
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 bg-primary hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setGroupName(group.name);
                                        }}
                                        className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-white font-medium">{group.name}</p>
                        )}
                    </div>

                    {/* Description */}
                    {group.description && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Description
                            </label>
                            <p className="text-slate-400">{group.description}</p>
                        </div>
                    )}

                    {/* Add Member */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Add Member
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                searchUsers(e.target.value);
                            }}
                            placeholder="Search users..."
                            className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                        />

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-2 border border-slate-700 rounded-lg max-h-40 overflow-y-auto">
                                {searchResults.map(user => (
                                    <div
                                        key={user._id}
                                        className="flex items-center justify-between p-3 hover:bg-slate-700"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                                                {user.username[0].toUpperCase()}
                                            </div>
                                            <span className="text-sm text-white">{user.username}</span>
                                        </div>
                                        <button
                                            onClick={() => handleAddMember(user._id)}
                                            className="p-1 text-primary hover:bg-primary/10 rounded"
                                        >
                                            <FiUserPlus className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Members List */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Members ({group.members?.length})
                        </label>
                        <div className="space-y-2">
                            {group.members?.map(member => (
                                <div
                                    key={member._id}
                                    className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold">
                                            {member.username[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{member.username}</p>
                                            {member._id === group.admin?._id && (
                                                <span className="text-xs text-primary">Admin</span>
                                            )}
                                        </div>
                                    </div>
                                    {member._id !== group.admin?._id && (
                                        <button
                                            onClick={() => handleRemoveMember(member._id)}
                                            className="p-2 text-red-500 hover:bg-red-900/20 rounded transition-colors"
                                        >
                                            <FiUserMinus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupInfoModal;
