/**
 * Global state object for A4 Editor.
 * Contains application-wide settings and flags.
 */

export const state = {
    currentTheme: 'light',
    hasUnsavedChanges: false,
    lastSavedContent: '',
    isAppActive: true,
    saveTimeout: null,
    currentAIProvider: 'None',
    currentAIKey: '',
    isMenuOpen: false,
    isAIWindowOpen: false,
    showAllPrompts: false,
    autoSaveInterval: null,
    currentFontIndex: 0,
    currentFontSizeIndex: 1,
    hasSelection: false,
    selectedText: '',
    cachedBalance: null
};

/**
 * Set a state property.
 * @param {string} key
 * @param {*} value
 */
export function setState(key, value) {
    state[key] = value;
}

/**
 * Get a state property.
 * @param {string} key
 * @returns {*}
 */
export function getState(key) {
    return state[key];
}