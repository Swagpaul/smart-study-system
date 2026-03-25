// ================= TIMER MODULE =================

const circle = document.querySelector(".progress-ring-circle");
const timeDisplay = document.getElementById("time-left");
const startBtn = document.getElementById("start-timer");
const pauseBtn = document.getElementById("pause-timer");
const resetBtn = document.getElementById("reset-timer");
const minutesInput = document.getElementById("minutes-input");

if (circle) {

    const radius = 100;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = circumference;

    let totalTime = 0;
    let remainingTime = 0;
    let startTime = null;
    let animationFrame = null;
    let paused = true;

    function updateTimerDisplay(seconds) {
        let minutes = Math.floor(seconds / 60);
        let secs = Math.floor(seconds % 60);

        timeDisplay.textContent =
            String(minutes).padStart(2, "0") + ":" +
            String(secs).padStart(2, "0");
    }

    function updateCircle(progress) {
        const offset = circumference * (1 - progress);
        circle.style.strokeDashoffset = offset;

        // Use neon blue to neon orange gradient
        const hue = 190 + (progress * 20);
        circle.style.stroke = `hsl(${hue}, 100%, 50%)`;
    }

    function animate(timestamp) {
        if (!startTime) startTime = timestamp;

        const elapsed = (timestamp - startTime) / 1000;
        remainingTime = totalTime - elapsed;

        if (remainingTime <= 0) {
            remainingTime = 0;
            paused = true;
            cancelAnimationFrame(animationFrame);
        }

        const progress = remainingTime / totalTime;

        updateTimerDisplay(remainingTime);
        updateCircle(progress);

        if (!paused) {
            animationFrame = requestAnimationFrame(animate);
        }
    }

    startBtn.addEventListener("click", () => {

        if (minutesInput.value) {
            totalTime = minutesInput.value * 60;
        } else {
            totalTime = 1500; // fallback 25 minutes when input is empty
        }

        remainingTime = totalTime;
        startTime = null;
        paused = false;

        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(animate);
    });

    pauseBtn.addEventListener("click", () => {
        paused = true;
        cancelAnimationFrame(animationFrame);
    });

    resetBtn.addEventListener("click", () => {
        paused = true;
        cancelAnimationFrame(animationFrame);

        remainingTime = totalTime;
        startTime = null;

        updateTimerDisplay(totalTime);
        updateCircle(1);
    });

    updateTimerDisplay(totalTime);
    updateCircle(1);
}