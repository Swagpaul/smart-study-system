document.addEventListener("DOMContentLoaded", () => {
    const pdfWindow = document.getElementById("pdf-window");
    const pdfHeader = document.getElementById("pdf-header");
    const pdfTitle = document.getElementById("pdf-title");
    const pdfRenderArea = document.getElementById("pdf-render-area");
    const closeBtn = document.getElementById("pdf-close");
    const resizer = document.getElementById("pdf-resizer");
    const snapIndicator = document.getElementById("snap-indicator");
    
    // Pagination controls
    const pdfPrevBtn = document.getElementById("pdf-prev");
    const pdfNextBtn = document.getElementById("pdf-next");
    const pdfPageNum = document.getElementById("pdf-page-num");
    
    // Tool buttons
    const toolCursor = document.getElementById("tool-cursor");
    const toolPen = document.getElementById("tool-pen");
    const toolHighlighter = document.getElementById("tool-highlighter");
    const toolNote = document.getElementById("tool-note");
    const toolEraser = document.getElementById("tool-eraser");
    
    // Brush settings
    const brushSettings = document.getElementById("brush-settings");
    const colorSwatches = document.querySelectorAll(".color-swatch");
    const customColorPicker = document.getElementById("custom-color-picker");
    const brushSizeSlider = document.getElementById("brush-size-slider");
    const brushSizeVal = document.getElementById("brush-size-val");
    const brushOpacitySlider = document.getElementById("brush-opacity-slider");
    const brushOpacityVal = document.getElementById("brush-opacity-val");

    if (!pdfWindow) return;

    let isDragging = false;
    let isResizing = false;
    let startX, startY;
    let initialLeft, initialTop;
    let initialWidth;
    let state = "floating";
    let snapThreshold = 30;
    
    // PDF State
    let pdfDoc = null;
    let pageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    let scale = 1.5;
    let currentDocId = null;
    let currentTool = 'cursor';
    let annotations = [];
    
    // Brush State
    let currentColor = '#3b82f6';
    let currentSize = 5;
    let currentOpacity = 1.0;
    
    // Canvas State for highlighting
    let isDrawing = false;
    let currentPath = [];
    let activeCanvas = null;
    let activeCtx = null;
    let tempCanvas = null;
    let tempCtx = null;
    let activeNotePopup = null;

    // Brush Settings Event Listeners
    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            colorSwatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            currentColor = swatch.dataset.color;
            customColorPicker.value = currentColor;
        });
    });

    customColorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
        colorSwatches.forEach(s => s.classList.remove('active'));
    });

    brushSizeSlider.addEventListener('input', (e) => {
        currentSize = parseInt(e.target.value);
        brushSizeVal.innerText = currentSize + 'px';
    });

    brushOpacitySlider.addEventListener('input', (e) => {
        currentOpacity = parseInt(e.target.value) / 100;
        brushOpacityVal.innerText = e.target.value + '%';
    });

    // Expose global function
    window.openPdfWindow = async function(url, title, docId) {
        pdfTitle.innerText = title;
        currentDocId = docId;
        pdfWindow.classList.add("active");
        
        if (!pdfWindow.classList.contains("floating") && state === "floating") {
            pdfWindow.className = "pdf-window active floating";
            const w = document.documentElement.clientWidth;
            const h = document.documentElement.clientHeight;
            pdfWindow.style.left = Math.max(20, (w / 2 - 300)) + "px";
            pdfWindow.style.top = Math.max(20, (h / 2 - 250)) + "px";
        }
        
        // Load PDF
        loadPdf(url);
        // Load Annotations
        loadAnnotations(docId);
    };

    async function loadPdf(url) {
        try {
            const loadingTask = pdfjsLib.getDocument(url);
            pdfDoc = await loadingTask.promise;
            pageNum = 1;
            renderPage(pageNum);
        } catch (err) {
            console.error("Error loading PDF:", err);
            pdfRenderArea.innerHTML = `<div style="color:red; padding:20px;">Failed to load PDF.</div>`;
        }
    }

    async function renderPage(num) {
        pageRendering = true;
        pdfRenderArea.innerHTML = '';
        
        const page = await pdfDoc.getPage(num);
        
        // Calculate scale to fit container width
        const containerWidth = document.getElementById('pdf-viewer-container').clientWidth - 40;
        const tempViewport = page.getViewport({ scale: 1.0 });
        scale = containerWidth / tempViewport.width;
        
        const viewport = page.getViewport({ scale });
        
        const container = document.createElement('div');
        container.className = 'pdf-page-container';
        container.style.width = viewport.width + 'px';
        container.style.height = viewport.height + 'px';
        
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-canvas';
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Add annotation layer
        const annotationLayer = document.createElement('div');
        annotationLayer.className = 'annotation-layer';
        
        const annotationCanvas = document.createElement('canvas');
        annotationCanvas.width = viewport.width;
        annotationCanvas.height = viewport.height;
        annotationLayer.appendChild(annotationCanvas);
        
        // Add temp canvas for current stroke
        tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        tempCanvas.style.position = 'absolute';
        tempCanvas.style.top = '0';
        tempCanvas.style.left = '0';
        tempCanvas.style.pointerEvents = 'none';
        tempCanvas.style.zIndex = '5';
        annotationLayer.appendChild(tempCanvas);
        tempCtx = tempCanvas.getContext('2d');
        
        container.appendChild(canvas);
        container.appendChild(annotationLayer);
        pdfRenderArea.appendChild(container);
        
        pdfPageNum.innerText = `${num} / ${pdfDoc.numPages}`;
        pageRendering = false;
        
        if (pageNumPending !== null) {
            renderPage(pageNumPending);
            pageNumPending = null;
        }
        
        // Draw existing annotations for this page
        drawAnnotations(num, annotationCanvas.getContext('2d'));
        
        // Setup drawing events
        setupAnnotationEvents(annotationCanvas, num);
    }

    function queueRenderPage(num) {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    }

    pdfPrevBtn.addEventListener('click', () => {
        if (pageNum <= 1) return;
        pageNum--;
        queueRenderPage(pageNum);
    });

    pdfNextBtn.addEventListener('click', () => {
        if (pageNum >= pdfDoc.numPages) return;
        pageNum++;
        queueRenderPage(pageNum);
    });

    // Tool switching
    const tools = [toolCursor, toolPen, toolHighlighter, toolNote, toolEraser];
    tools.forEach(tool => {
        if (!tool) return;
        tool.addEventListener('click', () => {
            tools.forEach(t => t.classList.remove('active'));
            tool.classList.add('active');
            currentTool = tool.id.replace('tool-', '');
            
            // Show/hide brush settings
            if (currentTool === 'pen' || currentTool === 'highlighter') {
                brushSettings.classList.add('active');
                if (currentTool === 'highlighter') {
                    brushOpacitySlider.value = 30;
                    brushOpacityVal.innerText = '30%';
                    currentOpacity = 0.3;
                    brushSizeSlider.value = 20;
                    brushSizeVal.innerText = '20px';
                    currentSize = 20;
                } else {
                    brushOpacitySlider.value = 100;
                    brushOpacityVal.innerText = '100%';
                    currentOpacity = 1.0;
                    brushSizeSlider.value = 5;
                    brushSizeVal.innerText = '5px';
                    currentSize = 5;
                }
            } else {
                brushSettings.classList.remove('active');
            }
            
            // Close any open note popups
            if (activeNotePopup) {
                activeNotePopup.remove();
                activeNotePopup = null;
            }
        });
    });

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        // Only trigger if PDF window is active and not typing in an input/textarea
        if (!pdfWindow.classList.contains("active")) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === "ArrowLeft") {
            if (pageNum <= 1) return;
            pageNum--;
            queueRenderPage(pageNum);
        } else if (e.key === "ArrowRight") {
            if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
            pageNum++;
            queueRenderPage(pageNum);
        }
    });

    function setupAnnotationEvents(canvas, pageNum) {
        const ctx = canvas.getContext('2d');
        
        canvas.addEventListener('mousedown', (e) => {
            if (currentTool === 'cursor') return;
            
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / scale;
            const y = (e.clientY - rect.top) / scale;
            
            if (currentTool === 'pen' || currentTool === 'highlighter') {
                isDrawing = true;
                currentPath = [{x, y}];
                activeCanvas = canvas;
                activeCtx = ctx;
                
                // Reset temp canvas for new stroke
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCanvas.style.opacity = currentOpacity;
            } else if (currentTool === 'note') {
                if (activeNotePopup) activeNotePopup.remove();
                createNotePopup(x, y, pageNum, canvas.parentNode);
            } else if (currentTool === 'eraser') {
                eraseAnnotation(x, y, pageNum);
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDrawing || (currentTool !== 'pen' && currentTool !== 'highlighter')) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / scale;
            const y = (e.clientY - rect.top) / scale;
            
            currentPath.push({x, y});
            
            // Draw on temp canvas with full opacity
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            drawPath(tempCtx, currentPath, currentColor, currentSize);
        });

        canvas.addEventListener('mouseup', () => {
            if (isDrawing) {
                isDrawing = false;
                const type = currentTool === 'highlighter' ? 'highlight' : 'pen';
                
                // Commit from temp to main
                ctx.save();
                ctx.globalAlpha = currentOpacity;
                // Real highlighter effect: multiply colors with background
                if (type === 'highlight') {
                    ctx.globalCompositeOperation = 'multiply';
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                }
                ctx.drawImage(tempCanvas, 0, 0);
                ctx.restore();
                
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                
                saveAnnotation(type, {
                    path: currentPath,
                    color: currentColor, // Save raw color
                    opacity: currentOpacity, // Save raw opacity
                    width: currentSize
                }, pageNum);
                currentPath = [];
            }
        });
    }

    function drawPath(ctx, path, color, width) {
        if (path.length < 2) return;
        
        // Clear and redraw for smooth rendering (optional, but for simple paths it's fine to just stroke)
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = width * scale;
        
        // For highlighter, we use globalCompositeOperation if needed, but source-over is fine for RGBA
        ctx.globalCompositeOperation = 'source-over';
        
        ctx.beginPath();
        ctx.moveTo(path[0].x * scale, path[0].y * scale);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x * scale, path[i].y * scale);
        }
        ctx.stroke();
    }

    async function saveAnnotation(type, data, page) {
        const annotation = {
            document_id: currentDocId,
            page_number: page,
            type: type,
            data: JSON.stringify(data)
        };
        
        try {
            const response = await fetch('/save-annotation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(annotation)
            });
            const result = await response.json();
            if (result.success) {
                annotation.id = result.id;
                annotations.push(annotation);
            }
        } catch (err) {
            console.error("Failed to save annotation", err);
        }
    }

    async function loadAnnotations(docId) {
        try {
            const response = await fetch(`/get-annotations/${docId}`);
            annotations = await response.json();
            if (pdfDoc) renderPage(pageNum); // Redraw current page with annotations
        } catch (err) {
            console.error("Failed to load annotations", err);
        }
    }

    function drawAnnotations(page, ctx) {
        const pageAnns = annotations.filter(a => a.page_number === page);
        pageAnns.forEach(ann => {
            const data = JSON.parse(ann.data);
            if (ann.type === 'highlight' || ann.type === 'pen') {
                ctx.save();
                // Support legacy format where color might already be RGBA
                if (data.opacity !== undefined) {
                    ctx.globalAlpha = data.opacity;
                    if (ann.type === 'highlight') {
                        ctx.globalCompositeOperation = 'multiply';
                    }
                    drawPath(ctx, data.path, data.color, data.width);
                } else {
                    // Legacy fallback
                    drawPath(ctx, data.path, data.color, data.width);
                }
                ctx.restore();
            } else if (ann.type === 'note') {
                renderNoteMarker(data.x, data.y, data.text, ann.id, ctx.canvas.parentNode);
            }
        });
    }

    function renderNoteMarker(x, y, text, id, container) {
        const marker = document.createElement('div');
        marker.className = 'note-marker';
        marker.style.left = (x * scale) + 'px';
        marker.style.top = (y * scale) + 'px';
        marker.innerText = '📌';
        marker.dataset.id = id;
        
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            showNotePopup(x, y, text, id, container, marker);
        });
        
        container.appendChild(marker);
    }

    function createNotePopup(x, y, page, container) {
        const popup = document.createElement('div');
        popup.className = 'note-popup';
        popup.style.left = (x * scale) + 'px';
        popup.style.top = (y * scale) + 'px';
        activeNotePopup = popup;
        
        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Type your note...';
        textarea.rows = 4;
        
        const actions = document.createElement('div');
        actions.className = 'note-actions';
        
        const saveBtn = document.createElement('button');
        saveBtn.innerText = 'Save';
        saveBtn.style.background = '#10b981';
        saveBtn.style.color = 'white';
        saveBtn.style.border = 'none';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancel';
        cancelBtn.style.background = 'rgba(255,255,255,0.1)';
        cancelBtn.style.color = 'white';
        cancelBtn.style.border = 'none';
        
        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
        popup.appendChild(textarea);
        popup.appendChild(actions);
        container.appendChild(popup);
        
        // Prevent clicking on popup from triggering drawing on canvas
        popup.addEventListener('mousedown', (e) => e.stopPropagation());
        
        textarea.focus();
        
        saveBtn.addEventListener('click', async () => {
            const text = textarea.value.trim();
            if (text) {
                await saveAnnotation('note', { x, y, text }, page);
                popup.remove();
                activeNotePopup = null;
                renderPage(pageNum); // Redraw to show the marker
            }
        });
        
        cancelBtn.addEventListener('click', () => {
            popup.remove();
            activeNotePopup = null;
        });
    }

    function showNotePopup(x, y, text, id, container, marker) {
        if (activeNotePopup) activeNotePopup.remove();
        
        const popup = document.createElement('div');
        popup.className = 'note-popup';
        popup.style.left = (x * scale) + 'px';
        popup.style.top = (y * scale) + 'px';
        activeNotePopup = popup;
        
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.rows = 4;
        
        const actions = document.createElement('div');
        actions.className = 'note-actions';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = 'Delete';
        deleteBtn.style.background = '#ef4444';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        
        const closeBtnPopup = document.createElement('button');
        closeBtnPopup.innerText = 'Close';
        closeBtnPopup.style.background = 'rgba(255,255,255,0.1)';
        closeBtnPopup.style.color = 'white';
        closeBtnPopup.style.border = 'none';
        
        actions.appendChild(deleteBtn);
        actions.appendChild(closeBtnPopup);
        popup.appendChild(textarea);
        popup.appendChild(actions);
        container.appendChild(popup);
        
        popup.addEventListener('mousedown', (e) => e.stopPropagation());
        
        deleteBtn.addEventListener('click', async () => {
            if (confirm("Delete this note?")) {
                await deleteAnnotation(id);
                popup.remove();
                activeNotePopup = null;
                renderPage(pageNum);
            }
        });
        
        closeBtnPopup.addEventListener('click', () => {
            popup.remove();
            activeNotePopup = null;
        });
    }

    async function deleteAnnotation(id) {
        try {
            const response = await fetch(`/delete-annotation/${id}`, { method: 'DELETE' });
            if (response.ok) {
                annotations = annotations.filter(a => a.id !== id);
            }
        } catch (err) {
            console.error("Failed to delete annotation", err);
        }
    }

    function eraseAnnotation(x, y, page) {
        // Find nearest annotation
        const pageAnns = annotations.filter(a => a.page_number === page);
        let foundId = null;
        
        for (const ann of pageAnns) {
            const data = JSON.parse(ann.data);
            if (ann.type === 'highlight' || ann.type === 'pen') {
                // Check if (x,y) is near any point in path
                const near = data.path.some(p => Math.hypot(p.x - x, p.y - y) < (data.width / 2 + 5));
                if (near) {
                    foundId = ann.id;
                    break;
                }
            } else if (ann.type === 'note') {
                if (Math.hypot(data.x - x, data.y - y) < 15) {
                    foundId = ann.id;
                    break;
                }
            }
        }
        
        if (foundId) {
            deleteAnnotation(foundId).then(() => renderPage(pageNum));
        }
    }

    // Window Dragging & Resizing (Keep existing logic)
    closeBtn.addEventListener("click", () => {
        pdfWindow.classList.remove("active");
        bodyClassReset();
        state = "floating";
        pdfWindow.className = "pdf-window floating";
        document.documentElement.style.setProperty("--pdf-width", "50vw");
        pdfDoc = null;
        pdfRenderArea.innerHTML = "";
    });

    pdfHeader.addEventListener("mousedown", (e) => {
        if (e.target.closest('.pdf-toolbar') || e.target.tagName.toLowerCase() === 'button') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = pdfWindow.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        pdfWindow.classList.add("dragging");
        document.body.classList.add("is-dragging");
    });

    resizer.addEventListener("mousedown", (e) => {
        e.preventDefault();
        isResizing = true;
        startX = e.clientX;
        initialWidth = pdfWindow.getBoundingClientRect().width;
        document.body.classList.add("is-resizing");
    });

    document.addEventListener("mousemove", (e) => {
        if (isDragging) {
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;
            pdfWindow.style.left = (initialLeft + dx) + "px";
            pdfWindow.style.top = (initialTop + dy) + "px";
            
            if (e.clientX < window.innerWidth * 0.4) showSnapIndicator("left");
            else if (e.clientX > window.innerWidth * 0.6) showSnapIndicator("right");
            else hideSnapIndicator();
        }
        if (isResizing) {
            let dx = e.clientX - startX;
            let newWidth = state === "snapped-left" ? initialWidth + dx : initialWidth - dx;
            if (newWidth > 300) {
                document.documentElement.style.setProperty("--pdf-width", newWidth + "px");
            }
        }
    });

    document.addEventListener("mouseup", (e) => {
        if (isDragging) {
            isDragging = false;
            pdfWindow.classList.remove("dragging");
            document.body.classList.remove("is-dragging");
            hideSnapIndicator();
            if (e.clientX < window.innerWidth * 0.4) snap("left");
            else if (e.clientX > window.innerWidth * 0.6) snap("right");
        }
        if (isResizing) {
            isResizing = false;
            document.body.classList.remove("is-resizing");
            if (pdfDoc) renderPage(pageNum);
        }
    });

    function snap(side) {
        state = `snapped-${side}`;
        pdfWindow.className = `pdf-window active snapped-${side}`;
        bodyClassReset();
        document.body.classList.add(`pdf-snapped-${side}`);
        pdfWindow.style.left = "";
        pdfWindow.style.top = "";
        if (pdfDoc) renderPage(pageNum); // Re-render to adjust scale
    }

    function showSnapIndicator(side) {
        snapIndicator.className = `show snap-${side}`;
    }

    function hideSnapIndicator() {
        snapIndicator.classList.remove("show");
    }

    function bodyClassReset() {
        document.body.classList.remove("pdf-snapped-left", "pdf-snapped-right");
    }
});
