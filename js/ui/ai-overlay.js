/**
 * AI overlay UI logic: opening, closing, sending prompts, managing prompt templates.
 */

import { state, setState } from '../state.js';
import { autoResize } from '../utils/helpers.js';
import { getText, setText, saveText, hasSelection, getSelectedText } from '../core/editor.js';
import { sendPromptToAI, getBalance } from '../services/ai-service.js';
import { loadPrompts, savePrompts, addPrompt, updatePrompt, deletePrompt, getPrompt } from '../services/storage.js';
import { trackEvent } from '../services/analytics.js';

const aiOverlay = document.getElementById('ai-overlay');
const aiOverlayClose = document.getElementById('ai-overlay-close');
const aiPromptInput = document.getElementById('ai-prompt-input');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiPromptsRow = document.getElementById('ai-prompts-row');
const aiResult = document.getElementById('ai-result');
const aiActions = document.getElementById('ai-actions');
const aiDonate = document.getElementById('ai-donate');
const aiLabelText = document.getElementById('ai-label-text');
const aiBalanceElement = document.getElementById('ai-balance');
const aiClearLink = document.getElementById('ai-clear');

const promptModalOverlay = document.getElementById('prompt-modal-overlay');
const promptModalContainer = document.getElementById('prompt-modal-container');
const promptModal = document.getElementById('prompt-modal');
const promptModalClose = document.getElementById('prompt-modal-close');
const promptModalTitle = document.getElementById('prompt-modal-title');
const promptModalName = document.getElementById('prompt-modal-name');
const promptModalText = document.getElementById('prompt-modal-text');
const promptModalSave = document.getElementById('prompt-modal-save');
const promptModalDelete = document.getElementById('prompt-modal-delete');

const VISIBLE_PROMPTS_COUNT = 5; // Number of prompt chips shown before "More" button
const HOLD_DELAY = 500; // ms for long-press to show edit button
const HIDE_DELAY = 1000; // ms to hide edit button after mouse leave

let showAllPrompts = false;
let _closeMenu = null;
let editingPromptId = null;
let promptModalResizeListener = null;
let _pushState = null;
let _popState = null;

export function setCloseMenu(fn) {
    _closeMenu = fn;
}

export function isAIWindowOpen() {
    return state.isAIWindowOpen;
}

export function isPromptModalOpen() {
    return promptModalOverlay.style.visibility === 'visible';
}

/**
 * Close the prompt modal (create/edit).
 */
export function closePromptModal() {
    if (promptModalOverlay.style.visibility !== 'visible') return;
    promptModalOverlay.style.visibility = 'hidden';
    promptModalContainer.style.visibility = 'hidden';
    promptModalName.value = '';
    promptModalText.value = '';
    editingPromptId = null;
    promptModalDelete.style.display = 'none';
    if (window.visualViewport && promptModalResizeListener) {
        window.visualViewport.removeEventListener('resize', promptModalResizeListener);
        window.visualViewport.removeEventListener('scroll', promptModalResizeListener);
        promptModalResizeListener = null;
    } else {
        window.removeEventListener('resize', updatePromptModalSize);
        window.removeEventListener('scroll', updatePromptModalSize);
    }
    if (_popState) {
        _popState();
    }
}

/**
 * Format balance data for display.
 * @param {Object} balanceData
 * @returns {string}
 */
function formatBalance(balanceData) {
    if (!balanceData || !balanceData.balance_infos || balanceData.balance_infos.length === 0) {
        return 'N/A';
    }
    const info = balanceData.balance_infos[0];
    const currency = info.currency || 'CNY';
    const total = parseFloat(info.total_balance || 0).toFixed(2);
    return total + ' ' + currency;
}

function updateBalanceDisplay(text) {
    aiBalanceElement.textContent = text;
}

function displayCachedBalance() {
    if (state.cachedBalance !== null) {
        updateBalanceDisplay(formatBalance(state.cachedBalance));
        return true;
    }
    return false;
}

/**
 * Refresh the balance display.
 * @param {string} apiKey
 * @param {boolean} force - force fetch even if cached
 */
async function refreshBalance(apiKey, force = false) {
    if (!apiKey) {
        updateBalanceDisplay('No key');
        state.cachedBalance = null;
        return;
    }

    if (!force && state.cachedBalance !== null) {
        updateBalanceDisplay(formatBalance(state.cachedBalance));
        return;
    }

    updateBalanceDisplay('...');
    try {
        const data = await getBalance(apiKey);
        state.cachedBalance = data;
        updateBalanceDisplay(formatBalance(data));
    } catch (err) {
        if (err.message.includes('Invalid API key')) {
            updateBalanceDisplay('Invalid key');
        } else if (err.message.includes('Rate limit')) {
            updateBalanceDisplay('Rate limit');
        } else if (err.message.includes('Server error')) {
            updateBalanceDisplay('Server error');
        } else {
            updateBalanceDisplay('Error');
        }
        state.cachedBalance = null;
        console.error('Balance fetch error:', err);
    }
}

