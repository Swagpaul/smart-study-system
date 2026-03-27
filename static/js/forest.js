let currentStage = null;

function getStageRank(stage) {
    const stageOrder = {
        seed: 0,
        sprout: 1,
        young_trees: 2,
        forest: 3,
        lush_forest: 4
    };
    return stageOrder[stage] ?? 0;
}

function playSound(type) {
    const sounds = {
        grow: "/static/sounds/grow.mp3",
        decay: "/static/sounds/decay.mp3"
    };

    if (!sounds[type]) return;

    const audio = new Audio(sounds[type]);
    audio.play().catch(() => {
        // Ignore autoplay or missing file errors.
    });
}

function updateForestVisual(newStage, animate = true) {
    const img = document.getElementById('forest-image');
    const msg = document.getElementById('forest-message');

    if (!img || !msg) return;

    if (animate) {
        img.classList.add('forest-fade-out');

        setTimeout(() => {
            img.src = `/static/images/${newStage}.png`;

            img.classList.remove('forest-fade-out');
            img.classList.add('forest-grow');

            setTimeout(() => {
                img.classList.remove('forest-grow');
            }, 500);
        }, 300);
    } else {
        img.src = `/static/images/${newStage}.png`;
    }

    const messages = {
        seed: "Your journey has begun 🌱",
        sprout: "You're growing steadily 🌿",
        young_trees: "Your consistency is visible 🌳",
        forest: "You're building something powerful 🌲",
        lush_forest: "You've created a thriving ecosystem 🌳✨"
    };

    msg.innerText = messages[newStage] || messages.seed;
}

async function loadForest() {
    try {
        const res = await fetch('/forest-data');
        const data = await res.json();
        const stage = data.stage || 'seed';

        currentStage = stage;
        updateForestVisual(stage, false);
    } catch (err) {
        console.error('Unable to load forest data', err);
    }
}

window.addEventListener("forestUpdate", (e) => {
    const newStage = e?.detail?.stage || 'seed';

    if (newStage !== currentStage) {
        if (currentStage !== null) {
            if (getStageRank(newStage) > getStageRank(currentStage)) {
                playSound("grow");
            } else {
                playSound("decay");
            }
        }

        updateForestVisual(newStage, true);
        currentStage = newStage;
    }
});

window.addEventListener("load", loadForest);
