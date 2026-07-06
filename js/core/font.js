/**
 * Font management: font family and size toggling, persistence.
 */

import { state, setState } from '../state.js';
import { saveSetting, loadSettings } from '../services/storage.js';

const textarea = document.getElementById('main-textarea');
const faceBtn = document.getElementById('face-btn');

// Available font families (CSS values and display names)
export const FONTS = [
    "'IBM Plex Mono', monospace",
    "'IBM Plex Sans', sans-serif",
    "'IBM Plex Serif', serif",
    "'Courier Prime', monospace",
    "'Caveat', cursive"
];
export const FONT_NAMES = [
    "IBM Plex Mono",
    "IBM Plex Sans",
    "IBM Plex Serif",
    "Courier Prime",
    "Caveat"
];

// Font sizes per font family (Small, Medium, Large)
export const FONT_SIZES = [
    ['max(12px, 0.97vw)', 'max(16px, 1.38vw)', 'max(20px, 1.79vw)'],
    ['max(12px, 0.97vw)', 'max(16px, 1.38vw)', 'max(20px, 1.79vw)'],
    ['max(12px, 0.97vw)', 'max(16px, 1.38vw)', 'max(20px, 1.79vw)'],
    ['max(12px, 0.97vw)', 'max(16px, 1.38vw)', 'max(20px, 1.79vw)'],
    ['max(16px, 1.38vw)', 'max(20px, 1.79vw)', 'max(26px, 2.33vw)']
];
export const FONT_SIZE_NAMES = ['Small', 'Medium', 'Large'];

let currentFontIndex = 0;
let currentFontSizeIndex = 1;

export function getCurrentFontIndex() { return currentFontIndex; }
export function getCurrentFontSizeIndex() { return currentFontSizeIndex; }

/**
 * Apply the current font size to the textarea.
 */
export function applyFontSize() {
    const size = FONT_SIZES[currentFontIndex][currentFontSizeIndex];
    textarea.style.fontSize = size;
    saveSetting('editorFontSize', currentFontSizeIndex);
    updateFontSizeButton();
}

/**
 * Cycle to the next font size.
 */
export function toggleFontSize() {
    currentFontSizeIndex = (currentFontSizeIndex + 1) % FONT_SIZE_NAMES.length;
    applyFontSize();
}

/**
 * Initialize font size from saved settings.
 */
export function initFontSize() {
    const saved = loadSettings();
    if (saved.fontSize !== null) {
        const idx = parseInt(saved.fontSize, 10);
        if (idx >= 0 && idx < FONT_SIZE_NAMES.length) {
            currentFontSizeIndex = idx;
        }
    }
    applyFontSize();
}

/**
 * Apply a font family to the textarea.
 * @param {string} font - CSS font-family value
 */
export function applyFont(font) {
    textarea.style.fontFamily = font;
    saveSetting('editorFont', font);
    updateFontButton();
}

/**
 * Cycle to the next font family.
 */
export function toggleFont() {
    currentFontIndex = (currentFontIndex + 1) % FONTS.length;
    applyFont(FONTS[currentFontIndex]);
}

/**
 * Initialize font from saved settings.
 */
export function initFont() {
    const saved = loadSettings();
    if (saved.font && FONTS.includes(saved.font)) {
        currentFontIndex = FONTS.indexOf(saved.font);
    } else {
        currentFontIndex = 0;
    }
    applyFont(FONTS[currentFontIndex]);
    initFontSize();
}

/**
 * Update the font display button in the menu.
 */
function updateFontButton() {
    const fontNameElement = faceBtn.querySelector('.menu-select');
    if (fontNameElement) {
        fontNameElement.textContent = FONT_NAMES[currentFontIndex];
        fontNameElement.style.fontFamily = FONTS[currentFontIndex];
    }
}

/**
 * Update the font size button in the menu.
 */
function updateFontSizeButton() {
    const sizeBtn = document.getElementById('font-size-btn');
    if (sizeBtn) {
        sizeBtn.textContent = FONT_SIZE_NAMES[currentFontSizeIndex];
    }
}