/**
 * Core editor functionality: text manipulation, saving, loading, export, and keyboard shortcuts.
 */

import { state, setState } from '../state.js';
import { saveContent, loadContent } from '../services/storage.js';

const textarea = document.getElementById('main-textarea');
const marker = document.getElementById('marker');

/**
 * Get the current editor content.
 * @returns {string}
 */
export function getText() {
    return textarea.value;
}

/**
 * Set the editor content and update saved state.
 * @param {string} content
 */
export function setText(content) {
    textarea.value = content;
    state.lastSavedContent = content;
    updateSaveStatus(false);
}

/**
 * Load saved text from localStorage on startup.
 */
export function loadSavedText() {
    const saved = loadContent();
    if (saved) {
        textarea.value = saved;
        state.lastSavedContent = saved;
        updateSaveStatus(false);
        textarea.setSelectionRange(0, 0);
    }
}

/**
 * Save the current text to localStorage.
 */
export function saveText() {
    const content = textarea.value;
    saveContent(content);
    state.lastSavedContent = content;
    updateSaveStatus(false);
    console.log('Text saved');
}

/**
 * Update the save status indicator (marker color).
 * @param {boolean} unsaved - true if there are unsaved changes
 */
export function updateSaveStatus(unsaved = true) {
    state.hasUnsavedChanges = unsaved;
    marker.style.backgroundColor = unsaved ? '#E74C3C' : '#808080';
}

/**
 * Start auto-save interval (every minute).
 */
export function startAutoSave() {
    if (state.autoSaveInterval) clearInterval(state.autoSaveInterval);
    state.autoSaveInterval = setInterval(() => {
        if (state.hasUnsavedChanges && state.isAppActive) {
            saveText();
        }
    }, 60 * 1000);
}

/**
 * Stop the auto-save interval.
 */
export function stopAutoSave() {
    if (state.autoSaveInterval) {
        clearInterval(state.autoSaveInterval);
        state.autoSaveInterval = null;
    }
}

/**
 * Handle input events: update unsaved status.
 */
export function handleTextChange() {
    if (textarea.value !== state.lastSavedContent) {
        updateSaveStatus(true);
    }
}

/**
 * Handle visibility change: save on hide, restart auto-save on show.
 */
export function handleVisibilityChange() {
    if (document.hidden) {
        setState('isAppActive', false);
        if (state.saveTimeout) clearTimeout(state.saveTimeout);
        state.saveTimeout = setTimeout(() => {
            if (state.hasUnsavedChanges) {
                saveText();
            }
        }, 500);
        stopAutoSave();
    } else {
        setState('isAppActive', true);
        if (state.saveTimeout) {
            clearTimeout(state.saveTimeout);
            state.saveTimeout = null;
        }
        startAutoSave();
    }
}

/**
 * Handle page hide: save if needed.
 */
export function handlePageHide() {
    if (state.hasUnsavedChanges) {
        saveText();
    }
    stopAutoSave();
}

/**
 * Handle window blur: save if needed.
 */
export function handleBlur() {
    if (state.hasUnsavedChanges) {
        saveText();
    }
}

/**
 * Update marker color based on network status.
 */
export function updateNetworkStatus() {
    if (!navigator.onLine) {
        marker.style.backgroundColor = '#FFA500';
    } else {
        marker.style.backgroundColor = state.hasUnsavedChanges ? '#E74C3C' : '#808080';
    }
}

/**
 * Handle keyboard shortcuts (Ctrl+S, Ctrl+E, Tab).
 * @param {KeyboardEvent} e
 */
export function handleEditorKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS' && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        saveText();
        return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyE' && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        exportText();
        return;
    }
    if (e.key === 'Tab') {
        const promptModalOverlay = document.getElementById('prompt-modal-overlay');
        const isOverlayOpen = state.isAIWindowOpen || state.isMenuOpen || (promptModalOverlay && promptModalOverlay.style.visibility === 'visible');
        if (isOverlayOpen) {
            // Prevent tab insertion when overlays are open
            return;
        }
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '\t' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 1;
    }
}

/**
 * Export text as .txt file (with BOM for UTF-8).
 */
export function exportText() {
    const content = textarea.value;
    const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const textEncoder = new TextEncoder();
    const encodedContent = textEncoder.encode(content);
    const fullContent = new Uint8Array(BOM.length + encodedContent.length);
    fullContent.set(BOM);
    fullContent.set(encodedContent, BOM.length);
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const date = new Date();
    const fileName = `Note_${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}.${String(date.getMinutes()).padStart(2, '0')}.txt`;
    if ('showSaveFilePicker' in window) {
        window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }]
        }).then(async (handle) => {
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        }).catch(() => fallbackExport(blob, fileName));
    } else {
        fallbackExport(blob, fileName);
    }
}

/**
 * Fallback export using anchor download.
 * @param {Blob} blob
 * @param {string} fileName
 */
function fallbackExport(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Load a text file using File Picker API or fallback input.
 */
export function loadFile() {
    if ('showOpenFilePicker' in window) {
        window.showOpenFilePicker({
            types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }],
            multiple: false
        }).then(async (handles) => {
            const file = await handles[0].getFile();
            const content = await file.text();
            textarea.value = content;
            state.lastSavedContent = content;
            saveText();
            updateSaveStatus(false);
        }).catch(() => fallbackLoad());
    } else {
        fallbackLoad();
    }
}

/**
 * Fallback load using hidden file input.
 */
function fallbackLoad() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            textarea.value = ev.target.result;
            state.lastSavedContent = ev.target.result;
            saveText();
            updateSaveStatus(false);
        };
        reader.readAsText(file, 'UTF-8');
    });
    input.click();
}

/**
 * Check if text is selected.
 * @returns {boolean}
 */
export function hasSelection() {
    return textarea.selectionStart !== textarea.selectionEnd;
}

/**
 * Get selected text.
 * @returns {string}
 */
export function getSelectedText() {
    return textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
}

/**
 * Get selection start index.
 * @returns {number}
 */
export function getSelectionStart() {
    return textarea.selectionStart;
}

/**
 * Get selection end index.
 * @returns {number}
 */
export function getSelectionEnd() {
    return textarea.selectionEnd;
}