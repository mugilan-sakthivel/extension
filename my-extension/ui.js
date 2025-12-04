// This module manages the in-page UI panel.

// HTML template for the UI panel
const panelHTML = `
    <div id="component-capture-panel" class="cc-panel hidden">
        <div class="cc-panel-header">
            <h3 class="cc-logo">Lua</h3>
            <button id="cc-close-btn">&times;</button>
        </div>
        <div class="cc-panel-body">
            <!-- Auth Section -->
            <div id="cc-auth-section" class="cc-auth-section">
                <button id="cc-login-btn" class="cc-btn-login">Login to Lua</button>
                <div id="cc-user-info" class="cc-user-info hidden">
                    <div class="cc-user-avatar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <span class="cc-user-status">User</span>
                    <button id="cc-logout-btn" class="cc-btn-logout">Logout</button>
                </div>
            </div>

            <!-- Main Content -->
            <div id="cc-main-content" class="hidden">
                <!-- Help section for keyboard navigation -->
                <div class="cc-help-section">
                    <div class="cc-help-title">⌨️ Keyboard Navigation</div>
                    <div class="cc-help-content">
                        <div class="cc-help-item">
                            <span class="cc-key">↑</span> <strong>Up:</strong> Select parent
                        </div>
                        <div class="cc-help-item">
                            <span class="cc-key">↓</span> <strong>Down:</strong> Select child
                        </div>
                        <div class="cc-help-item">
                            <span class="cc-key">Esc</span> <strong>Cancel</strong> selection
                        </div>
                    </div>
                </div>
                
                <!-- Initial view for capturing a component -->
                <div id="cc-pre-capture-view">
                    <div class="cc-form-group">
                        <label for="cc-folder-select">Folder</label>
                        <select id="cc-folder-select">
                            <option value="default">Default Folder</option>
                        </select>
                    </div>
                    <div class="cc-form-group">
                        <label for="cc-new-folder-name">New Folder</label>
                        <div class="cc-input-group">
                            <input type="text" id="cc-new-folder-name" placeholder="Folder name...">
                            <button id="cc-create-folder-btn" class="cc-btn-secondary">Create</button>
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
                    <h4 class="cc-success-title">Component Captured!</h4>
                    <p id="cc-captured-name" class="cc-captured-name"></p>
                    <div class="cc-screenshot-container">
                        <img id="cc-captured-screenshot" src="" alt="Captured Component Screenshot" />
                    </div>
                    <div class="cc-button-group">
                        <button id="cc-reset-btn" class="cc-btn-secondary">Reset</button>
                        <button id="cc-save-btn" class="cc-btn-primary">Save</button>
                    </div>
                </div>
            </div>
            <div id="cc-status-message" class="cc-status"></div>
        </div>
    </div>
`;

