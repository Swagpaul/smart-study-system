// ================= DEADLINE MODULE =================

function updateDeadlines() {
    const tasks = document.querySelectorAll(".task");

    tasks.forEach(task => {

        const checkbox = task.querySelector(".task-checkbox");
        if (checkbox.checked) return;

        const deadlineInput = task.querySelector(".deadline-input");
        const fill = task.querySelector(".deadline-fill");
        const timeText = task.querySelector(".time-left");

        if (!deadlineInput.value) return;

        const now = new Date();
        const deadline = new Date();

        const [hours, minutes] = deadlineInput.value.split(":");
        deadline.setHours(hours);
        deadline.setMinutes(minutes);
        deadline.setSeconds(0);

        let diff = deadline - now;

        if (diff <= 0) {
            fill.style.width = "0%";
            fill.style.background = "#ef4444";
            timeText.innerText = "Deadline passed";
            return;
        }

        const totalDay = 24 * 60 * 60 * 1000;
        let percentage = (diff / totalDay) * 100;
        fill.style.width = percentage + "%";

        const hue = (percentage / 100) * 120;
        fill.style.background = `hsl(${hue}, 90%, 50%)`;

        let hoursLeft = Math.floor(diff / (1000 * 60 * 60));
        let minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        timeText.innerText = hoursLeft + "h " + minutesLeft + "m left";
    });
}

setInterval(updateDeadlines, 1000);