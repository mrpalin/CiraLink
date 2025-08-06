/* CiraLink AI Assistant - embed.js */

(function() {
    "use strict";

    // --- CONFIGURATION ---
    // IMPORTANT: Update these URLs to point to your deployed assistant files on Netlify or another CDN.
    const ASSISTANT_URL = "https://your-widget.netlify.app/assistant.js";
    const CSS_URL = "https://your-widget.netlify.app/style.css";

    // --- SCRIPT LOADER ---
    function loadScript() {
        // Find the script tag for this embed script to read its data attributes
        const embedScript = document.currentScript;
        if (!embedScript) {
            console.error("[CiraLink Embed] Could not find the embed script tag.");
            return;
        }

        // Load the main stylesheet
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_URL;
        document.head.appendChild(link);

        // Create the main assistant script tag
        const assistantScript = document.createElement("script");
        assistantScript.async = true;
        assistantScript.src = ASSISTANT_URL;

        // Forward all data-* attributes from the embed script to the assistant script
        for (const key in embedScript.dataset) {
            if (Object.hasOwnProperty.call(embedScript.dataset, key)) {
                assistantScript.dataset[key] = embedScript.dataset[key];
            }
        }

        // Append the fully configured script to the body
        document.body.appendChild(assistantScript);
    }

    // --- INITIALIZATION ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadScript);
    } else {
        loadScript();
    }

})();
