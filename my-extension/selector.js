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
        console.log("📸 Preparing element for screenshot...");

        const tempId = `component-capture-target-${Date.now()}`;
        currentTarget.id = tempId;

        // Pass the element and tempId back to the callback
        // The callback will handle the screenshot request
        onCaptureComplete({ element: currentTarget, tempId: tempId });
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