// CSS for the UI panel
const panelCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif&display=swap');
    
    #component-capture-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 360px;
        background: #0a0a0a;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        z-index: 2147483647;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        color: #ffffff;
    }
    
    #component-capture-panel.hidden { display: none; }
    
    .cc-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    
    .cc-logo {
        margin: 0;
        font-family: 'Instrument Serif', serif;
        font-size: 24px;
        font-weight: 400;
        color: #ffffff;
    }
    
    #cc-close-btn {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.5);
        transition: color 0.2s;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    #cc-close-btn:hover {
        color: rgba(255, 255, 255, 0.9);
    }
    
    .cc-panel-body {
        padding: 20px;
    }
    
    /* Auth Section */
    .cc-auth-section {
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    
    .cc-btn-login {
        width: 100%;
        padding: 12px 20px;
        background: #ffffff;
        color: #000000;
        border: none;
        border-radius: 9999px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .cc-btn-login:hover {
        background: rgba(255, 255, 255, 0.9);
    }
    
    .cc-user-info {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
    }
    
    .cc-user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.7);
    }
    
    .cc-user-status {
        flex: 1;
        font-weight: 500;
        font-size: 14px;
        color: #ffffff;
    }
    
    .cc-btn-logout {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.2s;
    }
    
    .cc-btn-logout:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.1);
    }
    
    /* Help Section */
    .cc-help-section {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
        border: 1px solid rgba(102, 126, 234, 0.2);
        border-radius: 12px;
        padding: 14px;
        margin-bottom: 20px;
    }
    
    .cc-help-title {
        font-weight: 600;
        font-size: 13px;
        margin-bottom: 10px;
        color: rgba(255, 255, 255, 0.9);
    }
    
    .cc-help-content {
        font-size: 12px;
    }
    
    .cc-help-item {
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: rgba(255, 255, 255, 0.7);
    }
    
    .cc-key {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 600;
        min-width: 28px;
        color: #ffffff;
    }
    
    /* Form Elements */
    .cc-form-group {
        margin-bottom: 16px;
    }
    
    .cc-form-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
    }
    
    #component-capture-panel input[type="text"],
    #component-capture-panel select {
        width: 100%;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        box-sizing: border-box;
        color: #ffffff;
        font-size: 14px;
        font-family: inherit;
        transition: all 0.2s;
    }
    
    #component-capture-panel input[type="text"]:focus,
    #component-capture-panel select:focus {
        outline: none;
        border-color: rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.08);
    }
    
    #component-capture-panel input::placeholder {
        color: rgba(255, 255, 255, 0.4);
    }
    
    .cc-input-group {
        display: flex;
        gap: 8px;
    }
    
    .cc-input-group input {
        flex: 1;
    }
    
    .cc-input-group button {
        flex-shrink: 0;
    }
    
    /* Buttons */
    #component-capture-panel button {
        cursor: pointer;
        padding: 10px 16px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.2s;
        font-family: inherit;
    }
    
    .cc-btn-primary {
        width: 100%;
        background: #ffffff;
        color: #000000;
        padding: 12px 20px;
        font-size: 15px;
    }
    
    .cc-btn-primary:hover {
        background: rgba(255, 255, 255, 0.9);
        transform: translateY(-1px);
    }
    
    .cc-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .cc-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
    }
    
    .cc-button-group {
        display: flex;
        gap: 10px;
        margin-top: 16px;
    }
    
    .cc-button-group button {
        flex: 1;
    }
    
    /* Success State */
    .cc-success-title {
        text-align: center;
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        color: #ffffff;
    }
    
    .cc-captured-name {
        text-align: center;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
        margin: 0 0 16px 0;
    }
    
    .cc-screenshot-container {
        text-align: center;
        margin: 16px 0;
        max-height: 200px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.02);
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
    
    .cc-status {
        margin-top: 12px;
        text-align: center;
        font-size: 13px;
        padding: 8px;
        border-radius: 6px;
    }
    
    .cc-status:not(:empty) {
        background: rgba(255, 255, 255, 0.05);
    }
    
    #component-capture-panel .hidden {
        display: none;
    }
