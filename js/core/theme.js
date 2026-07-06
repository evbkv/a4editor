/**
 * Theme management: apply, toggle, and persist color themes.
 */

import { state, setState } from '../state.js';
import { saveSetting, loadSettings } from '../services/storage.js';
import { hexToRgba } from '../utils/helpers.js';

const body = document.body;
const textarea = document.getElementById('main-textarea');
const menu = document.getElementById('menu');
const menuSelect = document.querySelectorAll('.menu-select');
const transparentBg = document.getElementById('transparent-bg');
const aiOverlay = document.getElementById('ai-overlay');

// Theme definitions
export const THEMES = {
    white: { bg: '#FFFFFF', text: '#1A1A1A' },
    light: { bg: '#F0F0F0', text: '#333333' },
    sepia: { bg: '#F8F4E6', text: '#2A2A2A' },
    dark: { bg: '#1E1E1E', text: '#B3B3B3' },
    black: { bg: '#000000', text: '#E0E0E0' }
};
export const THEME_ORDER = ['white', 'light', 'sepia', 'dark', 'black'];

/**
 * Apply a theme by name.
 * @param {string} theme - One of THEME_ORDER
 */
export function applyTheme(theme) {
    setState('currentTheme', theme);
    const bgColor = THEMES[theme].bg;
    const textColor = THEMES[theme].text;
    body.style.backgroundColor = bgColor;
    textarea.style.backgroundColor = bgColor;
    
    // Adjust menu and dark-theme class
    if (theme === 'dark' || theme === 'black') {
        menu.style.backgroundColor = '#000000';
        menuSelect.forEach(item => item.style.color = '#FFFFFF');
        document.body.classList.add('dark-theme');
    } else {
        menu.style.backgroundColor = '#FFFFFF';
        menuSelect.forEach(item => item.style.color = '#000000');
        document.body.classList.remove('dark-theme');
    }
    textarea.style.color = textColor;
    
    // Overlay backgrounds
    const overlayColor = hexToRgba(THEMES[theme].bg, 0.5);
    transparentBg.style.backgroundColor = overlayColor;
    aiOverlay.style.backgroundColor = overlayColor;
    
    saveSetting('editorTheme', theme);
    updateThemeColor(bgColor);
    
    // Update theme name in menu
    const themeNameElement = document.querySelector('#theme-btn .menu-select');
    if (themeNameElement) {
        themeNameElement.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
    }
}

/**
 * Update the theme-color meta tag.
 * @param {string} color
 */
function updateThemeColor(color) {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', color);
    } else {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = color;
        document.head.appendChild(meta);
    }
}

/**
 * Cycle to the next theme.
 */
export function toggleTheme() {
    const currentIndex = THEME_ORDER.indexOf(state.currentTheme);
    const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
    applyTheme(THEME_ORDER[nextIndex]);
}

/**
 * Initialize theme from saved settings or system preference.
 */
export function initTheme() {
    const saved = loadSettings();
    let theme = saved.theme;
    if (!theme || !THEME_ORDER.includes(theme)) {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(theme);
    // Listen for system theme changes only if user hasn't overridden
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('editorTheme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            applyTheme(newTheme);
        }
    });
}