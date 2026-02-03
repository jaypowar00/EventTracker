/**
 * Centralized utility functions for the Event Tracker application.
 * Import these instead of defining locally in each component.
 */

/**
 * Standard SWR fetcher with error handling.
 * Throws an error if the API response indicates failure.
 */
export const fetcher = (url: string) =>
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data.status) throw new Error(data.message);
            return data.data;
        });

/**
 * Formats large point values into shorthand notation.
 * - 1,500,000 -> "1.5M"
 * - 2,500 -> "2.5K"
 * - 500 -> "500"
 */
export const formatPoints = (points: number): string => {
    if (points >= 1000000) return (points / 1000000).toFixed(1) + 'M';
    if (points >= 1000) return (points / 1000).toFixed(1) + 'K';
    return Math.round(points).toLocaleString();
};

/**
 * Formats a date/timestamp into 12-hour time format.
 * Example: "2:30 PM"
 */
export const formatTime12H = (date: string | Date): string => {
    return new Date(date).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

/**
 * Formats a date into a custom readable format.
 * Example: "3 Feb 2026 2:30 PM"
 */
export const formatDateTime = (date: string | Date): string => {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
};
