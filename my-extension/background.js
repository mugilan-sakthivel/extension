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
        // MANUAL CLONE STRATEGY
        // We clone the element manually to sanitize it BEFORE html2canvas sees it.
        // This prevents CSP violations from scripts/iframes.

        const clone = element.cloneNode(true);

        // 1. Sanitize the clone
        const elementsToRemove = clone.querySelectorAll('script, noscript, iframe, link[rel="preload"], link[rel="modulepreload"]');
        elementsToRemove.forEach(el => el.remove());

        // 2. Style the clone to match original position but be invisible to user
        // We append it to body to ensure it renders, but position it absolutely
        // on top of the original (or off-screen if possible, but on-top is safer for layout)
        const rect = element.getBoundingClientRect();
        clone.style.position = 'absolute';
        clone.style.top = `${rect.top + window.scrollY}px`;
        clone.style.left = `${rect.left + window.scrollX}px`;
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.zIndex = '-9999'; // Put it behind everything just in case
        clone.style.pointerEvents = 'none';
        clone.style.margin = '0'; // Reset margins to avoid offsets

        // Copy computed styles for the container itself to ensure layout match
        const computedStyle = window.getComputedStyle(element);
        Array.from(computedStyle).forEach(key => {
            // We don't copy everything, just layout essentials if needed. 
            // Actually, cloneNode(true) copies inline styles, but not computed.
            // For the root clone, we might need to be careful.
            // Let's rely on the fact that it's a clone.
        });

        document.body.appendChild(clone);

        return html2canvas(clone, {
            useCORS: true,
            backgroundColor: null,
            scale: window.devicePixelRatio,
            // We don't need scroll adjustment for the clone since we positioned it absolutely
            // relative to the document
            // scrollX: -window.scrollX, 
            // scrollY: -window.scrollY,
            windowWidth: document.documentElement.offsetWidth,
            windowHeight: document.documentElement.offsetHeight,
            logging: false, // Turn off logging to reduce noise
        }).then(canvas => {
            // Cleanup
            document.body.removeChild(clone);
            return canvas.toDataURL("image/png");
        }).catch(err => {
            // Cleanup on error
            if (clone.parentNode) document.body.removeChild(clone);
            throw err;
        });
    } catch (e) {
        return { error: e.toString() };
    }
}
