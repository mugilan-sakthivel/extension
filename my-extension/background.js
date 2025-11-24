

chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: "toggleUIPanel" });
        chrome.tabs.sendMessage(tab.id, { action: "extractDesignDNA" });
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
        }).then(canvas => {
            return canvas.toDataURL("image/png");
        });
    } catch (e) {
        return { error: e.toString() };
    }
}
