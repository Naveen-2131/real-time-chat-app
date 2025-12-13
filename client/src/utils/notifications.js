// Notification utility functions for browser notifications

/**
 * Request notification permission from the user
 * @returns {Promise<string>} Permission status: 'granted', 'denied', or 'default'
 */
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
};

/**
 * Show a browser notification
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 * @param {string} options.body - Notification body text
 * @param {string} options.icon - Notification icon URL
 * @param {string} options.tag - Notification tag for grouping
 * @param {Function} options.onClick - Callback when notification is clicked
 */
export const showNotification = (title, options = {}) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return null;
    }

    const {
        body = '',
        icon = '/vite.svg',
        tag = 'chat-notification',
        onClick = null
    } = options;

    const notification = new Notification(title, {
        body,
        icon,
        tag,
        badge: '/vite.svg',
        requireInteraction: false,
        silent: false
    });

    if (onClick) {
        notification.onclick = onClick;
    }

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
};

/**
 * Play notification sound
 * @param {string} soundType - Type of sound: 'message' or 'group'
 */
export const playNotificationSound = (soundType = 'message') => {
    try {
        const audio = new Audio(`/sounds/${soundType}.mp3`);
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Sound play failed:', err));
    } catch (error) {
        console.log('Sound not available:', error);
    }
};

/**
 * Update browser tab title with unread count
 * @param {number} count - Number of unread messages
 */
export const updateTabTitle = (count) => {
    const baseTitle = 'Chat App';
    document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
};

/**
 * Update favicon to show notification indicator
 * @param {boolean} hasNotification - Whether there are unread messages
 */
export const updateFavicon = (hasNotification) => {
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = hasNotification ? '/favicon-notification.ico' : '/favicon.ico';
    document.getElementsByTagName('head')[0].appendChild(link);
};

/**
 * Check if the app is currently in focus
 * @returns {boolean} True if app is in focus
 */
export const isAppInFocus = () => {
    return document.hasFocus();
};

/**
 * Show message notification if app is not in focus
 * @param {Object} message - Message object
 * @param {string} senderName - Name of the sender
 * @param {boolean} isGroup - Whether the message is from a group
 */
export const showMessageNotification = (message, senderName, isGroup = false) => {
    // Don't show notification if app is in focus
    // if (isAppInFocus()) {
    //     return;
    // }

    const title = isGroup ? `${senderName} in ${message.groupName}` : senderName;
    const body = message.content || (message.fileUrl ? '📎 Sent a file' : 'New message');

    showNotification(title, {
        body,
        icon: '/vite.svg', // Use vite.svg as logo.png is missing
        tag: `message-${message._id}`,
        onClick: () => {
            window.focus();
            // You can add logic here to open the specific chat
        }
    });

    // Play sound
    playNotificationSound(isGroup ? 'group' : 'message');
};
