document.addEventListener('DOMContentLoaded', function () {
    const floating = document.getElementById('feedbackFloating');
    const overlay = document.getElementById('feedbackModalOverlay');
    const closeBtn = document.getElementById('feedbackClose');
    const submitBtn = document.getElementById('feedbackSubmit');
    const messageInput = document.getElementById('feedbackMessage');
    const status = document.getElementById('feedbackStatus');

    if (!floating || !overlay || !closeBtn || !submitBtn || !messageInput || !status) {
        return;
    }

    const openModal = () => {
        overlay.classList.add('open');
        status.textContent = '';
        messageInput.value = '';
        messageInput.focus();
    };

    const closeModal = () => {
        overlay.classList.remove('open');
    };

    floating.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);

    overlay.addEventListener('click', function (event) {
        if (event.target === overlay) {
            closeModal();
        }
    });

    submitBtn.addEventListener('click', async function () {
        const message = messageInput.value.trim();

        if (!message) {
            status.textContent = 'Please write some feedback before submitting.';
            status.style.color = '#f87171';
            return;
        }

        if (message.length > 500) {
            status.textContent = 'Feedback must be 500 characters or fewer.';
            status.style.color = '#f87171';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        try {
            const response = await fetch('/submit-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                status.textContent = data.error || 'Unable to submit feedback. Please try again.';
                status.style.color = '#f87171';
            } else {
                status.textContent = data.message || 'Thanks for your feedback!';
                status.style.color = '#34d399';
                setTimeout(closeModal, 1200);
            }
        } catch (err) {
            status.textContent = 'Network error, please check connection and try again.';
            status.style.color = '#f87171';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Feedback';
        }
    });
});