/**
 * Open the AI overlay window.
 */
export function openAIWindow() {
    if (state.isAIWindowOpen) return;
    if (state.currentAIProvider === 'None') {
        return;
    }
    if (state.isMenuOpen && _closeMenu) {
        _closeMenu();
    }

    const textarea = document.getElementById('main-textarea');
    const hasSel = textarea.selectionStart !== textarea.selectionEnd;
    const selText = hasSel ? textarea.value.substring(textarea.selectionStart, textarea.selectionEnd) : '';
    state.hasSelection = hasSel;
    state.selectedText = selText;
    aiLabelText.textContent = hasSel ? 'Selected text' : 'All text';

    aiResult.textContent = '';
    aiPromptInput.value = '';
    aiActions.style.display = 'none';
    aiDonate.style.display = 'none';
    aiOverlay.style.visibility = 'visible';
    setState('isAIWindowOpen', true);
    autoResize(aiPromptInput);
    setTimeout(() => aiPromptInput.focus(), 100);

    showAllPrompts = false;
    renderPrompts();
    initEditButtons();
    initActionButtons();

    const hasCached = displayCachedBalance();
    if (state.currentAIKey) {
        if (!hasCached) {
            refreshBalance(state.currentAIKey, true);
        } else {
            refreshBalance(state.currentAIKey, false);
        }
    } else {
        updateBalanceDisplay('No key');
    }

    if (_pushState) {
        _pushState('ai');
    }

    trackEvent('ai_window_open');
}

/**
 * Close the AI overlay window.
 */
export function closeAIWindow() {
    if (!state.isAIWindowOpen) return;
    state.hasSelection = false;
    state.selectedText = '';
    aiResult.textContent = '';
    aiPromptInput.value = '';
    aiActions.style.display = 'none';
    aiDonate.style.display = 'none';
    aiLabelText.textContent = 'All text';
    aiOverlay.style.visibility = 'hidden';
    setState('isAIWindowOpen', false);
    autoResize(aiPromptInput);

    showAllPrompts = false;
    renderPrompts();

    if (_popState) {
        _popState();
    }
}

/**
 * Update prompt modal container size based on visual viewport.
 */
function updatePromptModalSize() {
    if (!promptModalContainer) return;
    if (window.visualViewport) {
        const vv = window.visualViewport;
        promptModalContainer.style.top = vv.offsetTop + 'px';
        promptModalContainer.style.height = vv.height + 'px';
        promptModalContainer.style.width = vv.width + 'px';
    } else {
        promptModalContainer.style.top = '0px';
        promptModalContainer.style.height = window.innerHeight + 'px';
        promptModalContainer.style.width = window.innerWidth + 'px';
    }
}

/**
 * Initialize the AI overlay and its subcomponents.
 * @param {Function} pushState - callback to push window state
 * @param {Function} popState - callback to pop window state
 */
export function initAIOverlay(pushState, popState) {
    _pushState = pushState;
    _popState = popState;

    aiDonate.style.display = 'none';

    aiOverlayClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAIWindow();
    });

    aiPromptInput.addEventListener('input', function() {
        autoResize(this);
    });

    // Keyboard shortcuts: Ctrl+Enter to send, Enter for new line
    aiPromptInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const prompt = this.value.trim();
            if (prompt) {
                sendPrompt(prompt);
            }
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + '\n' + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
            autoResize(this);
        }
    });

    aiSendBtn.addEventListener('click', function() {
        const prompt = aiPromptInput.value.trim();
        if (prompt) {
            sendPrompt(prompt);
        }
    });

    aiClearLink.addEventListener('click', function() {
        aiPromptInput.value = '';
        aiResult.textContent = '';
        aiActions.style.display = 'none';
        aiDonate.style.display = 'none';
        autoResize(aiPromptInput);
    });

    const moreBtn = document.querySelector('.ai-prompt-more');
    if (moreBtn) {
        moreBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showAllPrompts = !showAllPrompts;
            renderPrompts();
        });
    }

    const addBtn = document.querySelector('.ai-prompt-add');
    if (addBtn) {
        addBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openPromptModal('new');
        });
    }

    promptModalClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closePromptModal();
    });

    promptModalOverlay.addEventListener('click', (e) => {
        if (e.target === promptModalOverlay) {
            closePromptModal();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (promptModalOverlay.style.visibility === 'visible') {
                closePromptModal();
                e.preventDefault();
            }
        }
    });

    promptModalSave.addEventListener('click', function() {
        const name = promptModalName.value.trim();
        const text = promptModalText.value.trim();
        if (!name || !text) {
            alert('Please fill in both name and text.');
            return;
        }
        if (editingPromptId) {
            updatePrompt(editingPromptId, name, text);
        } else {
            addPrompt(name, text);
        }
        closePromptModal();
        renderPrompts();
        initEditButtons();
        initActionButtons();
    });

    promptModalDelete.addEventListener('click', function() {
        if (editingPromptId) {
            if (confirm('Delete this prompt?')) {
                deletePrompt(editingPromptId);
                closePromptModal();
                renderPrompts();
                initEditButtons();
                initActionButtons();
            }
        }
    });

    renderPrompts();
    initEditButtons();
    initActionButtons();
}

