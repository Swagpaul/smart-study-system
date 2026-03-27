// ================= MAIN INITIALIZER =================

document.addEventListener("DOMContentLoaded", function () {

    console.log("DOMContentLoaded fired");

    if (typeof initializeTasks === "function") {
        console.log("initializeTasks is a function, calling it");
        initializeTasks();
    } else {
        console.log("initializeTasks is not a function:", typeof initializeTasks);
    }

    if (typeof initializeHistory === "function") {
        initializeHistory();
    }

});