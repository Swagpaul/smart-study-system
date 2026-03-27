// ================= STUDY CHATBOT MODULE =================
// Self-contained chatbot with rich UI, no external API dependency

console.log("CHATBOT MODULE LOADED");

document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("send-btn");
    const suggestionsContainer = document.getElementById("chat-suggestions");

    if (!chatBox || !chatInput || !sendBtn) {
        console.log("Chatbot elements not found");
        return;
    }

    let messageHistory = [];

    // ---- Suggestion Chips ----
    const suggestions = [
        "What is an algorithm?",
        "Explain binary search",
        "Tips for exam prep",
        "What is OOP?",
        "How does recursion work?",
        "Study techniques",
        "What is a database?",
        "Explain polymorphism",
    ];

    function renderSuggestions() {
        if (!suggestionsContainer) return;
        suggestionsContainer.innerHTML = "";
        // Pick 4 random suggestions
        const shuffled = [...suggestions].sort(() => 0.5 - Math.random()).slice(0, 4);
        shuffled.forEach((text) => {
            const chip = document.createElement("button");
            chip.className = "suggestion-chip";
            chip.textContent = text;
            chip.addEventListener("click", () => {
                chatInput.value = text;
                handleSend();
            });
            suggestionsContainer.appendChild(chip);
        });
    }

    // ---- Message rendering ----
    function formatBotText(text) {
        // Convert **bold** to <strong>
        text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        // Convert `code` to <code>
        text = text.replace(/`(.*?)`/g, "<code>$1</code>");
        // Convert newlines to <br>
        text = text.replace(/\n/g, "<br>");
        // Convert bullet points
        text = text.replace(/^[-•]\s*/gm, "• ");
        return text;
    }

    function appendMessage(text, sender, animate = true) {
        const wrapper = document.createElement("div");
        wrapper.className = `chat-message chat-${sender}`;
        if (animate) wrapper.classList.add("chat-animate-in");

        const bubble = document.createElement("div");
        bubble.className = `chat-bubble chat-bubble-${sender}`;

        const label = document.createElement("span");
        label.className = "chat-label";
        label.textContent = sender === "user" ? "You" : "StudyBot";

        const content = document.createElement("div");
        content.className = "chat-content";

        if (sender === "bot") {
            content.innerHTML = formatBotText(text);
        } else {
            content.textContent = text;
        }

        bubble.appendChild(label);
        bubble.appendChild(content);
        wrapper.appendChild(bubble);
        chatBox.appendChild(wrapper);
        chatBox.scrollTop = chatBox.scrollHeight;

        messageHistory.push({ text, sender });
        return wrapper;
    }

    function showTypingIndicator() {
        const wrapper = document.createElement("div");
        wrapper.className = "chat-message chat-bot chat-animate-in";
        wrapper.id = "typing-indicator";

        const bubble = document.createElement("div");
        bubble.className = "chat-bubble chat-bubble-bot";

        const label = document.createElement("span");
        label.className = "chat-label";
        label.textContent = "StudyBot";

        const dots = document.createElement("div");
        dots.className = "typing-dots";
        dots.innerHTML = '<span></span><span></span><span></span>';

        bubble.appendChild(label);
        bubble.appendChild(dots);
        wrapper.appendChild(bubble);
        chatBox.appendChild(wrapper);
        chatBox.scrollTop = chatBox.scrollHeight;
        return wrapper;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById("typing-indicator");
        if (indicator) indicator.remove();
    }

    // ---- Send logic ----
    async function handleSend() {
        const message = chatInput.value.trim();
        if (!message) return;

        appendMessage(message, "user");
        chatInput.value = "";

        // Hide suggestions after first message
        if (suggestionsContainer) {
            suggestionsContainer.style.display = "none";
        }

        const typingEl = showTypingIndicator();

        try {
            const response = await fetch("/api/chatbot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: message }),
            });

            const data = await response.json();
            removeTypingIndicator();

            if (data.reply) {
                appendMessage(data.reply, "bot");
            } else if (data.error) {
                appendMessage("⚠️ " + data.error, "bot");
            } else {
                appendMessage("I couldn't process that. Please try again.", "bot");
            }
        } catch (error) {
            removeTypingIndicator();
            appendMessage("⚠️ Connection error. Please check your server.", "bot");
        }
    }

    sendBtn.addEventListener("click", handleSend);

    chatInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // ---- Welcome message ----
    appendMessage(
        "👋 Hi! I'm **StudyBot**, your study assistant.\n\n" +
        "I can help you with:\n" +
        "• **Programming** — Python, Java, algorithms, data structures\n" +
        "• **Math & Science** — algebra, calculus, physics, chemistry\n" +
        "• **Study tips** — exam prep, time management, focus techniques\n\n" +
        "Ask me anything study-related!",
        "bot",
        false
    );

    renderSuggestions();
});
