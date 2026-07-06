/**
 * AI service: sends prompts to the backend proxy and retrieves responses.
 */

/**
 * Send a prompt with text to the AI backend.
 * @param {string} prompt - The instruction prompt
 * @param {string} text - The text to process
 * @param {string} apiKey - DeepSeek API key
 * @returns {Promise<{content: string, tokens: number}>}
 */
export async function sendPromptToAI(prompt, text, apiKey) {
    const messages = [
        { role: "system", content: prompt },
        { role: "user", content: text }
    ];

    const response = await fetch('./proxy/index.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey, messages })
    });

    if (!response.ok) {
        let errorMsg = 'AI request failed';
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMsg = errorData.error;
            }
        } catch (e) {
            // ignore
        }
        
        // Provide user-friendly error messages based on status codes
        if (response.status === 401) {
            errorMsg = 'Invalid API key. Please check your key and try again.';
        } else if (response.status === 402 || response.status === 403) {
            errorMsg = 'Insufficient balance or payment required. Please top up your account.';
        } else if (response.status === 429) {
            errorMsg = 'Too many requests. Please wait and try again later.';
        } else if (response.status >= 500) {
            errorMsg = 'Server error. Please try again later.';
        }
        
        throw new Error(errorMsg);
    }

    const data = await response.json();
    if (data && data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
        const content = data.choices[0].message.content;
        const tokens = data.usage && data.usage.total_tokens ? data.usage.total_tokens : 0;
        return { content, tokens };
    } else {
        throw new Error('Invalid response from AI');
    }
}

/**
 * Fetch the user's balance from the backend.
 * @param {string} apiKey - DeepSeek API key
 * @returns {Promise<Object>} Balance data
 */
export async function getBalance(apiKey) {
    const response = await fetch('./proxy/index.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'balance', apiKey })
    });

    if (!response.ok) {
        let errorMsg = 'Failed to fetch balance';
        try {
            const errorData = await response.json();
            if (errorData.error) {
                errorMsg = errorData.error;
            }
        } catch (e) {
            // ignore
        }
        
        if (response.status === 401) {
            errorMsg = 'Invalid API key';
        } else if (response.status === 429) {
            errorMsg = 'Rate limit exceeded';
        } else if (response.status >= 500) {
            errorMsg = 'Server error';
        }
        
        throw new Error(errorMsg);
    }

    const data = await response.json();
    return data;
}