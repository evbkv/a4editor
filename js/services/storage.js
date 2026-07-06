/**
 * Storage service: persistent key-value storage using localStorage.
 * Handles settings, content, prompts, and AI keys.
 */

/**
 * Load all settings from localStorage.
 * @returns {Object} Settings object
 */
export function loadSettings() {
    const theme = localStorage.getItem('editorTheme') || null;
    const font = localStorage.getItem('editorFont') || null;
    const fontSize = localStorage.getItem('editorFontSize') || null;
    const aiProvider = localStorage.getItem('aiProvider') || 'None';
    const aiKey = loadAIKey(aiProvider);
    return { theme, font, fontSize, aiProvider, aiKey };
}

/**
 * Save a single setting.
 * @param {string} key - Setting key
 * @param {*} value - Setting value
 */
export function saveSetting(key, value) {
    localStorage.setItem(key, value);
    if (key === 'aiProvider') {
        document.cookie = `aiProvider=${value}; path=/; max-age=31536000`;
    }
}

/**
 * Save an API key for a provider.
 * @param {string} provider - 'DeepSeek' etc.
 * @param {string} key - API key
 */
export function saveAIKey(provider, key) {
    const storageKey = `aiApiKey_${provider}`;
    localStorage.setItem(storageKey, key);
    document.cookie = `aiApiKey_${provider}=${key}; path=/; max-age=31536000`;
}

/**
 * Load an API key for a provider.
 * @param {string} provider
 * @returns {string}
 */
export function loadAIKey(provider) {
    const storageKey = `aiApiKey_${provider}`;
    return localStorage.getItem(storageKey) || '';
}

/**
 * Load editor content from localStorage.
 * @returns {string}
 */
export function loadContent() {
    return localStorage.getItem('editorContent') || '';
}

/**
 * Save editor content to localStorage.
 * @param {string} content
 */
export function saveContent(content) {
    localStorage.setItem('editorContent', content);
}

/**
 * Load saved prompt templates from localStorage.
 * @returns {Array<{id, name, text, createdAt}>}
 */
export function loadPrompts() {
    try {
        const data = localStorage.getItem('userPrompts');
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Save prompt templates to localStorage.
 * @param {Array} prompts
 */
export function savePrompts(prompts) {
    localStorage.setItem('userPrompts', JSON.stringify(prompts));
}

/**
 * Add a new prompt template.
 * @param {string} name
 * @param {string} text
 * @returns {Object} The created prompt object
 */
export function addPrompt(name, text) {
    const prompts = loadPrompts();
    const newPrompt = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name: name.trim(),
        text: text.trim(),
        createdAt: Date.now()
    };
    prompts.push(newPrompt);
    savePrompts(prompts);
    return newPrompt;
}

/**
 * Update an existing prompt.
 * @param {string} id
 * @param {string} name
 * @param {string} text
 * @returns {Object|null} Updated prompt or null if not found
 */
export function updatePrompt(id, name, text) {
    const prompts = loadPrompts();
    const index = prompts.findIndex(p => p.id === id);
    if (index !== -1) {
        prompts[index].name = name.trim();
        prompts[index].text = text.trim();
        prompts[index].createdAt = Date.now();
        savePrompts(prompts);
        return prompts[index];
    }
    return null;
}

/**
 * Delete a prompt by id.
 * @param {string} id
 */
export function deletePrompt(id) {
    let prompts = loadPrompts();
    prompts = prompts.filter(p => p.id !== id);
    savePrompts(prompts);
}

/**
 * Get a prompt by id.
 * @param {string} id
 * @returns {Object|null}
 */
export function getPrompt(id) {
    const prompts = loadPrompts();
    return prompts.find(p => p.id === id) || null;
}