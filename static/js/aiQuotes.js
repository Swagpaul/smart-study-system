// ================= MOTIVATIONAL QUOTES MODULE =================
// - Updates only when the active "screen" changes.
// - Generates a quote via the backend AI endpoint (key stays on server).
// - Caches per-screen quotes in localStorage to avoid regeneration on refresh.

const QUOTE_CACHE_PREFIX = "smartplanner_ai_quote_v2:";
const DEFAULT_FALLBACK_QUOTE = "Stay consistent. You're building something great.";

const screenMapForPrompt = {
    dashboard: "general motivation",
    calendar: "planning and discipline",
    timer: "focus and deep work",
    tasks: "productivity and execution",
    history: "productivity and execution",
    ai: "general motivation",
    analytics: "productivity and execution",
};

function normalizeScreenId(screenId) {
    const normalized = (screenId || "").toString().toLowerCase();
    return Object.prototype.hasOwnProperty.call(screenMapForPrompt, normalized)
        ? normalized
        : "dashboard";
}

function getCacheKey(screenId) {
    return QUOTE_CACHE_PREFIX + normalizeScreenId(screenId);
}

function readCachedQuote(screenId) {
    try {
        const raw = localStorage.getItem(getCacheKey(screenId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed.quote === "string" ? parsed.quote : null;
    } catch {
        return null;
    }
}

function writeCachedQuote(screenId, quote) {
    try {
        localStorage.setItem(
            getCacheKey(screenId),
            JSON.stringify({ quote, ts: Date.now() })
        );
    } catch {
        // Ignore storage errors (quota, privacy mode, etc.)
    }
}

// ---------------- AI API call (no UI code here) ----------------
async function fetchAIQuote(screenId, signal) {
    const normalized = normalizeScreenId(screenId);

    try {
        const response = await fetch("/api/motivation-quote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ screen: normalized }),
            signal,
        });

        const data = await response.json().catch(() => ({}));

        if (data && typeof data.quote === "string" && data.quote.trim().length > 0) {
            return {
                quote: data.quote.trim(),
                isFallback: Boolean(data.fallback),
            };
        }
    } catch (err) {
        // Fall back below on network/abort/API errors.
    }

    return { quote: DEFAULT_FALLBACK_QUOTE, isFallback: true };
}

// ---------------- UI + state management ----------------
let activeScreenId = null;
let latestToken = 0;
const pendingPromises = {}; // { [screenId]: Promise<{quote,isFallback}> }

function getActiveScreenIdFromDOM() {
    const active = document.querySelector(".section.active-section");
    if (!active || !active.id) return "calendar";

    // e.g. section-timer -> timer
    return active.id.replace(/^section-/, "") || "calendar";
}

function setLoadingState() {
    const quoteText = document.getElementById("quote-text");
    if (!quoteText) return;
    quoteText.textContent = "Generating motivation...";
    quoteText.classList.add("quote-loading");
}

function setQuoteTextWithFade(quote) {
    const quoteText = document.getElementById("quote-text");
    if (!quoteText) return;

    quoteText.classList.remove("quote-loading");
    quoteText.textContent = quote;

    // Restart animation every update.
    quoteText.classList.remove("quote-fade-in");
    // Force reflow so the animation re-triggers.
    // eslint-disable-next-line no-unused-expressions
    quoteText.offsetWidth;
    quoteText.classList.add("quote-fade-in");
}

async function ensureQuoteForScreen(screenId) {
    const quoteText = document.getElementById("quote-text");
    if (!quoteText) return;

    const normalized = normalizeScreenId(screenId);
    const cached = readCachedQuote(normalized);
    const token = ++latestToken;
    activeScreenId = normalized;

    // If we already have a cached quote for this screen, reuse it.
    if (cached) {
        if (token === latestToken && activeScreenId === normalized) {
            setQuoteTextWithFade(cached);
        }
        return;
    }

    // No cache -> show loading and generate once per screen.
    setLoadingState();

    if (!pendingPromises[normalized]) {
        pendingPromises[normalized] = (async () => fetchAIQuote(normalized))();
    }

    const result = await pendingPromises[normalized];

    // Only update the UI if this screen is still the active one.
    if (token !== latestToken || activeScreenId !== normalized) return;

    if (!result.isFallback) {
        writeCachedQuote(normalized, result.quote);
    }
    delete pendingPromises[normalized];
    setQuoteTextWithFade(result.quote);
}

function initMotivationQuotes() {
    // Hydrate the initial visible section quote.
    ensureQuoteForScreen(getActiveScreenIdFromDOM());

    // When menu switches sections, regenerate only for the newly visible screen.
    document.addEventListener("smartplanner:screenchange", (e) => {
        const screen = e && e.detail ? e.detail.screen : null;
        if (!screen) return;
        ensureQuoteForScreen(screen);
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMotivationQuotes);
} else {
    initMotivationQuotes();
}

