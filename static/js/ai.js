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

    function appendMessage(text, sender) {

        const div = document.createElement("div");
        div.style.marginBottom = "10px";
        div.style.padding = "8px 12px";
        div.style.borderRadius = "10px";
        div.style.maxWidth = "82%";

        if (sender === "user") {
            div.style.marginLeft = "18%";
            div.style.marginRight = "0";
            div.style.background = "rgba(34, 197, 94, 0.14)";
            div.style.color = "#f8fffa";
            div.style.textAlign = "right";
            div.innerHTML = "<strong>You:</strong> " + text;
        } else {
            div.style.marginRight = "18%";
            div.style.marginLeft = "0";
            div.style.background = "rgba(59, 130, 246, 0.2)";
            div.style.color = "#e2edff";
            div.style.textAlign = "left";
            div.innerHTML = "<strong>AI:</strong> " + text;
        }

        chatBox.appendChild(div);
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