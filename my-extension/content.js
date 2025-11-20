console.log("Component Capture content script loaded.");

let uiManager = null;

// Listen for the message from the background script to toggle the UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleUIPanel") {
        togglePanel();
        sendResponse({ status: "UI Toggled" });
    }
    return true;
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