/**
 * Send a prompt to AI and handle the response.
 * @param {string} prompt - The user prompt
 */
function sendPrompt(prompt) {
    const apiKey = state.currentAIKey;
    const textToSend = state.hasSelection ? state.selectedText : getText();

    if (!apiKey) {
        aiResult.textContent = 'Error: API key is required. Please set your API key in the menu.';
        aiActions.style.display = 'none';
        aiDonate.style.display = 'none';
        updateBalanceDisplay('No key');
        return;
    }

    aiResult.textContent = 'Processing...';
    aiActions.style.display = 'none';
    aiDonate.style.display = 'none';

    trackEvent('ai_prompt_sent', { promptLength: prompt.length });

    sendPromptToAI(prompt, textToSend, apiKey)
        .then(result => {
            aiResult.textContent = result.content;
            aiActions.style.display = 'flex';
            aiDonate.style.display = 'block';
            refreshBalance(apiKey, true);
        })
        .catch(err => {
            aiResult.textContent = 'Error: ' + err.message;
            aiActions.style.display = 'none';
            aiDonate.style.display = 'none';
            if (err.message.includes('Invalid API key')) {
                updateBalanceDisplay('Invalid key');
            } else if (err.message.includes('Insufficient balance')) {
                updateBalanceDisplay('Insufficient balance');
            } else if (err.message.includes('Too many requests')) {
                updateBalanceDisplay('Rate limit');
            } else if (err.message.includes('Server error')) {
                updateBalanceDisplay('Server error');
            } else {
                updateBalanceDisplay('Error');
            }
        });
}

/**
 * Render the prompt chips in the AI overlay.
 */
export function renderPrompts() {
    const prompts = loadPrompts();
    const sorted = prompts.slice().sort((a, b) => b.createdAt - a.createdAt);

    const existingChips = aiPromptsRow.querySelectorAll('.ai-prompt-chip:not(.ai-prompt-more):not(.ai-prompt-add)');
    existingChips.forEach(chip => chip.remove());

    const moreBtn = aiPromptsRow.querySelector('.ai-prompt-more');
    const addBtn = aiPromptsRow.querySelector('.ai-prompt-add');

    let visibleCount = sorted.length;
    if (sorted.length > VISIBLE_PROMPTS_COUNT && !showAllPrompts) {
        visibleCount = VISIBLE_PROMPTS_COUNT;
    }

    sorted.forEach((prompt, index) => {
        const chip = document.createElement('div');
        chip.className = 'ai-prompt-chip';
        chip.textContent = prompt.name;
        chip.dataset.id = prompt.id;
        if (index >= visibleCount && !showAllPrompts) {
            chip.style.display = 'none';
        }
        chip.addEventListener('click', function(e) {
            if (e.target.closest('.edit-btn')) return;
            sendPrompt(prompt.text);
        });
        chip.addEventListener('contextmenu', function(e) {
            e.preventDefault();
        });
        aiPromptsRow.insertBefore(chip, moreBtn);
    });

    if (sorted.length > VISIBLE_PROMPTS_COUNT) {
        moreBtn.style.display = '';
        if (showAllPrompts) {
            moreBtn.classList.add('open');
        } else {
            moreBtn.classList.remove('open');
        }
    } else {
        moreBtn.style.display = 'none';
    }
}

/**
 * Initialize edit buttons (three dots) for each prompt chip.
 */