`;

export const uiManager = {
    panel: null,
    capturedBlueprint: null,
    isPanelVisible: false,

    createPanel() {
        const existingPanel = document.getElementById('component-capture-panel');
        if (existingPanel) {
            this.panel = existingPanel;
            // Re-attach listeners just in case, though usually not needed if element persisted
            // But if the script was reloaded, the old listeners are gone (attached to old script context? no, DOM listeners persist if element persists, but the callbacks are gone if the script context is gone)
            // Actually, if the extension reloads, the content script is re-injected. The old DOM element is there.
            // The old listeners were attached to functions in the OLD content script context which is now dead/invalid.
            // So we MUST re-attach listeners.
            // But wait, if we re-attach listeners to the SAME element, we might duplicate them if the old ones somehow survived?
            // No, if the context is dead, the listeners are effectively dead or removed.
            // Safe to re-attach.
            this.addEventListeners();
            this.checkAuth();
            return;
        }

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
        this.checkAuth();
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

        // Auth actions
        document.getElementById('cc-login-btn').addEventListener('click', () => this.login());
        document.getElementById('cc-logout-btn').addEventListener('click', () => this.logout());

        // Dummy actions
        document.getElementById('cc-create-folder-btn').addEventListener('click', () => this.createFolder());
        document.getElementById('cc-save-btn').addEventListener('click', () => this.save());
        document.getElementById('cc-reset-btn').addEventListener('click', () => this.reset());
    },

    checkAuth() {
        try {
            chrome.runtime.sendMessage({ action: "checkAuth" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log("Check auth error:", chrome.runtime.lastError.message);
                    // If context invalidated, we can't do much but maybe show a message if we could
                    return;
                }

                console.log("checkAuth response:", response);
                if (response && response.isAuthenticated) {
                    this.setAuthenticatedState(true, response.user);
                } else {
                    this.setAuthenticatedState(false);
                }
            });
        } catch (e) {
            console.log("Extension context invalidated during checkAuth");
        }
    },

    setAuthenticatedState(isAuthenticated, user) {
        console.log("setAuthenticatedState called with:", { isAuthenticated, user });

        const authSection = document.getElementById('cc-auth-section');
        const mainContent = document.getElementById('cc-main-content');
        const loginBtn = document.getElementById('cc-login-btn');
        const userInfo = document.getElementById('cc-user-info');
        const userStatus = userInfo.querySelector('.cc-user-status');

        if (isAuthenticated) {
            loginBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            mainContent.classList.remove('hidden');

            if (user && user.name) {
                console.log("Setting user name:", user.name);
                userStatus.textContent = user.name;
            } else if (user && user.email) {
                console.log("Setting user email:", user.email);
                userStatus.textContent = user.email;
            } else {
                console.log("No user name or email, showing 'User'");
                userStatus.textContent = 'User';
            }
        } else {
            loginBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');
            mainContent.classList.add('hidden');
        }
    },

    login() {
        try {
            chrome.runtime.sendMessage({ action: "login" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Login error:", chrome.runtime.lastError.message);
                }
            });
        } catch (e) {
            console.error("Login exception:", e);
        }
    },

    logout() {
        try {
            chrome.runtime.sendMessage({ action: "logout" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Logout error:", chrome.runtime.lastError.message);
                    return;
                }
                this.setAuthenticatedState(false);
            });
        } catch (e) {
            console.error("Logout exception:", e);
        }
    },

    startSelection() {
        try {
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
                    this.showStatus("Error loading selector. Please reload page.", true);
                });
        } catch (e) {
            console.error("Start selection exception:", e);
            this.showStatus("Error starting selection. Please reload page.", true);
        }
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
        try {
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
        } catch (e) {
            console.error("Create folder exception:", e);
        }
    },

    save() {
        try {
            const folder = document.getElementById('cc-folder-select').value;
            const componentName = document.getElementById('cc-component-name').value || 'GeneratedComponent';

            if (!this.capturedBlueprint) {
                this.showStatus("No component captured to save.", true);
                return;
            }

            // Generate code automatically
            import(chrome.runtime.getURL('code-generator.js'))
                .then(module => {
                    const code = module.generateReactCode(this.capturedBlueprint, componentName);
                    console.log("--------------------------------------------------");
                    console.log("✨ GENERATED REACT CODE ✨");
                    console.log("--------------------------------------------------");
                    console.log(code);
                    console.log("--------------------------------------------------");

                    const payload = {
                        folder: folder,
                        name: componentName,
                        data: this.capturedBlueprint,
                        generatedCode: code, // Include generated code in payload
                        timestamp: new Date().toISOString()
                    };

                    console.log("Saving component:", payload);

                    chrome.runtime.sendMessage({
                        action: "saveComponent",
                        payload: payload
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("Save error:", chrome.runtime.lastError.message);
                            this.showStatus("Error saving component. Please reload page.", true);
                            return;
                        }

                        console.log("Save response:", response);
                        if (response && response.success) {
                            this.showStatus("Component saved! Code logged to console.", false);
                            setTimeout(() => this.reset(), 2000);
                        } else {
                            this.showStatus("Failed to save component.", true);
                        }
                    });
                })
                .catch(err => {
                    console.error("Failed to generate code during save:", err);
                    this.showStatus("Error generating code. Check console.", true);
                });

        } catch (e) {
            console.error("Save exception:", e);
            this.showStatus("Error saving. Please reload page.", true);
        }
    },

    reset() {
        try {
            this.capturedBlueprint = null;
            document.getElementById('cc-captured-name').textContent = '';
            document.getElementById('cc-captured-screenshot').src = '';
            document.getElementById('cc-component-name').value = '';

            document.getElementById('cc-pre-capture-view').classList.remove('hidden');
            document.getElementById('cc-post-capture-view').classList.add('hidden');

            this.showStatus("", false);
        } catch (e) {
            console.error("Reset exception:", e);
        }
    },

    showStatus(message, isError) {
        const statusEl = document.getElementById('cc-status-message');
        statusEl.textContent = message;
        statusEl.style.color = isError ? '#ff4444' : '#00C851';

        if (message) {
            setTimeout(() => {
                statusEl.textContent = '';
            }, 3000);
        }
    }
};
