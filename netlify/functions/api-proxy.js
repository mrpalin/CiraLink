// Netlify Serverless Function - /netlify/functions/api-proxy.testing.js
// This is the TESTING version that bypasses LemonSqueezy validation.

exports.handler = async function(event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const { targetApi, payload } = JSON.parse(event.body);
        if (!targetApi || !payload) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing targetApi or payload' }) };
        }

        let apiUrl;
        let apiKey;

        switch (targetApi) {
            case 'lemonsqueezy':
                // --- Development Mode: Bypass LemonSqueezy validation ---
                const fakeLicenseResponse = {
                    valid: true,
                    meta: {
                        variant_name: "Pro Plan" // Can be "Pro Plan", "Business Plan", or "Text Plan"
                    }
                };
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(fakeLicenseResponse),
                };

            case 'openai':
                apiUrl = 'https://api.openai.com/v1/chat/completions';
                apiKey = process.env.OPENAI_API_KEY;
                break;

            default:
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid API target' }) };
        }

        if (!apiKey) {
             return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: `API key for ${targetApi} is not configured.` }),
            };
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        return {
            statusCode: response.status,
            headers,
            body: JSON.stringify(data),
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'An internal server error occurred.' }),
        };
    }
};
