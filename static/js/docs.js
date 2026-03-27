document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("doc-upload-form");
    const docFile = document.getElementById("doc-file");
    const docDisplayName = document.getElementById("doc-display-name");
    const docsList = document.getElementById("docs-list");
    const uploadMsg = document.getElementById("doc-upload-msg");

    // Load initial documents
    loadDocs();

    // Handle Upload
    if (uploadForm) {
        uploadForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const file = docFile.files[0];
            const displayName = docDisplayName.value.trim();

            if (!file) {
                showMessage("Please select a file.", "red");
                return;
            }

            if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                showMessage("Only PDF files are allowed.", "red");
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showMessage("File size exceeds 5MB limit.", "red");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("display_name", displayName);

            const btn = document.getElementById("doc-upload-btn");
            const originalText = btn.innerText;
            btn.innerText = "Uploading...";
            btn.disabled = true;

            try {
                const response = await fetch("/upload-doc", {
                    method: "POST",
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showMessage("Upload successful!", "green");
                    uploadForm.reset();
                    loadDocs(); // Reload the list
                } else {
                    showMessage(data.error || "Upload failed.", "red");
                }
            } catch (err) {
                showMessage("An error occurred during upload.", "red");
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    async function loadDocs() {
        if (!docsList) return;
        
        try {
            const response = await fetch("/get-docs");
            if (!response.ok) return;
            
            const docs = await response.json();
            
            if (docs.length === 0) {
                docsList.innerHTML = `<p style="color:var(--text-secondary); grid-column: 1/-1;">No documents uploaded yet. Upload your first PDF to begin.</p>`;
                return;
            }

            docsList.innerHTML = docs.map(doc => `
                <div class="note-card" style="display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
                    <div style="flex:1;">
                        <h3 class="note-title" style="margin-bottom: 5px; word-break: break-all;">${escapeHtml(doc.display_name)}</h3>
                    </div>
                    <div style="display:flex; gap:10px; margin-top: 10px;">
                        <button class="open-doc-btn" data-url="${doc.url}" data-title="${escapeHtml(doc.display_name)}" style="flex:1; padding:6px 10px; font-size:0.9rem; background:linear-gradient(135deg, #3b82f6, #2563eb); color:white; border:none; border-radius:6px; cursor:pointer;">Open</button>
                        <button class="delete-doc-btn" data-id="${doc.id}" style="padding:6px 10px; font-size:0.9rem; background:rgba(239, 68, 68, 0.2); border:1px solid rgba(239, 68, 68, 0.4); color:#ef4444; border-radius:6px; cursor:pointer; transition:background 0.2s;">Delete</button>
                    </div>
                </div>
            `).join("");

            // Attach event listeners for dynamic buttons
            document.querySelectorAll(".open-doc-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    openPdfViewer(btn.dataset.url, btn.dataset.title);
                });
            });

            document.querySelectorAll(".delete-doc-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    deleteDoc(btn.dataset.id);
                });
            });

        } catch (err) {
            console.error("Failed to load documents", err);
        }
    }

    async function deleteDoc(id) {
        if (!confirm("Are you sure you want to delete this document?")) return;
        
        try {
            const response = await fetch(`/delete-doc/${id}`, { method: "DELETE" });
            const data = await response.json();
            
            if (response.ok) {
                loadDocs();
            } else {
                alert(data.error || "Failed to delete document.");
            }
        } catch (err) {
            alert("Error deleting document.");
        }
    }

    function openPdfViewer(url, title) {
        if (window.openPdfWindow) {
            window.openPdfWindow(url, title);
        } else {
            console.error("splitview is not loaded.");
        }
    }

    function showMessage(msg, color) {
        uploadMsg.innerText = msg;
        uploadMsg.style.color = color;
        setTimeout(() => { uploadMsg.innerText = ""; }, 4000);
    }

    function escapeHtml(unsafe) {
        return (unsafe || "").toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }
});
