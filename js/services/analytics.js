/**
 * Analytics service: anonymized usage tracking.
 * Generates a persistent device ID and sends events to the backend.
 */

const APP_VERSION = '1.0β';

/**
 * Get or create a persistent device ID.
 * @returns {string}
 */
function getDeviceId() {
    let id = localStorage.getItem('a4_device_id');
    if (!id) {
        id = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('a4_device_id', id);
    }
    return id;
}

/**
 * Track an anonymized event.
 * @param {string} event - Event name (e.g., 'app_launch')
 * @param {Object} [properties] - Additional properties (e.g., { promptLength: 10 })
 */
export function trackEvent(event, properties = {}) {
    const deviceId = getDeviceId();
    const data = {
        deviceId: deviceId,
        event: event,
        timestamp: Date.now(),
        version: APP_VERSION,
        properties: properties
    };
    // Fire-and-forget: ignore errors to avoid blocking the UI
    fetch('./proxy/track.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).catch((err) => {
        console.warn('Analytics error:', err);
    });
}