export function initEditButtons() {
    const allChips = aiPromptsRow.querySelectorAll('.ai-prompt-chip:not(.ai-prompt-more):not(.ai-prompt-add)');
    allChips.forEach(chip => {
        if (chip.querySelector('.edit-btn')) return;

        const btn = document.createElement('span');
        btn.className = 'edit-btn';
        btn.innerHTML = `
            <svg viewBox="0 0 16 16" width="12" height="12">
                <circle cx="3.5" cy="8" r="1.2" fill="white" />
                <circle cx="8" cy="8" r="1.2" fill="white" />
                <circle cx="12.5" cy="8" r="1.2" fill="white" />
            </svg>
        `;
        chip.appendChild(btn);

        let holdTimer = null;
        let hideTimer = null;
        let isLongPress = false;

        // Mouse hover shows edit button after a delay
        chip.addEventListener('mouseenter', function() {
            clearTimeout(hideTimer);
            holdTimer = setTimeout(() => {
                chip.classList.add('show-edit');
            }, HOLD_DELAY);
        });

        chip.addEventListener('mouseleave', function() {
            clearTimeout(holdTimer);
            hideTimer = setTimeout(() => {
                chip.classList.remove('show-edit');
            }, HIDE_DELAY);
        });

        // Touch long-press to open edit modal
        chip.addEventListener('touchstart', function(e) {
            isLongPress = false;
            holdTimer = setTimeout(() => {
                isLongPress = true;
                const id = this.dataset.id;
                const prompt = getPrompt(id);
                if (prompt) {
                    editingPromptId = id;
                    openPromptModal('edit', prompt);
                }
            }, HOLD_DELAY);
        }, { passive: true });

        chip.addEventListener('touchend', function(e) {
            clearTimeout(holdTimer);
            if (isLongPress) {
                e.preventDefault();
            }
        });

        chip.addEventListener('touchcancel', function(e) {
            clearTimeout(holdTimer);
            isLongPress = false;
        });

        // Click on edit button opens edit modal
        chip.addEventListener('click', function(e) {
            if (isLongPress) {
                isLongPress = false;
                return;
            }
            if (e.target === btn || btn.contains(e.target)) {
                e.stopPropagation();
                const id = this.dataset.id;
                const prompt = getPrompt(id);
                if (prompt) {
                    editingPromptId = id;
                    openPromptModal('edit', prompt);
                }
                return;
            }
        });
    });
}

/**
 * Initialize action buttons (Change, Insert, Copy).
 */
function initActionButtons() {
    document.querySelectorAll('.ai-action-btn').forEach(btn => {
        btn.removeEventListener('click', handleActionClick);
        btn.addEventListener('click', handleActionClick);
    });
}

/**
 * Handle clicks on action buttons.
 */
function handleActionClick() {
    const action = this.textContent.trim();
    const resultText = aiResult.textContent;
    if (!resultText) return;

    if (action === 'Change') {
        setText(resultText);
        saveText();
        closeAIWindow();
        trackEvent('ai_result_changed');
    } else if (action === 'Insert') {
        const textarea = document.getElementById('main-textarea');
        const current = textarea.value;
        textarea.value = current + (current ? '\n' : '') + resultText;
        saveText();
        closeAIWindow();
        trackEvent('ai_result_inserted');
    } else if (action === 'Copy') {
        navigator.clipboard.writeText(resultText).then(() => {
            console.log('Copied to clipboard');
        });
        trackEvent('ai_result_copied');
    }
}

/**
 * Open the prompt modal (create or edit).
 * @param {string} mode - 'new' or 'edit'
 * @param {Object} promptData - prompt object for editing
 */
function openPromptModal(mode, promptData) {
    if (mode === 'new') {
        promptModalTitle.textContent = 'New Prompt';
        promptModalName.value = '';
        promptModalText.value = aiPromptInput.value || '';
        editingPromptId = null;
        promptModalDelete.style.display = 'none';
    } else if (mode === 'edit' && promptData) {
        promptModalTitle.textContent = 'Edit Prompt';
        promptModalName.value = promptData.name;
        promptModalText.value = promptData.text;
        editingPromptId = promptData.id;
        promptModalDelete.style.display = '';
    }
    promptModalOverlay.style.visibility = 'visible';
    promptModalContainer.style.visibility = 'visible';
    updatePromptModalSize();
    if (window.visualViewport) {
        if (promptModalResizeListener) {
            window.visualViewport.removeEventListener('resize', promptModalResizeListener);
            window.visualViewport.removeEventListener('scroll', promptModalResizeListener);
        }
        promptModalResizeListener = updatePromptModalSize;
        window.visualViewport.addEventListener('resize', promptModalResizeListener);
        window.visualViewport.addEventListener('scroll', promptModalResizeListener);
    } else {
        window.addEventListener('resize', updatePromptModalSize);
        window.addEventListener('scroll', updatePromptModalSize);
    }
    setTimeout(() => promptModalName.focus(), 100);
    if (_pushState) {
        _pushState('prompt');
    }
}