// ================= MOTIVATIONAL QUOTES MODULE (LOCAL) =================
// - Replaced Gemini API dependency with a local quote system to prevent quota issues.
// - Updates instantly on section changes.
// - No network calls for quotes.

const quotes = [
    "Discipline beats motivation.",
    "Small progress is still progress.",
    "Focus on consistency, not perfection.",
    "Your future is built today.",
    "Do it even when you don’t feel like it.",
    "Success is earned daily.",
    "Stay hard when it gets hard.",
    "One task at a time.",
    "Make yourself proud.",
    "Win the day.",
    "Progress over excuses.",
    "Deep work creates real results.",
    "You are what you repeatedly do.",
    "Push beyond your limits.",
    "Effort never goes to waste.",
    "Start now, not later.",
    "Your habits define you.",
    "Keep moving forward.",
    "Focus. Execute. Repeat.",
    "Greatness is built quietly."
];

let lastQuote = "";

/**
 * Returns a random quote from the list, ensuring no consecutive repeats.
 */
function getRandomQuote() {
    let filteredQuotes = quotes;
    if (lastQuote) {
        filteredQuotes = quotes.filter(q => q !== lastQuote);
    }
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const selected = filteredQuotes[randomIndex];
    lastQuote = selected;
    return selected;
}

function setQuoteTextWithFade(quote) {
    const quoteText = document.getElementById("quote-text");
    if (!quoteText) return;

    console.log(`[QuoteUpdate] Setting new quote: "${quote}"`);

    quoteText.classList.remove("quote-loading");
    quoteText.textContent = quote;

    // Restart animation every update
    quoteText.classList.remove("quote-fade-in");
    // Force reflow so the animation re-triggers
    void quoteText.offsetWidth;
    quoteText.classList.add("quote-fade-in");
}

function getActiveScreenIdFromDOM() {
    const active = document.querySelector(".section.active-section");
    if (!active || !active.id) return "dashboard";
    return active.id.replace(/^section-/, "") || "dashboard";
}

/**
 * Main function to update the quote. Now local and instant.
 */
function updateQuoteLocally(screenId) {
    console.log(`[QuoteUpdate] Screen changed to: ${screenId}`);
    const quote = getRandomQuote();
    setQuoteTextWithFade(quote);
}

function initMotivationQuotes() {
    // Initial quote load
    const initialScreen = getActiveScreenIdFromDOM();
    updateQuoteLocally(initialScreen);

    // When menu switches sections, update the quote instantly.
    document.addEventListener("smartplanner:screenchange", (e) => {
        const screen = e && e.detail ? e.detail.screen : null;
        if (!screen) return;
        updateQuoteLocally(screen);
    });
}

// Ensure initialization
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMotivationQuotes);
} else {
    initMotivationQuotes();
}
