# CiraLink AI Assistant Widget (Secure Version)

CiraLink is a complete, production-ready AI assistant widget that can be embedded on any website. This version has been refactored to use a **secure serverless proxy**, ensuring your API keys are never exposed to the client-side.

It is fully static (plus one serverless function), easily deployable on Netlify, and supports license-based feature control through the LemonSqueezy API.

## Key Features

-   **Secure API Proxy**: All communication with external services (OpenAI, LemonSqueezy) is routed through a serverless function, protecting your secret API keys.
-   **Domain-Locked Licenses**: Each license key is automatically locked to the domain it is first used on, preventing unauthorized use on other websites.
-   **Custom Personalities & Knowledge**: Define a custom personality and provide a specific knowledge base for the AI on `pro` and `business` plans.
-   **Floating Widget**: A clean, floating microphone/chat icon on the bottom-right of the host website.
-   **Text & Voice**: Supports text-based conversation and optional voice interaction via the Web Speech API.
-   **AI-Powered**: Integrates with the OpenAI GPT-3.5 API for intelligent responses.
-   **License-Controlled**: Features are enabled based on a validated LemonSqueezy license key (`text`, `pro`, or `business` plans).
-   **Customizable & Deployable**: Easily configure and deploy on Netlify.

---

## Setup Guide

(Setup instructions remain the same as the previous version: Get API keys, deploy to Netlify, and configure environment variables.)

---

## Embedding and Customization

Once deployed, use the public URL provided by Netlify. Paste the snippet just before the closing `</body>` tag on your site.

### `data-*` Attributes

-   `data-key` **(Required)**: The LemonSqueezy license key for the client.
-   `data-theme`: `"light"` (default) or `"dark"`.
-   `data-voice`: The preferred voice for text-to-speech (e.g., `"Google UK English Female"`).
-   `data-personality` **(Pro/Business Only)**: A string that defines the AI's personality. This is sent as a system prompt to OpenAI.
-   `data-knowledge` **(Pro/Business Only)**: A string containing specific information, rules, or FAQs that the AI must use in its responses.
-   `data-call-routing`: `"true"` to enable call routing (Business only).
-   `data-debug`: `"true"` to log all activity to the console.

### Embed Examples

**Basic Embed (Text Plan):**
```html
<script async src="https://your-ciralink-site.netlify.app/assistant.js" data-key="TEXT_PLAN_LICENSE_KEY"></script>
```

**Pro Plan with Custom Personality:**
```html
<script async
  src="https://fancy-lolly-e933c9.netlify.app/assistant.js"
  data-key="PRO_PLAN_LICENSE_KEY"
  data-theme="dark"
  data-personality="You are a cheerful and helpful assistant named Sparky. You love to use emojis. ✨">
</script>
```

**Business Plan with Custom Knowledge Base:**
```html
<script async
  src="https://your-ciralink-site.netlify.app/assistant.js"
  data-key="BUSINESS_PLAN_LICENSE_KEY"
  data-personality="You are a professional support agent for ACME Inc."
  data-knowledge="
    - Our return policy is 30 days, no questions asked.
    - For technical support, users should email help@acme.inc.
    - Our office hours are 9 AM to 5 PM Eastern Time.
    - Do not offer discounts unless a user mentions they are a first-time customer.
  ">
</script>
```

---

## How the Security Features Work

(Security explanation remains the same: API proxy and domain-locking.)