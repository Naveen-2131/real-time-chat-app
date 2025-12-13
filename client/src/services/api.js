import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Dispatch a custom event that AuthContext can listen to
            window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(error);
    }
);

// Create a separate instance for uploads to avoid Content-Type conflicts
const uploadApi = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

uploadApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const authService = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
};

export const userService = {
    searchUsers: (query) => api.get(`/users/search?search=${query}`),
    updateProfile: (data) => {
        if (data instanceof FormData) {
            return uploadApi.put('/users/profile', data);
        }
        return api.put('/users/profile', data);
    },
    updateStatus: (status) => api.put('/users/status', { status }),
};

export const chatService = {
    fetchConversations: () => api.get('/conversations'),
    accessConversation: (userId) => api.post('/conversations', { userId }),
    fetchMessages: (conversationId, page = 1, limit = 50) => api.get(`/messages/conversation/${conversationId}?page=${page}&limit=${limit}`),
    fetchGroupMessages: (groupId, page = 1, limit = 50) => api.get(`/messages/group/${groupId}?page=${page}&limit=${limit}`),
    sendMessage: (data) => {
        if (data instanceof FormData) {
            return uploadApi.post('/messages', data);
        }
        return api.post('/messages', data);
    },
    markAsRead: (conversationId) => api.put(`/messages/mark-read/conversation/${conversationId}`),
    markGroupAsRead: (groupId) => api.put(`/messages/mark-read/group/${groupId}`),
};

export const groupService = {
    createGroup: (data) => api.post('/groups', data),
    fetchGroups: () => api.get('/groups'),
    addToGroup: (groupId, userId) => api.post(`/groups/${groupId}/members`, { userId }),
    removeFromGroup: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
    renameGroup: (groupId, name) => api.put(`/groups/${groupId}`, { name }),
};

export const notificationService = {
    getNotifications: () => api.get('/notifications'),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
};

export default api;
