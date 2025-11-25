// This is the list of CSS properties we care about.
const STYLE_WHITELIST = [
    'display', 'flex-direction', 'justify-content', 'align-items', 'gap', 'grid-gap',
    'width', 'height', 'padding', 'margin', 'border', 'border-radius', 'box-shadow',
    'color', 'background-color', 'font-family', 'font-size', 'font-weight',
    'line-height', 'letter-spacing', 'text-align', 'position', 'top', 'left',
    'right', 'bottom', 'transform', 'opacity'
];

function getFilteredStyles(computedStyles) {
    const styles = {};
    for (const prop of STYLE_WHITELIST) {
        const value = computedStyles.getPropertyValue(prop);
        if (value && value !== 'none' && value !== '0px' && value !== 'normal' && value !== 'auto') {
            styles[prop] = value;
        }
    }
    return styles;
}

function buildNodeBlueprint(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    const computedStyles = window.getComputedStyle(element);
    const blueprint = {
        tag: element.tagName.toLowerCase(),
        classes: Array.from(element.classList),
        styles: getFilteredStyles(computedStyles),
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
        const childBlueprint = buildNodeBlueprint(child);
        if (childBlueprint) {
            blueprint.children.push(childBlueprint);
        }
    });

    return blueprint;
}

function createComponentBlueprint(element, screenshotDataUrl) {
    const rootBlueprint = buildNodeBlueprint(element);
    return {
        html: element.outerHTML,
        ...rootBlueprint,
        screenshot: screenshotDataUrl
    };
}

/**
 * Starts the component selection mode.
 * @param {function} onCaptureComplete - Callback function executed with the blueprint once capture is done.
 */
export function startSelectionMode(onCaptureComplete) {
    const overlay = document.createElement("div");
    overlay.id = "component-highlight-overlay";
    document.body.appendChild(overlay);

    let currentTarget = null;

    // Helper function to update overlay position based on currentTarget
    const updateOverlayPosition = () => {
        if (!currentTarget) return;
        
        const rect = currentTarget.getBoundingClientRect();
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
    };

    const moveHandler = (e) => {
        // Prevent the panel from being selected
        const panel = document.getElementById('component-capture-panel');
        if (panel && panel.contains(e.target)) {
            overlay.style.display = 'none';
            return;
        }
        
        overlay.style.display = 'none';
        const el = document.elementFromPoint(e.clientX, e.clientY);
        overlay.style.display = '';

        if (!el || el === currentTarget) return;
        currentTarget = el;

        updateOverlayPosition();
    };

    const scrollHandler = () => {
        // Update overlay position when user scrolls
        updateOverlayPosition();
    };

    const clickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();

        if (!currentTarget) {
            console.log("No element selected.");
            onCaptureComplete(null); // Signal that capture was cancelled
            return;
        }

        console.log("✅ CAPTURED ELEMENT:", currentTarget);
        console.log("📸 Requesting screenshot and building blueprint...");

        const tempId = `component-capture-target-${Date.now()}`;
        currentTarget.id = tempId;

        chrome.runtime.sendMessage({ action: "takeScreenshot", targetId: tempId }, (response) => {
            const capturedElement = document.getElementById(tempId);
            if (!capturedElement) return;

            if (chrome.runtime.lastError || (response && response.error)) {
                console.error("Screenshot failed:", chrome.runtime.lastError?.message || response.error);
                onCaptureComplete(null); // Signal failure
            } else if (response && response.dataUrl) {
                const blueprint = createComponentBlueprint(capturedElement, response.dataUrl);
                console.log("✨ Component Blueprint Created ✨");
                onCaptureComplete(blueprint); // Pass the blueprint to the callback
            }
            
            capturedElement.id = '';
        });
    };

    const escapeHandler = (e) => {
        if (e.key === "Escape") {
            console.log("Selection cancelled by user.");
            cleanup();
            onCaptureComplete(null); // Signal that capture was cancelled
        }
    };

    function cleanup() {
        document.removeEventListener("mousemove", moveHandler, true);
        document.removeEventListener("click", clickHandler, true);
        document.removeEventListener("keydown", escapeHandler, true);
        document.removeEventListener("scroll", scrollHandler, true);
        if (overlay) overlay.remove();
    }

    document.addEventListener("mousemove", moveHandler, true);
    document.addEventListener("click", clickHandler, true);
    document.addEventListener("keydown", escapeHandler, true);
    document.addEventListener("scroll", scrollHandler, true);
}

