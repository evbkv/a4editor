/**
 * Utility helper functions used across the application.
 */

/**
 * Convert a hex color to rgba string.
 * @param {string} hex - Hex color (e.g., '#FFFFFF' or 'FFF')
 * @param {number} opacity - Opacity between 0 and 1
 * @returns {string} rgba(...)
 */
export function hexToRgba(hex, opacity) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Auto-resize a textarea to fit its content, up to a maximum number of lines.
 * @param {HTMLTextAreaElement} textarea
 * @param {number} maxLines - Maximum number of lines before scroll
 */
export function autoResize(textarea, maxLines = 3) {
    textarea.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20;
    const paddingTop = parseFloat(getComputedStyle(textarea).paddingTop) || 0;
    const paddingBottom = parseFloat(getComputedStyle(textarea).paddingBottom) || 0;
    const maxHeight = maxLines * lineHeight + paddingTop + paddingBottom;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
}