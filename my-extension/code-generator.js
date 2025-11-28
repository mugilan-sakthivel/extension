
/**
 * Converts a DOM blueprint into a React component string with Tailwind CSS.
 * @param {Object} blueprint - The captured DOM blueprint.
 * @param {string} componentName - The name of the component.
 * @returns {string} The generated React component code.
 */
export function generateReactCode(blueprint, componentName = 'GeneratedComponent') {
    const imports = `import React from 'react';\nimport { ArrowRight, Check, Star, User, Menu, Search } from 'lucide-react'; // Example icons, adjust as needed\n\n`;

    // Track custom fonts to notify the user
    const customFonts = new Set();

    function getTailwindClass(prop, value) {
        // Basic mapping logic - expand this based on requirements
        if (!value) return '';

        // Remove 'px' for numeric calculations
        const numVal = parseInt(value);

        switch (prop) {
            case 'display':
                if (value === 'flex') return 'flex';
                if (value === 'grid') return 'grid';
                if (value === 'none') return 'hidden';
                if (value === 'block') return 'block';
                if (value === 'inline-block') return 'inline-block';
                return '';

            case 'flex-direction':
                if (value === 'column') return 'flex-col';
                if (value === 'row') return 'flex-row';
                return '';

            case 'justify-content':
                if (value === 'center') return 'justify-center';
                if (value === 'space-between') return 'justify-between';
                if (value === 'flex-start') return 'justify-start';
                if (value === 'flex-end') return 'justify-end';
                return '';

            case 'align-items':
                if (value === 'center') return 'items-center';
                if (value === 'flex-start') return 'items-start';
                if (value === 'flex-end') return 'items-end';
                return '';

            case 'gap':
            case 'grid-gap':
                return `gap-${Math.round(numVal / 4)}`;

            case 'padding':
                return `p-[${value}]`; // Use arbitrary values for exact match or map to scale

            case 'margin':
                return `m-[${value}]`;

            case 'width':
                if (value === '100%') return 'w-full';
                if (numVal > 1000) return 'w-full max-w-7xl'; // Container logic
                return `w-[${value}]`;

            case 'height':
                if (value === '100%') return 'h-full';
                return `h-[${value}]`;

            case 'background-color':
                // Complex color mapping would go here. For now, using arbitrary values
                if (value === 'rgba(0, 0, 0, 0)' || value === 'transparent') return '';
                return `bg-[${value}]`;

            case 'color':
                return `text-[${value}]`;

            case 'font-size':
                return `text-[${value}]`;

            case 'font-weight':
                if (numVal >= 700 || value === 'bold') return 'font-bold';
                if (numVal >= 600) return 'font-semibold';
                if (numVal >= 500) return 'font-medium';
                return 'font-normal';

            case 'text-align':
                return `text-${value}`;

            case 'border-radius':
                if (numVal >= 9999 || value === '50%') return 'rounded-full';
                if (numVal >= 16) return 'rounded-2xl';
                if (numVal >= 8) return 'rounded-lg';
                if (numVal >= 4) return 'rounded-md';
                return `rounded-[${value}]`;

            case 'font-family':
                // Extract font name
                const fontName = value.split(',')[0].replace(/['"]/g, '').trim();
                if (fontName !== 'Inter' && fontName !== 'system-ui') {
                    customFonts.add(fontName);
                }
                return ''; // Don't add class, handled via config comment

            default:
                return '';
        }
    }

    function processNode(node, depth = 0) {
        if (!node) return '';

        const { tag, classes, styles, children, text, html } = node;

        // Map HTML tags to semantic equivalents if needed
        let ComponentTag = tag;
        if (tag === 'div' && classes.includes('button')) ComponentTag = 'button';
        if (tag === 'input') ComponentTag = 'input';
        if (tag === 'img') ComponentTag = 'img';

        // Generate Tailwind classes
        let tailwindClasses = [];
        for (const [prop, value] of Object.entries(styles || {})) {
            const twClass = getTailwindClass(prop, value);
            if (twClass) tailwindClasses.push(twClass);
        }

        // Add semantic classes based on tag
        if (tag === 'button') tailwindClasses.push('cursor-pointer transition-opacity hover:opacity-80');
        if (tag === 'input') tailwindClasses.push('outline-none focus:ring-2 focus:ring-blue-500');

        const classNameString = tailwindClasses.join(' ');

        // Handle self-closing tags
        if (['img', 'input', 'br', 'hr'].includes(tag)) {
            // Extract attributes from HTML string if possible, or use defaults
            let attributes = '';
            if (tag === 'img') attributes = 'src="https://placehold.co/600x400" alt="Placeholder"';
            if (tag === 'input') attributes = 'type="text" placeholder="Enter text..."';

            // Try to parse real attributes from the outerHTML stored in 'html' field if available
            // This is a simplified parsing for the demo
            if (html) {
                const srcMatch = html.match(/src="([^"]*)"/);
                if (srcMatch) attributes = `src="${srcMatch[1]}" alt="Image"`;

                const placeholderMatch = html.match(/placeholder="([^"]*)"/);
                if (placeholderMatch) attributes += ` placeholder="${placeholderMatch[1]}"`;
            }

            return `<${ComponentTag} className="${classNameString}" ${attributes} />`;
        }

        // Recursively process children
        const childrenCode = children.map(child => processNode(child, depth + 1)).join('\n');

        // Content logic
        let content = text || childrenCode;

        return `<${ComponentTag} className="${classNameString}">
    ${content}
</${ComponentTag}>`;
    }

    const rootJsx = processNode(blueprint);

    const fontComment = customFonts.size > 0
        ? `// Configure these fonts in tailwind.config.js: ${Array.from(customFonts).join(', ')}\n\n`
        : '';

    return `${fontComment}${imports}
export default function ${componentName}() {
    return (
        ${rootJsx}
    );
}`;
}
