chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;

    try {
        // Try to send message to existing content script
        await chrome.tabs.sendMessage(tab.id, { action: "toggleUIPanel" });
    } catch (error) {
        // Content script not loaded, inject it first
        console.log("Content script not found, injecting...");

        try {
            // Inject CSS
            await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ['style.css']
            });

            // Inject content script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            // Wait a bit for content script to initialize
            setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { action: "toggleUIPanel" }).catch(err => {
                    console.error("Failed to toggle panel after injection:", err);
                });
            }, 100);
        } catch (injectionError) {
            console.error("Failed to inject content script:", injectionError);
        }
    }
});

// Listens for the message from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "login") {
        chrome.tabs.create({ url: "http://localhost:5173/login?redirect=extension" });
        return true;
    }

    if (request.action === "loginSuccess") {
        const userData = request.user || {};

        // Validate that we have required user data
        if (!userData.id) {
            console.error("Login failed - missing user ID");
            sendResponse({ status: "error", message: "Missing user ID" });
            return true;
        }

        chrome.storage.local.set({ isAuthenticated: true, user: userData }, () => {
            console.log("User authenticated", userData);
            sendResponse({ status: "success" });

            // Broadcast to all tabs that auth state has changed
            chrome.tabs.query({}, (tabs) => {
                for (const tab of tabs) {
                    chrome.tabs.sendMessage(tab.id, {
                        action: "authUpdated",
                        isAuthenticated: true,
                        user: userData
                    }).catch(() => {
                        // Ignore errors for tabs that don't have the content script
                    });
                }
            });
        });
        return true;
    }

    if (request.action === "checkAuth") {
        chrome.storage.local.get(["isAuthenticated", "user"], (result) => {
            console.log("checkAuth - storage contents:", result);
            sendResponse({
                isAuthenticated: result.isAuthenticated,
                user: result.user
            });
        });
        return true;
    }

    if (request.action === "logout") {
        console.log("Logging out from extension (clearing local storage only)");
        // Clear local storage
        chrome.storage.local.remove(["isAuthenticated", "user"], () => {
            sendResponse({ status: "logged_out" });
        });
        return true;
    }

    if (request.action === "saveComponent") {
        console.log("--------------------------------------------------");
        console.log("📥 BACKGROUND: Received Component Data");
        console.log("--------------------------------------------------");
        console.log("Name:", request.payload.name);
        console.log("Folder:", request.payload.folder);
        console.log("Generated Code Preview:", request.payload.generatedCode ? request.payload.generatedCode.substring(0, 100) + "..." : "None");
        console.log("Full Payload:", request.payload);
        console.log("--------------------------------------------------");

        // Simulate backend save delay
        setTimeout(() => {
            // In a real app, we would POST to the backend here
            // For now, we'll just log success
            console.log("Component saved successfully (mock)");
            sendResponse({ success: true });
        }, 500);

        return true; // Keep channel open for async response
    }

    if (request.action === "takeScreenshot" && sender.tab?.id) {
        const tabId = sender.tab.id;
        const targetId = request.targetId;

        // 1. Inject the html2canvas library
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['html2canvas.min.js'],
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("html2canvas injection failed:", chrome.runtime.lastError.message);
                sendResponse({ error: "html2canvas injection failed: " + chrome.runtime.lastError.message });
                return;
            }

            // 2. Inject and execute the function that uses html2canvas
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: takeScreenshot,
                args: [targetId],
            }, (injectionResults) => {
                if (chrome.runtime.lastError) {
                    console.error("Screenshot script execution failed:", chrome.runtime.lastError.message);
                    sendResponse({ error: "Screenshot script execution failed: " + chrome.runtime.lastError.message });
                    return;
                }

                if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                    sendResponse({ dataUrl: injectionResults[0].result });
                } else {
                    // Check if html2canvas itself threw an error inside the page
                    const errorResult = injectionResults[0]?.result?.error;
                    if (errorResult) {
                        sendResponse({ error: `html2canvas error: ${errorResult}` });
                    } else {
                        sendResponse({ error: "Failed to get screenshot data. The element might be empty or not renderable." });
                    }
                }
            });
        });

        return true; // Keep message channel open for async response
    }
});

// This function is injected into the target page to run html2canvas.
function takeScreenshot(targetId) {
    const element = document.getElementById(targetId);
    if (!element) {
        return { error: "Target element not found." };
    }

    // This code runs in the page's context, so we can use a try/catch
    // to handle errors from html2canvas and return them.
    try {
        // DIRECT CAPTURE STRATEGY
        // We capture the element directly to preserve styles and context.
        // The overlay and other UI elements should be hidden by the caller before this runs.

        return html2canvas(element, {
            useCORS: true,
            backgroundColor: null,
            scale: window.devicePixelRatio,
            logging: false,
            // allowTaint: false, // Default
            // foreignObjectRendering: false // Default
        }).then(canvas => {
            return canvas.toDataURL("image/png");
        }).catch(err => {
            console.error("html2canvas error:", err);
            throw err;
        });
    } catch (e) {
        return { error: e.toString() };
    }
}
