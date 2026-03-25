// ================= MENU MODULE WITH SECTION SWITCH =================

const menuItems = document.querySelectorAll(".menu-item");
const sideItems = document.querySelectorAll(".sidebar .nav-item");
const sections = document.querySelectorAll(".section");
const sidebarSectionMap = ["calendar", "timer", "history", "ai"];

function showSection(name) {
    sections.forEach(section => section.classList.remove("active-section"));
    const targetSection = document.getElementById("section-" + name);
    if (targetSection) {
        targetSection.classList.add("active-section");
    }
}

menuItems.forEach(item => {
    item.addEventListener("click", function () {
        menuItems.forEach(i => i.classList.remove("active"));
        this.classList.add("active");

        showSection(this.dataset.section);

        // keep sidebar state reset if sidebar used later
        sideItems.forEach(i => i.classList.remove("active"));
    });
});

sideItems.forEach((item, index) => {
    item.addEventListener("click", function () {
        sideItems.forEach(i => i.classList.remove("active"));
        this.classList.add("active");

        const section = sidebarSectionMap[index] || "timer";
        showSection(section);

        menuItems.forEach(i => i.classList.remove("active"));
        const bottomTarget = document.querySelector(`.menu-item[data-section="${section}"]`);
        if (bottomTarget) 
            bottomTarget.classList.add("active");
    });
});

// initial state
if (sideItems.length) {
    sideItems[0].classList.add("active");
    showSection("calendar");
}
