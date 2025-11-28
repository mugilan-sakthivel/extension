console.log("Component Capture content script loaded.");

let uiManager = null;

// Listen for the message from the background script to toggle the UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleUIPanel") {
        togglePanel();
        sendResponse({ status: "UI Toggled" });
    }

    if (request.action === "authUpdated") {
        if (uiManager) {
            uiManager.setAuthenticatedState(request.isAuthenticated, request.user);
        }
    }
    return true;
});

// Listen for messages from ui.js (via window.postMessage) and relay to background
window.addEventListener('message', (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;

    if (event.data.type === 'SCREENSHOT_REQUEST') {
        const targetId = event.data.targetId;

        // Forward to background script
        chrome.runtime.sendMessage(
            { action: "takeScreenshot", targetId: targetId },
            (response) => {
                // Send response back to ui.js
                window.postMessage({
                    type: 'SCREENSHOT_RESPONSE',
                    payload: response || { error: chrome.runtime.lastError?.message }
                }, '*');
            }
        );
    }
});

async function togglePanel() {
    // If the UI manager hasn't been loaded yet, load it.
    if (!uiManager) {
        try {
            // Dynamically import the UI manager
            const uiModule = await import(chrome.runtime.getURL('ui.js'));
            uiManager = uiModule.uiManager;
            // Create the panel for the first time
            uiManager.createPanel();
        } catch (err) {
            console.error("Failed to load UI manager:", err);
            return;
        }
    }

    // Toggle the panel's visibility
    uiManager.togglePanel();
}
