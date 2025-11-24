

chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: "toggleUIPanel" });
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
        return html2canvas(element, {
            useCORS: true,
            backgroundColor: null,
            scale: window.devicePixelRatio,
            scrollX: -window.scrollX,
            scrollY: -window.scrollY,
            windowWidth: document.documentElement.offsetWidth,
            windowHeight: document.documentElement.offsetHeight,
            ignoreElements: (node) => {
                return node.tagName === 'SCRIPT' || node.tagName === 'IFRAME' || node.tagName === 'NOSCRIPT';
            }
        }).then(canvas => {
            return canvas.toDataURL("image/png");
        });
    } catch (e) {
        return { error: e.toString() };
    }
}

/**
 * Captures the visible tab and crops it to the specified rectangle.
 * @param {number} tabId - The ID of the tab to capture.
 * @param {object} rect - The bounding rectangle {top, left, width, height, pixelRatio}.
 * @returns {Promise<string>} - The data URL of the cropped image.
 */
async function captureVisibleTabAndCrop(tabId, rect) {
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(tabId, { format: "png" });

        // In a Service Worker (MV3), we use OffscreenCanvas if available, or just return the full image
        // and let the client crop it. However, the requirement is to crop it here.
        // Assuming OffscreenCanvas is available in this environment.

        if (typeof OffscreenCanvas === 'undefined') {
            // Fallback for environments without OffscreenCanvas (e.g., older Chrome)
            // We can't crop easily in SW without it. Return full image.
            console.warn("OffscreenCanvas not supported. Returning full screenshot.");
            return dataUrl;
        }

        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        const { top, left, width, height, pixelRatio } = rect;
        const scale = pixelRatio || 1;

        const canvas = new OffscreenCanvas(width * scale, height * scale);
        const ctx = canvas.getContext('2d');

        // Draw the portion of the image
        ctx.drawImage(
            bitmap,
            left * scale, top * scale, width * scale, height * scale, // Source rect
            0, 0, width * scale, height * scale // Destination rect
        );

        const blobResult = await canvas.convertToBlob({ type: 'image/png' });
        const reader = new FileReader();
        return new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blobResult);
        });

    } catch (err) {
        console.error("Capture failed:", err);
        throw err;
    }
}

// Expose the fallback via message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureVisibleTab" && sender.tab?.id) {
        captureVisibleTabAndCrop(sender.tab.id, request.rect)
            .then(dataUrl => sendResponse({ dataUrl }))
            .catch(err => sendResponse({ error: err.toString() }));
        return true;
    }
});
