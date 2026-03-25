// ================= TASK MODULE =================
console.log("TASK MODULE LOADED");
let taskContainer;
let addTaskBtn;
let progressFill;
let progressText;

function initializeTasks() {
    console.log("initializeTasks called");

    taskContainer = document.getElementById("task-container");
    addTaskBtn = document.getElementById("add-task-btn");

    console.log("Button found:", addTaskBtn);
    console.log("Container found:", taskContainer);
    progressFill = document.getElementById("progress-fill");
    progressText = document.getElementById("progress-text");

    if (!taskContainer || !addTaskBtn) return;

    addTaskBtn.addEventListener("click", async function() {
        try {
            const response = await fetch("/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: "New Task",
                    deadline: "",
                    completed: false,
                    date: new Date().toISOString().split("T")[0],
                    priority: "medium"
                })
            });
            if (!response.ok) {
                console.error("Failed to add task:", response.status, response.statusText);
                return;
            }
            await window.loadTasksByDate();
        } catch (error) {
            console.error("Error adding task:", error);
        }
    });

    window.loadTasksByDate();
}

window.loadTasksByDate = async function(date = null) {

    let url = "/tasks";
    if (date) {
        url += `?date=${date}`;
    }

    const response = await fetch(url);
    const tasks = await response.json();

    taskContainer.innerHTML = "";

    tasks.forEach(task => {
        createTaskElement(task);
    });

    updateProgress();
}

function createTaskElement(taskData) {

    const task = document.createElement("div");
    task.className = "task";
    task.dataset.id = taskData.id;

    const priority = taskData.priority || "medium";

    task.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${taskData.completed ? "checked" : ""}>
        <div class="priority-selector">
            <button class="priority-dot low ${priority === "low" ? "active" : ""}" data-priority="low" title="Low priority"></button>
            <button class="priority-dot medium ${priority === "medium" ? "active" : ""}" data-priority="medium" title="Medium priority"></button>
            <button class="priority-dot high ${priority === "high" ? "active" : ""}" data-priority="high" title="High priority"></button>
        </div>
        <span contenteditable="true">${taskData.title}</span>
        <input type="time" class="deadline-input" value="${taskData.deadline || ""}">
        <div class="deadline-bar">
            <div class="deadline-fill"></div>
        </div>
        <p class="time-left"></p>
        <button class="delete-btn">🗑</button>
    `;

    const checkbox = task.querySelector(".task-checkbox");
    const title = task.querySelector("span");
    const deadlineInput = task.querySelector(".deadline-input");
    const deleteBtn = task.querySelector(".delete-btn");

    if (taskData.completed) {
        task.classList.add("completed");
    }

    checkbox.addEventListener("change", async function() {
        await fetch(`/tasks/${task.dataset.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: this.checked })
        });

        task.classList.toggle("completed");
        updateProgress();
    });

    title.addEventListener("blur", async function() {
        await fetch(`/tasks/${task.dataset.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: this.innerText })
        });
    });

    deadlineInput.addEventListener("change", async function() {
        await fetch(`/tasks/${task.dataset.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deadline: this.value })
        });
    });

    deleteBtn.addEventListener("click", async function() {
        await fetch(`/tasks/${task.dataset.id}`, {
            method: "DELETE"
        });

        task.remove();
        updateProgress();
    });

    const priorityDots = task.querySelectorAll(".priority-dot");

    function setPriorityState(selectedPriority) {
        priorityDots.forEach(d => {
            if (d.dataset.priority === selectedPriority) {
                d.classList.add("active");
            } else {
                d.classList.remove("active");
            }
            d.classList.remove("disabled");
            d.disabled = false;
        });
    }

    setPriorityState(priority);

    priorityDots.forEach(dot => {
        dot.addEventListener("click", async function() {
            const selectedPriority = this.dataset.priority;
            const isCurrentlyActive = this.classList.contains("active");

            if (isCurrentlyActive) {
                // Deselect current priority, reset task priority
                setPriorityState(null);
                await fetch(`/tasks/${task.dataset.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ priority: "" })
                });

                return;
            }

            await fetch(`/tasks/${task.dataset.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ priority: selectedPriority })
            });

            setPriorityState(selectedPriority);
        });
    });

    taskContainer.appendChild(task);
}

function updateProgress() {
    const checkboxes = document.querySelectorAll(".task-checkbox");

    let total = checkboxes.length;
    let completed = 0;

    checkboxes.forEach(box => {
        if (box.checked) completed++;
    });

    let percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    // calculate color from red (0%) to green (100%)
    const hue = Math.round((percent / 100) * 120); // 0=red,120=green
    const colour = `hsl(${hue}, 100%, 45%)`;

    progressFill.style.width = percent + "%";
    progressFill.style.background = colour;
    progressText.innerText = percent + "%";
}