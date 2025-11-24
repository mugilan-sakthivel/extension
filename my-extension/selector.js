// This is the list of CSS properties we care about.
const STYLE_WHITELIST = [
    // Layout & Box Model
    'display', 'position', 'top', 'left', 'right', 'bottom', 'z-index',
    'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'box-sizing', 'overflow', 'overflow-x', 'overflow-y',

    // Flexbox & Grid
    'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
    'justify-content', 'align-items', 'align-content', 'align-self',
    'gap', 'row-gap', 'column-gap',
    'grid-template-columns', 'grid-template-rows',

    // Typography
    'font-family', 'font-size', 'font-weight', 'line-height', 'color',
    'text-align', 'text-decoration', 'text-transform', 'letter-spacing',
    'white-space', 'word-break', 'text-overflow',

    // Visuals
    'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
    'box-shadow', 'opacity', 'cursor', 'pointer-events',

    // Transforms & Transitions
    'transform', 'transform-origin', 'transition'
];

const DEFAULT_VALUES = {
    'position': 'static',
    'z-index': 'auto',
    'display': 'block', // Context dependent, but often default
    'flex-direction': 'row',
    'flex-wrap': 'nowrap',
    'flex-grow': '0',
    'flex-shrink': '1',
    'opacity': '1',
    'background-color': 'rgba(0, 0, 0, 0)',
    'background-image': 'none',
    'box-shadow': 'none',
    'transform': 'none',
    'text-align': 'start',
    'cursor': 'auto',
    'pointer-events': 'auto',
    'white-space': 'normal',
    'text-decoration': 'none solid rgb(0, 0, 0)', // Computed value often looks like this
    'min-width': '0px',
    'min-height': '0px',
    'max-width': 'none',
    'max-height': 'none'
};

function getFilteredStyles(computedStyles) {
    const styles = {};
    for (const prop of STYLE_WHITELIST) {
        const value = computedStyles.getPropertyValue(prop);

        // Filter out null, empty, or default values to reduce noise
        if (!value || value === '' || value === 'none' || value === '0px' || value === 'auto' || value === 'normal') {
            continue;
        }

        // Check against specific defaults
        if (DEFAULT_VALUES[prop] && (value === DEFAULT_VALUES[prop] || value.startsWith(DEFAULT_VALUES[prop]))) {
            continue;
        }

        // Special handling for border/padding/margin shorthands if all sides are equal?
        // For now, we keep specific sides for accuracy, as 'margin: 0px' is filtered above.

        styles[prop] = value;
    }
    return styles;
}

function buildNodeBlueprint(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }

    // Cleaning: Skip unwanted tags
    const tagName = element.tagName;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'LINK', 'META', 'TEMPLATE'].includes(tagName)) {
        return null;
    }

    const computedStyles = window.getComputedStyle(element);

    // Cleaning: Skip hidden elements
    if (computedStyles.display === 'none' || computedStyles.visibility === 'hidden') {
        return null;
    }

    // Extract Attributes
    const attributes = {};
    // Common attributes
    const attrNames = ['id', 'class', 'src', 'href', 'alt', 'title', 'type', 'placeholder', 'name', 'value', 'checked', 'disabled', 'selected', 'for', 'role', 'target', 'rel'];
    // ARIA attributes
    const ariaAttrs = Array.from(element.attributes).filter(attr => attr.name.startsWith('aria-')).map(attr => attr.name);
    // SVG attributes
    const svgAttrs = ['viewBox', 'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'points', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'preserveAspectRatio'];

    [...attrNames, ...ariaAttrs, ...svgAttrs].forEach(attr => {
        if (element.hasAttribute(attr)) {
            attributes[attr] = element.getAttribute(attr);
        }
    });
    if (element.value && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')) {
        attributes.value = element.value;
    }

    // Extract Pseudo-elements
    const pseudo = {};
    ['::before', '::after'].forEach(pseudoType => {
        const style = window.getComputedStyle(element, pseudoType);
        const content = style.getPropertyValue('content');
        if (content && content !== 'none' && content !== 'normal') {
            pseudo[pseudoType] = {
                content: content,
                styles: getFilteredStyles(style)
            };
        }
    });

    const blueprint = {
        tag: element.tagName.toLowerCase(),
        classes: Array.from(element.classList),
        styles: getFilteredStyles(computedStyles),
        attributes: attributes,
        pseudo: pseudo,
        children: []
    };

    if (['h1', 'h2', 'h3', 'h4', 'p', 'span', 'a', 'button', 'div', 'label', 'li'].includes(blueprint.tag)) {
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

function getUsedFontLinks(rootElement) {
    const usedFonts = new Set();
    const collectFonts = (el) => {
        if (el.nodeType !== Node.ELEMENT_NODE) return;
        const style = window.getComputedStyle(el);
        const families = style.fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
        families.forEach(f => usedFonts.add(f));
        Array.from(el.children).forEach(collectFonts);
    };
    collectFonts(rootElement);

    const fontLinks = [];
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
        const href = link.href;
        if (href.includes('fonts.googleapis.com') || href.includes('use.typekit.net') || href.includes('fonts.cdnfonts.com')) {
            for (const font of usedFonts) {
                if (href.includes(font.replace(/ /g, '+'))) {
                    fontLinks.push(href);
                    break;
                }
            }
        }
    });
    return [...new Set(fontLinks)];
}

function createComponentBlueprint(element, screenshotUrl = null) {
    const rootBlueprint = buildNodeBlueprint(element);
    const fontLinks = getUsedFontLinks(element);
    const result = {
        ...rootBlueprint,
        fonts: fontLinks
    };
    if (screenshotUrl) {
        result.screenshot = screenshotUrl;
    }
    return result;
}

/**
 * Captures the blueprint of the entire page.
 * @returns {object} The blueprint object.
 */
export function capturePageBlueprint() {
    console.log("📸 Capturing full page blueprint...");
    const blueprint = createComponentBlueprint(document.body);
    console.log("✨ Full Page Blueprint Created ✨");
    return blueprint;
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

        const rect = el.getBoundingClientRect();
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
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
                // onCaptureComplete(null); // Signal failure
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
        if (overlay) overlay.remove();
    }

    document.addEventListener("mousemove", moveHandler, true);
    document.addEventListener("click", clickHandler, true);
    document.addEventListener("keydown", escapeHandler, true);
}

