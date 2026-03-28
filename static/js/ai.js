// ================= AI MODULE =================

console.log("AI MODULE LOADED");

document.addEventListener("DOMContentLoaded", function() {

    const chatBox = document.getElementById("chat-box");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");

    if (!chatBox || !chatInput || !sendBtn) {
        console.log("AI elements not found");
        return;
    }

    function formatText(text) {
        // Basic Markdown-like formatting to HTML
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }

    function appendMessage(text, sender) {
        const wrapper = document.createElement("div");
        wrapper.className = "chat-message-wrapper " + sender;
        
        const bubble = document.createElement("div");
        bubble.className = "chat-bubble " + sender;
        
        const content = document.createElement("div");
        content.className = "chat-content";
        content.innerHTML = formatText(text);

        const time = document.createElement("div");
        time.className = "chat-time";
        const now = new Date();
        time.innerText = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

        bubble.appendChild(content);
        bubble.appendChild(time);
        wrapper.appendChild(bubble);

        chatBox.appendChild(wrapper);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    sendBtn.addEventListener("click", async function() {

        console.log("Send button clicked");

        const message = chatInput.value.trim();
        if (!message) return;

        appendMessage(message, "user");
        chatInput.value = "";

        appendMessage("Thinking...", "ai");

        try {
            const response = await fetch("/api/ask-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: message })
            });

            const data = await response.json();

            chatBox.lastChild.remove();

            if (data.reply) {
                appendMessage(data.reply, "ai");
            } else if (data.error) {
                appendMessage("Error: " + data.error, "ai");
            } else {
                appendMessage("Unknown response from AI service.", "ai");
            }

        } catch (error) {
            chatBox.lastChild.remove();
            appendMessage("Server error. Please try again.", "ai");
        }

    });

});