document.addEventListener("DOMContentLoaded", () => {
    const pdfWindow = document.getElementById("pdf-window");
    const pdfHeader = document.getElementById("pdf-header");
    const pdfTitle = document.getElementById("pdf-title");
    const pdfIframe = document.getElementById("pdf-iframe");
    const closeBtn = document.getElementById("pdf-close");
    const resizer = document.getElementById("pdf-resizer");
    const snapIndicator = document.getElementById("snap-indicator");

    if (!pdfWindow) return; // safeguard

    let isDragging = false;
    let isResizing = false;
    let startX, startY;
    let initialLeft, initialTop;
    let initialWidth;
    let state = "floating"; // floating, snapped-left, snapped-right
    let snapThreshold = 30; // Better accuracy: pixels from edge

    // RAF Caching values
    let cachedWinWidth = 0;
    let cachedWinHeight = 0;
    let cachedPdfWidth = 0;
    let cachedPdfHeight = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;
    let rafId = null;

    // Expose global function
    window.openPdfWindow = function(url, title) {
        pdfTitle.innerText = title;
        pdfIframe.src = url;
        pdfWindow.classList.add("active");
        
        if (!pdfWindow.classList.contains("floating") && state === "floating") {
            pdfWindow.className = "pdf-window active floating";
            
            // Center it initially
            const w = document.documentElement.clientWidth;
            const h = document.documentElement.clientHeight;
            pdfWindow.style.left = Math.max(20, (w / 2 - 300)) + "px";
            pdfWindow.style.top = Math.max(20, (h / 2 - 250)) + "px";
        }
    };

    closeBtn.addEventListener("click", () => {
        pdfWindow.classList.remove("active");
        bodyClassReset();
        state = "floating";
        pdfWindow.className = "pdf-window floating"; // reset to floating ready for next time
        document.documentElement.style.setProperty("--pdf-width", "50vw"); // reset width
        setTimeout(() => { pdfIframe.src = ""; }, 300);
    });

    // Window Dragging
    pdfHeader.addEventListener("mousedown", (e) => {
        if (e.target.tagName.toLowerCase() === 'button') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        cachedWinWidth = window.innerWidth;
        cachedWinHeight = window.innerHeight;

        const rect = pdfWindow.getBoundingClientRect();
        cachedPdfWidth = rect.width;
        cachedPdfHeight = rect.height;
        
        // If snapped, convert to floating gracefully
        if (state !== "floating") {
            state = "floating";
            bodyClassReset();
            pdfWindow.className = "pdf-window active floating dragging";
            
            // Allow reflow to get floating dimensions
            const floatRect = pdfWindow.getBoundingClientRect();
            cachedPdfWidth = floatRect.width;
            cachedPdfHeight = floatRect.height;

            pdfWindow.style.left = Math.max(0, startX - (cachedPdfWidth / 2)) + "px";
            pdfWindow.style.top = "10px";
            initialLeft = parseFloat(pdfWindow.style.left);
            initialTop = 10;
        } else {
            initialLeft = rect.left;
            initialTop = rect.top;
            pdfWindow.classList.add("dragging");
        }
        
        document.body.classList.add("is-dragging");
    });

    // Window Resizing
    resizer.addEventListener("mousedown", (e) => {
        e.preventDefault(); // prevent text selection
        isResizing = true;
        startX = e.clientX;
        initialWidth = pdfWindow.getBoundingClientRect().width;
        cachedWinWidth = window.innerWidth;
        document.body.classList.add("is-resizing");
    });

    function updateDrag() {
        if (!isDragging && !isResizing) {
            rafId = null;
            return;
        }

        if (isDragging) {
            let dx = currentMouseX - startX;
            let dy = currentMouseY - startY;
            
            // Fast CSS calculation using cached dimensions avoiding layout thrashing
            pdfWindow.style.left = Math.max(0, Math.min(cachedWinWidth - cachedPdfWidth, initialLeft + dx)) + "px";
            pdfWindow.style.top = Math.max(0, Math.min(cachedWinHeight - cachedPdfHeight, initialTop + dy)) + "px";

            // Snap detection (40% left, 20% middle deadzone, 40% right)
            if (currentMouseX < cachedWinWidth * 0.40) {
                showSnapIndicator("left");
            } else if (currentMouseX > cachedWinWidth * 0.60) {
                showSnapIndicator("right");
            } else {
                hideSnapIndicator();
            }
        }

        if (isResizing) {
            let dx = currentMouseX - startX;
            let newWidth;
            if (state === "snapped-left") {
                newWidth = initialWidth + dx;
            } else if (state === "snapped-right") {
                newWidth = initialWidth - dx; // moving left increases width
            }
            // Constraints
            if (newWidth > 300 && newWidth < cachedWinWidth - 300) {
                document.documentElement.style.setProperty("--pdf-width", newWidth + "px");
            }
        }

        rafId = null;
    }

    document.addEventListener("mousemove", (e) => {
        if (isDragging || isResizing) {
            e.preventDefault();
            currentMouseX = e.clientX;
            currentMouseY = e.clientY;
            
            if (!rafId) {
                rafId = requestAnimationFrame(updateDrag);
            }
        }
    });

    document.addEventListener("mouseup", (e) => {
        if (isDragging) {
            isDragging = false;
            pdfWindow.classList.remove("dragging");
            document.body.classList.remove("is-dragging");
            hideSnapIndicator();

            if (e.clientX < window.innerWidth * 0.40) {
                snap("left");
            } else if (e.clientX > window.innerWidth * 0.60) {
                snap("right");
            }
        }

        if (isResizing) {
            isResizing = false;
            document.body.classList.remove("is-resizing");
        }
    });

    function snap(side) {
        state = `snapped-${side}`;
        pdfWindow.className = `pdf-window active snapped-${side}`;
        bodyClassReset();
        document.body.classList.add(`pdf-snapped-${side}`);
        // Remove hardcoded left/top so CSS strictly controls it
        pdfWindow.style.left = "";
        pdfWindow.style.top = "";
    }

    function showSnapIndicator(side) {
        if (side === "left") {
            snapIndicator.classList.add("snap-left");
            snapIndicator.classList.remove("snap-right");
        } else {
            snapIndicator.classList.add("snap-right");
            snapIndicator.classList.remove("snap-left");
        }
        snapIndicator.classList.add("show");
    }

    function hideSnapIndicator() {
        snapIndicator.classList.remove("show");
    }

    function bodyClassReset() {
        document.body.classList.remove("pdf-snapped-left", "pdf-snapped-right");
    }
});
