/**
 * Main menu UI: open/close, theme/font controls, AI provider selection.
 */

import { state, setState } from '../state.js';
import { hexToRgba } from '../utils/helpers.js';
import { applyTheme, toggleTheme, THEMES } from '../core/theme.js';
import { toggleFont, toggleFontSize, initFont, initFontSize, getCurrentFontIndex, getCurrentFontSizeIndex, FONTS, FONT_NAMES, FONT_SIZE_NAMES } from '../core/font.js';
import { loadFile, exportText } from '../core/editor.js';
import { saveSetting, saveAIKey, loadAIKey } from '../services/storage.js';

const transparentBg = document.getElementById('transparent-bg');
const menuContainer = document.getElementById('menu-container');
const menu = document.getElementById('menu');
const themeBtn = document.getElementById('theme-btn');
const faceBtn = document.getElementById('face-btn');
const sizeBtn = document.getElementById('size-btn');
const loadBtn = document.getElementById('load-btn');
const saveBtn = document.getElementById('save-btn');
const aiProviderBtn = document.getElementById('ai-provider-btn');
const aiProviderSelect = document.getElementById('ai-provider-select');
const aiKeyContainer = document.getElementById('ai-key-container');
const aiApiKeyInput = document.getElementById('ai-api-key-input');
const menuClose = document.getElementById('menu-close');

let _closeAIWindow = null;
let _pushState = null;
let _popState = null;

export function setCloseMenu(fn) {
    _closeAIWindow = fn;
}

export function isMenuOpen() {
    return state.isMenuOpen;
}

/**
 * Open the main menu.
 */
export function openMenu() {
    if (state.isMenuOpen) return;
    if (state.isAIWindowOpen && _closeAIWindow) {
        _closeAIWindow();
    }
    transparentBg.style.backgroundColor = hexToRgba(THEMES[state.currentTheme].bg, 0.5);
    transparentBg.style.visibility = 'visible';
    menuContainer.style.visibility = 'visible';
    setState('isMenuOpen', true);
    if (_pushState) {
        _pushState('menu');
    }
}

/**
 * Close the main menu.
 */
export function closeMenu() {
    if (!state.isMenuOpen) return;
    transparentBg.style.visibility = 'hidden';
    menuContainer.style.visibility = 'hidden';
    setState('isMenuOpen', false);
    if (_popState) {
        _popState();
    }
}

/**
 * Initialize the menu with history callbacks.
 * @param {Function} pushState
 * @param {Function} popState
 */
export function initMenu(pushState, popState) {
    _pushState = pushState;
    _popState = popState;

    // Load AI provider and key from storage
    const savedProvider = localStorage.getItem('aiProvider') || 'None';
    const allowedProviders = ['None', 'DeepSeek'];
    let provider = savedProvider;
    if (!allowedProviders.includes(provider)) {
        provider = 'None';
    }
    const savedKey = loadAIKey(provider);
    state.currentAIProvider = provider;
    state.currentAIKey = savedKey;
    aiProviderSelect.textContent = provider;
    aiApiKeyInput.value = savedKey;
    updateAIKeyVisibility();

    // Close button
    menuClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
    });

    // Click outside menu (on backdrop) closes it
    transparentBg.addEventListener('click', (e) => {
        if (e.target === transparentBg) {
            closeMenu();
        }
    });

    // Theme toggle
    themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTheme();
    });

    // Font face toggle
    faceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFont();
    });

    // Font size toggle
    sizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFontSize();
    });

    // Load file
    loadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadFile();
        closeMenu();
    });

    // Save/export file
    saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportText();
        closeMenu();
    });

    // AI provider cycling
    aiProviderBtn.addEventListener('click', function(e) {
        if (e.target === aiApiKeyInput) {
            e.stopPropagation();
            return;
        }
        e.stopPropagation();
        const providers = ['None', 'DeepSeek'];
        let index = providers.indexOf(state.currentAIProvider);
        if (index === -1) {
            index = 0;
        }
        const oldProvider = state.currentAIProvider;
        if (oldProvider !== 'None' && oldProvider !== 'A4 AI') {
            saveAIKey(oldProvider, state.currentAIKey);
        }
        index = (index + 1) % providers.length;
        const newProvider = providers[index];
        state.currentAIProvider = newProvider;
        saveSetting('aiProvider', newProvider);
        if (newProvider === 'None' || newProvider === 'A4 AI') {
            state.currentAIKey = '';
            aiApiKeyInput.value = '';
        } else {
            const key = loadAIKey(newProvider);
            state.currentAIKey = key;
            aiApiKeyInput.value = key;
        }
        aiProviderSelect.textContent = newProvider;
        updateAIKeyVisibility();
    });

    // API key input: save on change
    aiApiKeyInput.addEventListener('click', (e) => e.stopPropagation());
    aiApiKeyInput.addEventListener('input', function() {
        const provider = state.currentAIProvider;
        if (provider !== 'None' && provider !== 'A4 AI') {
            state.currentAIKey = this.value;
            saveAIKey(provider, this.value);
        }
    });
}

/**
 * Show/hide the API key input based on provider.
 */
function updateAIKeyVisibility() {
    if (state.currentAIProvider === 'OpenAI' || state.currentAIProvider === 'DeepSeek') {
        aiKeyContainer.style.display = 'block';
    } else {
        aiKeyContainer.style.display = 'none';
    }
}