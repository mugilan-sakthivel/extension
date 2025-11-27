// This module manages the in-page UI panel.

// HTML template for the UI panel
const panelHTML = `
    <div id="component-capture-panel" class="cc-panel hidden">
        <div class="cc-panel-header">
            <h3>Component Capture</h3>
            <button id="cc-close-btn">&times;</button>
        </div>
        <div class="cc-panel-body">
            <!-- Help section for keyboard navigation -->
            <div class="cc-help-section">
                <div class="cc-help-title">⌨️ Keyboard Navigation</div>
                <div class="cc-help-content">
                    <div class="cc-help-item">
                        <span class="cc-key">↑</span> <strong>Up:</strong> Select parent element
                    </div>
                    <div class="cc-help-item">
                        <span class="cc-key">↓</span> <strong>Down:</strong> Select first child
                    </div>
                    <div class="cc-help-item">
                        <span class="cc-key">Esc</span> <strong>Cancel</strong> selection
                    </div>
                    <div class="cc-help-tip">
                        💡 <strong>Tip:</strong> Use arrows to fine-tune your selection. Navigate up to capture larger sections or down to target specific nested elements.
                    </div>
                </div>
            </div>
            <!-- Initial view for capturing a component -->
            <div id="cc-pre-capture-view">
                <div class="cc-form-group">
                    <label for="cc-folder-select">Select Folder</label>
                    <select id="cc-folder-select">
                        <option value="default">Default Folder</option>
                    </select>
                </div>
                <div class="cc-form-group">
                    <label for="cc-new-folder-name">Or Create New Folder</label>
                    <div class="cc-input-group">
                        <input type="text" id="cc-new-folder-name" placeholder="New folder name...">
                        <button id="cc-create-folder-btn">Create</button>
                    </div>
                </div>
                <div class="cc-form-group">
                    <label for="cc-component-name">Component Name</label>
                    <input type="text" id="cc-component-name" placeholder="e.g., 'Primary Button'">
                </div>
                <button id="cc-select-component-btn" class="cc-btn-primary">Select Component</button>
            </div>
            <!-- View after a component has been captured -->
            <div id="cc-post-capture-view" class="hidden">
                <h4>Component Captured!</h4>
                <p id="cc-captured-name"></p>
                <div class="cc-screenshot-container">
                    <img id="cc-captured-screenshot" src="" alt="Captured Component Screenshot" />
                </div>
                <div class="cc-button-group">
                    <button id="cc-reset-btn">Reset</button>
                    <button id="cc-save-btn" class="cc-btn-primary">Save</button>
                </div>
            </div>
            <div id="cc-status-message" class="cc-status"></div>
        </div>
    </div>
`;

// CSS for the UI panel
const panelCSS = `
    #component-capture-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 320px;
        background-color: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 14px;
        color: #333;
    }
    #component-capture-panel.hidden { display: none; }
    .cc-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        border-bottom: 1px solid #e0e0e0;
    }
    .cc-panel-header h3 { margin: 0; font-size: 16px; }
    #cc-close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #888;
    }
    .cc-panel-body { padding: 15px; }
    
    /* Help Section Styles */
    .cc-help-section {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 15px;
        color: white;
    }
    .cc-help-title {
        font-weight: 700;
        font-size: 13px;
        margin-bottom: 8px;
        opacity: 0.95;
    }
    .cc-help-content {
        font-size: 12px;
    }
    .cc-help-item {
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .cc-key {
        display: inline-block;
        background: rgba(255, 255, 255, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.4);
        border-radius: 3px;
        padding: 2px 6px;
        font-size: 11px;
        font-weight: 600;
        min-width: 24px;
        text-align: center;
    }
    .cc-help-tip {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.3);
        font-size: 11px;
        line-height: 1.4;
        opacity: 0.9;
    }
    
    .cc-form-group { margin-bottom: 15px; }
    .cc-form-group label { display: block; margin-bottom: 5px; font-weight: 600; }
    #component-capture-panel input[type="text"], #component-capture-panel select {
        width: 100%;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
    }
    .cc-input-group { display: flex; }
    .cc-input-group input { flex-grow: 1; border-top-right-radius: 0; border-bottom-right-radius: 0; }
    .cc-input-group button {
        padding: 8px 12px;
        border: 1px solid #ccc;
        border-left: none;
        background-color: #eee;
        cursor: pointer;
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
    }
    #component-capture-panel button { cursor: pointer; padding: 10px 15px; border: none; border-radius: 4px; font-weight: 600; }
    .cc-btn-primary { width: 100%; background-color: #007bff; color: white; font-size: 16px; }
    .cc-btn-primary:hover { background-color: #0056b3; }
    .cc-button-group { display: flex; justify-content: space-between; margin-top: 15px; }
    .cc-button-group button { width: 48%; }
    #cc-post-capture-view h4 { text-align: center; margin-top: 0; }
    #cc-post-capture-view p { text-align: center; font-style: italic; color: #555; }
    .cc-screenshot-container {
        text-align: center;
        margin: 15px 0;
        max-height: 200px;
        overflow: hidden;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: #f9f9f9;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    #cc-captured-screenshot {
        max-width: 100%;
        max-height: 200px;
        object-fit: contain;
        display: block;
    }
    .cc-status { margin-top: 10px; text-align: center; }
    #component-capture-panel .hidden { display: none; }
`;

