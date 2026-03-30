/**
 * API Key Settings Logic
 * Handles user-provided Gemini API key storage and modal interaction.
 */

document.addEventListener('DOMContentLoaded', () => {
    const modalOverlay = document.getElementById('api-modal-overlay');
    const openModalBtn = document.getElementById('open-api-modal');
    const closeModalBtn = document.getElementById('close-api-modal');
    const saveBtn = document.getElementById('save-api-key-btn');
    const clearBtn = document.getElementById('clear-api-key-btn');
    const testBtn = document.getElementById('test-api-key-btn');
    const apiKeyInput = document.getElementById('gemini-api-key');
    const toggleVisibilityBtn = document.getElementById('toggle-key-visibility');
    const statusText = document.getElementById('status-text');
    const apiError = document.getElementById('api-key-error');

    const STORAGE_KEY = 'gemini_user_api_key';

    // Update status based on stored key
    function updateStatus() {
        const storedKey = localStorage.getItem(STORAGE_KEY);
        if (storedKey) {
            statusText.textContent = "Using personal key";
            statusText.className = "status-indicator personal";
            apiKeyInput.value = storedKey;
        } else {
            statusText.textContent = "Using default key";
            statusText.className = "status-indicator default";
            apiKeyInput.value = "";
        }
    }

    // Modal behavior
    openModalBtn.addEventListener('click', () => {
        updateStatus();
        modalOverlay.classList.add('open');
        apiError.style.display = 'none';
        apiError.textContent = '';
    });

    closeModalBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('open');
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('open');
        }
    });

    // Toggle password visibility
    toggleVisibilityBtn.addEventListener('click', () => {
        const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
        apiKeyInput.setAttribute('type', type);
        toggleVisibilityBtn.textContent = type === 'password' ? '👁️' : '🔒';
    });

    // Save key
    saveBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (!key) {
            apiError.textContent = "Please enter a key before saving.";
            apiError.style.display = 'block';
            return;
        }

        localStorage.setItem(STORAGE_KEY, key);
        updateStatus();
        
        // Show success briefly in error field but green
        apiError.style.color = '#22c55e';
        apiError.textContent = "Key saved successfully!";
        apiError.style.display = 'block';
        
        setTimeout(() => {
            apiError.style.display = 'none';
            apiError.style.color = '#f87171'; // reset
            modalOverlay.classList.remove('open');
        }, 1500);
    });

    // Clear key
    clearBtn.addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        updateStatus();
        apiError.style.color = '#22c55e';
        apiError.textContent = "Returned to default key.";
        apiError.style.display = 'block';
        
        setTimeout(() => apiError.style.display = 'none', 2000);
    });

    // Test key
    testBtn.addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        if (!key) {
            apiError.textContent = "Please enter a key to test.";
            apiError.style.display = 'block';
            return;
        }

        testBtn.textContent = "Testing...";
        testBtn.disabled = true;

        try {
            const response = await fetch('/api/test-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: key })
            });

            const data = await response.json();
            if (data.success) {
                apiError.style.color = '#22c55e';
                apiError.textContent = "✅ " + data.message;
            } else {
                apiError.style.color = '#f87171';
                apiError.textContent = "❌ " + (data.error || "Failed to validate key");
            }
            apiError.style.display = 'block';
        } catch (err) {
            apiError.style.color = '#f87171';
            apiError.textContent = "Error testing key: " + err.message;
            apiError.style.display = 'block';
        } finally {
            testBtn.textContent = "Test Key";
            testBtn.disabled = false;
        }
    });

    // Initial check
    updateStatus();
});
