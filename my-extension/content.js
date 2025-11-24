console.log("Component Capture content script loaded.");

let uiManager = null;

// Listen for the message from the background script to toggle the UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleUIPanel") {
        togglePanel();
        sendResponse({ status: "UI Toggled" });
    } else if (request.action === "extractDesignDNA") {
        const designDNA = extractDesignDNA();
        console.log("--- DESIGN DNA EXTRACTED ---");
        console.log(JSON.stringify(designDNA, null, 2));
        sendResponse({ status: "Design DNA Extracted", data: designDNA });
    }
    return true;
});

function extractDesignDNA() {
    // 1. Helper to get computed styles
    const getStyle = (el, prop) => window.getComputedStyle(el).getPropertyValue(prop);

    // 2. Find Key Elements (Heuristics)
    const body = document.body;
    const h1 = document.querySelector('h1, h2');

    // Find a button that has a background color (likely primary)
    const allButtons = Array.from(document.querySelectorAll('button, a[class*="btn"], input[type="submit"], [role="button"]'));
    const primaryBtn = allButtons.find(b => {
        const bg = getStyle(b, 'background-color');
        return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 255, 255)' && bg !== 'rgba(255, 255, 255, 1)';
    }) || allButtons[0];

    // Find a card/container: div with box-shadow or background-color different from body
    const allDivs = Array.from(document.querySelectorAll('div'));
    const card = allDivs.find(d => {
        const shadow = getStyle(d, 'box-shadow');
        const bg = getStyle(d, 'background-color');
        const bodyBg = getStyle(body, 'background-color');
        return (shadow && shadow !== 'none') || (bg !== bodyBg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent');
    }) || allDivs.find(d => d.classList.contains('card') || d.classList.contains('container')) || allDivs[0];

    // 3. Extract The Math (The "Truth")
    const designSystem = {
        colors: {
            background: getStyle(body, 'background-color'), // e.g. "rgb(10, 10, 10)"
            surface: card ? getStyle(card, 'background-color') : null,
            border: card ? getStyle(card, 'border-color') : null,
            primary: primaryBtn ? getStyle(primaryBtn, 'background-color') : null,
            text_main: getStyle(h1 || body, 'color'),
            text_muted: getStyle(body, 'color') // assuming muted is same as body text for now
        },
        typography: {
            font_family_sans: getStyle(body, 'font-family'),
            font_family_serif: getStyle(body, 'font-family'), // same as sans for now
            font_family_mono: 'monospace', // default
            h1_size: h1 ? getStyle(h1, 'font-size') : null,
            h1_weight: h1 ? getStyle(h1, 'font-weight') : null,
            scale: 'normal' // placeholder
        },
        shapes: {
            radius_base: card ? getStyle(card, 'border-radius') : '0px',
            radius_button: primaryBtn ? getStyle(primaryBtn, 'border-radius') : '0px',
            border_width: card ? getStyle(card, 'border-width') : '0px',
            shadow: card ? getStyle(card, 'box-shadow') : 'none'
        },
        spacing: {
            btn_padding_top: primaryBtn ? getStyle(primaryBtn, 'padding-top') : '0px',
            btn_padding_left: primaryBtn ? getStyle(primaryBtn, 'padding-left') : '0px',
            density: 'compact' // placeholder
        }
    };

    // Store the design DNA separately
    localStorage.setItem('designDNA', JSON.stringify(designSystem));

    return designSystem;
}

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