export const uiManager = {
    panel: null,
    capturedBlueprint: null,
    isPanelVisible: false,

    createPanel() {
        if (document.getElementById('component-capture-panel')) return;

        // Inject CSS
        const styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = panelCSS;
        document.head.appendChild(styleSheet);

        // Inject HTML
        const panelDiv = document.createElement('div');
        panelDiv.innerHTML = panelHTML;
        document.body.appendChild(panelDiv.firstElementChild);

        this.panel = document.getElementById('component-capture-panel');
        this.addEventListeners();
    },

    togglePanel() {
        if (!this.panel) this.createPanel();
        this.isPanelVisible = !this.isPanelVisible;
        this.panel.classList.toggle('hidden', !this.isPanelVisible);
    },

    addEventListeners() {
        // Main actions
        document.getElementById('cc-select-component-btn').addEventListener('click', () => this.startSelection());
        document.getElementById('cc-close-btn').addEventListener('click', () => this.togglePanel());

        // Dummy actions
        document.getElementById('cc-create-folder-btn').addEventListener('click', () => this.createFolder());
        document.getElementById('cc-save-btn').addEventListener('click', () => this.save());
        document.getElementById('cc-reset-btn').addEventListener('click', () => this.reset());
    },

    startSelection() {
        const componentName = document.getElementById('cc-component-name').value;
        if (!componentName) {
            this.showStatus("Please enter a component name.", true);
            return;
        }

        this.panel.classList.add('hidden'); // Hide panel during selection

        import(chrome.runtime.getURL('selector.js'))
            .then(module => {
                module.startSelectionMode((blueprint) => {
                    // This is the callback function executed when capture is complete
                    this.panel.classList.remove('hidden'); // Show panel again

                    if (!blueprint) {
                        // Selection was cancelled or failed
                        return;
                    }

                    // Blueprint is already complete with screenshot
                    this.capturedBlueprint = blueprint;
                    document.getElementById('cc-captured-name').textContent = `Component: "${componentName}"`;

                    const screenshotImg = document.getElementById('cc-captured-screenshot');
                    if (blueprint.screenshot) {
                        screenshotImg.src = blueprint.screenshot;
                        screenshotImg.style.display = 'block';
                    } else {
                        screenshotImg.style.display = 'none';
                    }

                    document.getElementById('cc-pre-capture-view').classList.add('hidden');
                    document.getElementById('cc-post-capture-view').classList.remove('hidden');
                });
            })
            .catch(err => {
                console.error("Failed to load selector module:", err);
                this.panel.classList.remove('hidden');
            });
    },

    createComponentBlueprint(element, screenshotDataUrl) {
        const rootBlueprint = this.buildNodeBlueprint(element);
        return {
            html: element.outerHTML,
            ...rootBlueprint,
            screenshot: screenshotDataUrl
        };
    },

    buildNodeBlueprint(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) {
            return null;
        }

        const STYLE_WHITELIST = [
            'display', 'flex-direction', 'justify-content', 'align-items', 'gap', 'grid-gap',
            'width', 'height', 'padding', 'margin', 'border', 'border-radius', 'box-shadow',
            'color', 'background-color', 'font-family', 'font-size', 'font-weight',
            'line-height', 'letter-spacing', 'text-align', 'position', 'top', 'left',
            'right', 'bottom', 'transform', 'opacity'
        ];

        const computedStyles = window.getComputedStyle(element);
        const styles = {};
        for (const prop of STYLE_WHITELIST) {
            const value = computedStyles.getPropertyValue(prop);
            if (value && value !== 'none' && value !== '0px' && value !== 'normal' && value !== 'auto') {
                styles[prop] = value;
            }
        }

        const blueprint = {
            tag: element.tagName.toLowerCase(),
            classes: Array.from(element.classList),
            styles: styles,
            children: []
        };

        if (['h1', 'h2', 'h3', 'h4', 'p', 'span', 'a', 'button', 'div'].includes(blueprint.tag)) {
            const directText = Array.from(element.childNodes)
                .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
                .map(node => node.textContent.trim())
                .join(' ');
            if (directText) {
                blueprint.text = directText;
            }
        }

        element.childNodes.forEach(child => {
            const childBlueprint = this.buildNodeBlueprint(child);
            if (childBlueprint) {
                blueprint.children.push(childBlueprint);
            }
        });

        return blueprint;
    },

    createFolder() {
        const newFolderInput = document.getElementById('cc-new-folder-name');
        const folderSelect = document.getElementById('cc-folder-select');
        const newFolderName = newFolderInput.value.trim();
        if (newFolderName) {
            const option = document.createElement('option');
            option.value = newFolderName.toLowerCase().replace(/\s+/g, '-');
            option.textContent = newFolderName;
            folderSelect.appendChild(option);
            folderSelect.value = option.value;
            newFolderInput.value = '';
            this.showStatus(`Folder "${newFolderName}" created.`, false);
        }
    },

    save() {
        const folder = document.getElementById('cc-folder-select').value;
        const componentName = document.getElementById('cc-component-name').value;

        console.log("--- DUMMY SAVE ---");
        console.log("Saving to folder:", folder);
        console.log("Component Name:", componentName);
        console.log("Blueprint Data:", this.capturedBlueprint);

        this.showStatus(`Component "${componentName}" saved.`, false);
        this.reset();
    },

    reset() {
        this.capturedBlueprint = null;
        document.getElementById('cc-component-name').value = '';
        document.getElementById('cc-post-capture-view').classList.add('hidden');
        document.getElementById('cc-pre-capture-view').classList.remove('hidden');
    },

    showStatus(message, isError) {
        const statusEl = document.getElementById('cc-status-message');
        statusEl.textContent = message;
        statusEl.style.color = isError ? '#d9534f' : '#28a745';
        setTimeout(() => {
            statusEl.textContent = '';
        }, 3000);
    }
};
