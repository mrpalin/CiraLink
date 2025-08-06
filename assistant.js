/* CiraLink AI Assistant Widget - assistant.js */

(function() {
    "use strict";

    // --- CONFIGURATION ---
    const CIRA_LINK_CONFIG = {
        PROXY_API_URL: "/api/proxy",
        RETELL_AGENT_ID: "YOUR_RETELL_AGENT_ID",
        PLAN_LIMITS: {
            text: { messages: 500, voice_minutes: 0 },
            pro: { messages: 750, voice_minutes: 500 },
            premium: { messages: 1500, voice_minutes: 1000 },
            business: { messages: 2000, voice_minutes: 2000 },
        },
    };

    // --- STATE MANAGEMENT ---
    const CiraState = {
        license: null,
        plan: null,
        settings: {},
        usage: { messages: 0, voice_minutes: 0 },
        conversation: [],
        isChatOpen: false,
        isSpeaking: false,
        isRecognizing: false,
    };

    // --- UTILITY FUNCTIONS ---
    const log = (...args) => {
        if (CiraState.settings.debug) {
            console.log("[CiraLink]", ...args);
        }
    };

    const getScriptData = () => {
        const scriptTag = document.querySelector('script[src*="assistant.js"]');
        if (!scriptTag) {
            console.error("[CiraLink] Could not find the script tag.");
            return null;
        }
        return {
            key: scriptTag.dataset.key,
            theme: scriptTag.dataset.theme || "light",
            voice: scriptTag.dataset.voice || "default",
            personality: scriptTag.dataset.personality || null,
            knowledge: scriptTag.dataset.knowledge || null,
            callRouting: scriptTag.dataset.callRouting === "true",
            debug: scriptTag.dataset.debug === "true",
            assistantUrl: scriptTag.src,
        };
    };
    
    // --- SECURE API FETCHER ---
    async function fetchViaProxy(targetApi, payload) {
        try {
            const response = await fetch(CIRA_LINK_CONFIG.PROXY_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetApi, payload }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `API request failed: ${response.status}` }));
                throw new Error(errorData.error || "Unknown API error");
            }
            return response.json();
        } catch (error) {
            log(`Error via proxy for ${targetApi}:`, error);
            throw error;
        }
    }

    // --- CORE INITIALIZATION ---
    async function init() {
        CiraState.settings = getScriptData();
        if (!CiraState.settings) {
            // Can't do anything if the script tag is missing.
            return;
        }

        log("Initializing with:", CiraState.settings);
        loadCSS();
        createWidgetUI(); // Create the UI first, so we can show errors in it.
        setupEventListeners();

        if (!CiraState.settings.key) {
            return addMessageToUI("assistant", "License key is missing. Please add `data-key` to the script tag.");
        }

        const license = await validateLicense(CiraState.settings.key);
        if (!license) {
            // The validateLicense function will have already added an error message.
            return;
        }

        CiraState.license = license;
        CiraState.plan = (license.meta.variant_name || 'text').toLowerCase().replace(' plan', '');
        log(`License valid. Plan: ${CiraState.plan}`);

        loadInitialState();
        renderConversation(); // Re-render conversation from loaded state
        updateUsageCounter();
    }

    // --- LICENSE & STATE ---
    async function validateLicense(licenseKey) {
        try {
            const payload = { 
                license_key: licenseKey,
                instance_name: window.location.hostname
            };
            const data = await fetchViaProxy('lemonsqueezy', payload);
            if (!data.valid) {
                addMessageToUI("assistant", data.error || "Invalid license for this domain.");
                log("License validation failed:", data);
                return null;
            }
            return data;
        } catch (error) {
            addMessageToUI("assistant", "Cannot connect to the license server. Please check your connection or API proxy.");
            log("License validation error:", error);
            return null;
        }
    }

    function loadInitialState() {
        const saved = localStorage.getItem(`cira_link_state_${CiraState.settings.key}`);
        if (saved) {
            const parsed = JSON.parse(saved);
            const lastSavedMonth = new Date(parsed.timestamp || 0).getMonth();
            if (new Date().getMonth() === lastSavedMonth) {
                CiraState.usage = parsed.usage || { messages: 0, voice_minutes: 0 };
                CiraState.conversation = parsed.conversation || [];
            }
        }
        log("Initial state:", CiraState);
    }

    function saveState() {
        const state = {
            usage: CiraState.usage,
            conversation: CiraState.conversation,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem(`cira_link_state_${CiraState.settings.key}`, JSON.stringify(state));
        log("State saved.");
    }

    // --- UI CREATION & MANIPULATION ---
    function loadCSS() {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = new URL("style.css", CiraState.settings.assistantUrl).href;
        document.head.appendChild(link);
    }

    function createWidgetUI() {
        const container = document.createElement("div");
        container.id = "cira-widget-container";
        container.dataset.theme = CiraState.settings.theme;

        container.innerHTML = 
            '<div id="cira-chat-window">' +
                '<div id="cira-chat-header"><h3>CiraLink Assistant</h3><p>Powered by AI</p></div>' +
                '<div id="cira-chat-body"></div>' +
                '<div id="cira-chat-footer">' +
                    '<span id="cira-usage-counter"></span>' +
                    '<a href="https://ciralink.com" target="_blank">Powered by CiraLink</a>' +
                '</div>' +
            '</div>' +
            '<div id="cira-fab" title="Chat with Assistant">' +
                '<svg id="cira-fab-icon-mic" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5a6 6 0 00-12 0v1.5a6 6 0 006 6z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5a7.5 7.5 0 11-15 0" /></svg>' +
                '<svg id="cira-fab-icon-chat" style="display:none;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.724.39c-.52.054-.994.396-1.214.862l-2.24 4.481c-.355.71-1.52.71-1.875 0l-2.24-4.481a1.875 1.875 0 01-1.214-.862l-3.724-.39A2.25 2.25 0 012.25 15v-4.286c0-.97.616-1.813 1.5-2.097m16.5 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 8.511m16.5 0c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.724.39c-.52.054-.994.396-1.214.862l-2.24 4.481c-.355.71-1.52.71-1.875 0l-2.24-4.481a1.875 1.875 0 01-1.214-.862l-3.724-.39A2.25 2.25 0 012.25 15v-4.286c0-.97.616-1.813 1.5-2.097" /></svg>' +
            '</div>';
        document.body.appendChild(container);
    }

    function toggleChatWindow() {
        CiraState.isChatOpen = !CiraState.isChatOpen;
        document.getElementById("cira-chat-window").classList.toggle("cira-open", CiraState.isChatOpen);
        log(`Chat window ${CiraState.isChatOpen ? 'opened' : 'closed'}`);
    }

    function addMessageToUI(sender, text) {
        const chatBody = document.getElementById("cira-chat-body");
        if (!chatBody) return; // Don't do anything if the UI isn't ready
        const messageEl = document.createElement("div");
        messageEl.className = `cira-message cira-${sender}`;
        messageEl.innerHTML = 
            '<div class="cira-bubble">' + text + '</div>' +
            '<div class="cira-timestamp">' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</div>';
        chatBody.appendChild(messageEl);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function renderConversation() {
        const chatBody = document.getElementById("cira-chat-body");
        if (!chatBody) return;
        chatBody.innerHTML = ''; // Clear existing messages
        CiraState.conversation.forEach(msg => addMessageToUI(msg.role, msg.content));
    }

    function updateUsageCounter() {
        const counterEl = document.getElementById("cira-usage-counter");
        if (!counterEl || !CiraState.plan) return;
        const limits = CIRA_LINK_CONFIG.PLAN_LIMITS[CiraState.plan];
        if (!limits) return;
        const remainingMessages = limits.messages - CiraState.usage.messages;
        let text = `${remainingMessages} messages left`;
        if (limits.voice_minutes > 0) {
            const remainingMinutes = Math.floor(limits.voice_minutes - CiraState.usage.voice_minutes);
            text += ` | ${remainingMinutes} minutes left`;
        }
        counterEl.textContent = text;
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        document.getElementById("cira-fab").addEventListener("click", handleFabClick);
    }

    // --- CORE LOGIC ---
    function handleFabClick() {
        if (!CiraState.license) {
            // If the license is invalid, just open the window to show the error.
            return toggleChatWindow();
        }
        if (!CiraState.isChatOpen) toggleChatWindow();
        
        const limits = CIRA_LINK_CONFIG.PLAN_LIMITS[CiraState.plan];
        if (CiraState.usage.messages >= limits.messages) {
            return addMessageToUI("assistant", "You have reached your monthly message limit.");
        }
        if (CiraState.plan === 'text') {
            handleTextInput();
        } else {
            if (CiraState.usage.voice_minutes >= limits.voice_minutes) {
                return addMessageToUI("assistant", "You have reached your monthly voice minutes limit.");
            }
            handleVoiceInput();
        }
    }

    function handleTextInput() {
        const userInput = prompt("Ask the assistant:");
        if (userInput) processMessage(userInput);
    }

    async function processMessage(text) {
        addMessageToUI("user", text);
        CiraState.conversation.push({ role: "user", content: text });
        CiraState.usage.messages++;
        updateUsageCounter();

        try {
            let systemPrompt = "You are a helpful assistant.";
            if (CiraState.settings.personality) systemPrompt = CiraState.settings.personality;
            if (CiraState.settings.knowledge) {
                systemPrompt += `\n\nUse this information: ${CiraState.settings.knowledge}`;
            }

            const messagesForAPI = [
                { role: "system", content: systemPrompt },
                ...CiraState.conversation
            ];

            const payload = {
                messages: messagesForAPI,
                plan: CiraState.plan,
            };
            const data = await fetchViaProxy('openai', payload);
            const assistantReply = data.choices[0].message.content;

            addMessageToUI("assistant", assistantReply);
            CiraState.conversation.push({ role: "assistant", content: assistantReply });

            if (CiraState.plan !== 'text') speak(assistantReply);
            saveState();

        } catch (error) {
            log("Error processing message:", error);
            addMessageToUI("assistant", "Sorry, I couldn't connect to the AI.");
        }
    }

    // --- SPEECH API ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    function handleVoiceInput() {
        if (!recognition) {
            addMessageToUI("assistant", "Voice recognition is not supported by your browser.");
            return handleTextInput();
        }
        if (CiraState.isRecognizing) return recognition.stop();

        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.start();

        let startTime;
        recognition.onstart = () => {
            CiraState.isRecognizing = true;
            startTime = new Date();
            log("Voice recognition started.");
        };
        recognition.onresult = (event) => {
            processMessage(event.results[0][0].transcript);
        };
        recognition.onspeechend = () => {
            recognition.stop();
            const duration = (new Date() - startTime) / 60000; // minutes
            CiraState.usage.voice_minutes += duration;
            updateUsageCounter();
            saveState();
        };
        recognition.onend = () => CiraState.isRecognizing = false;
        recognition.onerror = (event) => {
            log("Voice recognition error:", event.error);
            addMessageToUI("assistant", `Voice error: ${event.error}`);
        };
    }

    function speak(text) {
        if (!('speechSynthesis' in window)) return;
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = speechSynthesis.getVoices();
        if (CiraState.settings.voice && CiraState.settings.voice !== 'default') {
            utterance.voice = voices.find(v => v.name === CiraState.settings.voice);
        }
        let startTime;
        utterance.onstart = () => {
            CiraState.isSpeaking = true;
            startTime = new Date();
        };
        utterance.onend = () => {
            CiraState.isSpeaking = false;
            const duration = (new Date() - startTime) / 60000; // minutes
            CiraState.usage.voice_minutes += duration;
            updateUsageCounter();
            saveState();
        };
        speechSynthesis.speak(utterance);
    }

    // --- START THE WIDGET ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
