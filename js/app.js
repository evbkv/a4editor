/**
 * Main entry point for A4 Editor application.
 * Initializes core modules, event listeners, and window state management.
 */

import { state, setState } from './state.js';
import { initTheme } from './core/theme.js';
import { initFont, initFontSize } from './core/font.js';
import { 
    loadSavedText, saveText, startAutoSave, handleTextChange, 
    handleVisibilityChange, handlePageHide, handleBlur, 
    updateNetworkStatus, handleEditorKeyDown
} from './core/editor.js';
import { initMenu, openMenu, closeMenu, setCloseMenu as setMenuClose, isMenuOpen } from './ui/menu.js';
import { initAIOverlay, openAIWindow, closeAIWindow, setCloseMenu as setAIClose, isAIWindowOpen, isPromptModalOpen, closePromptModal } from './ui/ai-overlay.js';
import { trackEvent } from './services/analytics.js';

// Stack for tracking open overlays to handle back navigation (popstate)
const stateStack = [];

/**
 * Push a window state onto the history stack.
 * @param {string} id - 'menu', 'ai', or 'prompt'
 */
function pushWindowState(id) {
    if (stateStack.length === 0 || stateStack[stateStack.length - 1] !== id) {
        stateStack.push(id);
        history.pushState({ windowId: id }, '');
    }
}

/**
 * Pop the last window state from the history stack.
 */
function popWindowState() {
    if (stateStack.length > 0) {
        stateStack.pop();
    }
    if (stateStack.length > 0) {
        const lastId = stateStack[stateStack.length - 1];
        history.replaceState({ windowId: lastId }, '');
    } else {
        history.replaceState({ windowId: null }, '');
    }
}

/**
 * Handle popstate event (back/forward navigation).
 * Closes the topmost open window.
 * @param {PopStateEvent} event
 */
function handlePopState(event) {
    if (event.state && event.state.windowId) {
        const id = event.state.windowId;
        if (id === 'prompt') {
            closePromptModal();
        } else if (id === 'ai') {
            closeAIWindow();
        } else if (id === 'menu') {
            closeMenu();
        }
    } else {
        // Fallback: close the first open overlay
        if (isPromptModalOpen()) {
            closePromptModal();
        } else if (isAIWindowOpen()) {
            closeAIWindow();
        } else if (isMenuOpen()) {
            closeMenu();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // Initialize core modules
    initTheme();
    initFont();
    initFontSize();
    loadSavedText();
    startAutoSave();

    // Initialize UI modules with history callbacks
    initMenu(pushWindowState, popWindowState);
    initAIOverlay(pushWindowState, popWindowState);

    // Cross-close functions: menu can close AI, AI can close menu
    setMenuClose(closeAIWindow);
    setAIClose(closeMenu);

    // Textarea event listeners
    const textarea = document.getElementById('main-textarea');
    textarea.addEventListener('input', handleTextChange);
    document.addEventListener('keydown', handleEditorKeyDown);

    // Document visibility and page lifecycle
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();

    // Before unload: save if there are unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (state.hasUnsavedChanges) {
            saveText();
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // Escape key: close open overlays in order (prompt > AI > menu)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (isPromptModalOpen()) {
                closePromptModal();
                e.preventDefault();
            } else if (isAIWindowOpen()) {
                closeAIWindow();
                e.preventDefault();
            } else if (isMenuOpen()) {
                closeMenu();
                e.preventDefault();
            }
        }
    });

    // History popstate listener for back gesture
    window.addEventListener('popstate', handlePopState);

    // Marker button (top-right dot) logic
    const markerButton = document.getElementById('marker-button');
    const marker = document.getElementById('marker');

    let isDoubleClick = false;
    let isLongPress = false;
    let longPressTimer = null;

    markerButton.addEventListener('click', function(e) {
        if (isDoubleClick) {
            isDoubleClick = false;
            return;
        }
        if (isLongPress) {
            isLongPress = false;
            return;
        }
        // Close overlays if open
        if (isPromptModalOpen()) {
            closePromptModal();
            return;
        }
        if (isAIWindowOpen()) {
            closeAIWindow();
            return;
        }
        if (isMenuOpen()) {
            closeMenu();
            return;
        }
        // If unsaved changes, save; otherwise open AI window
        if (state.hasUnsavedChanges) {
            saveText();
            marker.style.backgroundColor = '#808080';
            return;
        }
        openAIWindow();
    });

    // Double-click: open menu
    markerButton.addEventListener('dblclick', function(e) {
        e.preventDefault();
        isDoubleClick = true;
        if (isPromptModalOpen()) {
            closePromptModal();
        }
        if (isAIWindowOpen()) {
            closeAIWindow();
        }
        openMenu();
        setTimeout(() => { isDoubleClick = false; }, 300);
    });

    // Right-click: open menu
    markerButton.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        if (isPromptModalOpen()) {
            closePromptModal();
        }
        if (isAIWindowOpen()) {
            closeAIWindow();
        }
        openMenu();
    });

    // Long press (touch): open menu
    markerButton.addEventListener('touchstart', function(e) {
        isLongPress = false;
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            if (isPromptModalOpen()) {
                closePromptModal();
            }
            if (isAIWindowOpen()) {
                closeAIWindow();
            }
            openMenu();
        }, 500);
    });
    markerButton.addEventListener('touchend', function(e) {
        clearTimeout(longPressTimer);
        if (isLongPress) {
            isLongPress = false;
            return;
        }
    });
    markerButton.addEventListener('touchcancel', function(e) {
        clearTimeout(longPressTimer);
        isLongPress = false;
    });

    // Service Worker registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js', { scope: './' })
                .then(registration => {
                    console.log('ServiceWorker registration successful:', registration.scope);
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('New app version is available. It will activate on next page load.');
                            }
                        });
                    });
                    let refreshing = false;
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        if (!refreshing) {
                            refreshing = true;
                            window.location.reload();
                        }
                    });
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
        });
    }

    // Update marker position relative to visual viewport
    const updateMarkerPosition = () => {
        if (!window.visualViewport) return;
        const vv = window.visualViewport;
        marker.style.top = `${vv.offsetTop + 11}px`;
        marker.style.right = `${11}px`;
    };
    if (window.visualViewport) {
        visualViewport.addEventListener('resize', updateMarkerPosition);
        visualViewport.addEventListener('scroll', updateMarkerPosition);
    }
    window.addEventListener('scroll', updateMarkerPosition);
    updateMarkerPosition();

    // Track app launch event
    trackEvent('app_launch');
});