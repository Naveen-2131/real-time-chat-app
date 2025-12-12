// Format relative time for last seen
export const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return 'Never';

    const now = new Date();
    const lastSeen = new Date(lastSeenDate);
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // If less than 1 minute, show as online
    if (diffMins < 1) {
        return 'Online';
    }

    // Less than 1 hour
    if (diffMins < 60) {
        return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    }

    // Less than 24 hours
    if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }

    // Less than 7 days
    if (diffDays < 7) {
        if (diffDays === 1) {
            return 'yesterday';
        }
        return `${diffDays} days ago`;
    }

    // More than 7 days, show date
    return lastSeen.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: now.getFullYear() !== lastSeen.getFullYear() ? 'numeric' : undefined
    });
};

// Check if user is currently online (last seen within 1 minute)
export const isUserOnline = (lastSeenDate) => {
    if (!lastSeenDate) return false;

    const now = new Date();
    const lastSeen = new Date(lastSeenDate);
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);

    return diffMins < 1;
};
