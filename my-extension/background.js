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

// Listens for the message from the content script to take a screenshot
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
