console.log("Content script loaded.");

// Listener for messages from background or popup scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log("Message received in content script:", message);  // Check if the message is received

    if (message.type === 'analyzePage') {
        const pageURL = message.pageURL || window.location.href; // Capture URL from message or fallback to window URL

        // Analyze the page and collect scripts, cookies, and trackers
        const scripts = analyzeScripts();
        const cookies = analyzeCookies(); // Cookies are already categorized here
        const trackers = detectTrackers();

        // Save analysis data to chrome.storage.local
        chrome.storage.local.set({
            pageAnalysis: {
                pageURL: pageURL,  // Store the page URL as part of the analysis
                scripts: scripts,
                cookies: cookies,
                trackers: trackers
            }
        }, () => {
            console.log('Page analysis saved.');

            // Send categorized data to background.js
            chrome.runtime.sendMessage({
                type: 'categorizedData',
                pageURL: pageURL,
                cookies: cookies,
                scripts: scripts,
                trackers: trackers
            });
            // console.log("Detected scripts:", scripts);
            sendResponse({ analysisComplete: true });
        });

        return true; // Keeps the message channel open for async response
    }

    // Handle report request
    if (message.type === 'requestDetailedReport') {
        chrome.storage.local.get('pageAnalysis', function(result) {
            console.log('Data retrieved from storage:', result.pageAnalysis); 
            if (result.pageAnalysis) {
                sendResponse({ report: JSON.stringify(result.pageAnalysis, null, 2) });
            } else {
                sendResponse({ report: null });
            }
        });
        return true; // Keeps the message channel open for async response
    }
});

// Analyze scripts on the page
function analyzeScripts() {
    return Array.from(document.scripts)
        .filter(script => script.src) // Exclude inline scripts
        .map(script => {
            const scriptDetails = {
                src: script.src,
                attributes: {
                    async: script.hasAttribute('async'),
                    defer: script.hasAttribute('defer'),
                    crossorigin: script.getAttribute('crossorigin') || 'N/A',
                }
            };
            return scriptDetails;
        });
}

// Analyze cookies on the page
// Analyze cookies on the page
function analyzeCookies() {
    const cookieCategories = {
        advertising: ['doubleclick.net', 'ads.twitter.com', 'adroll.com'],
        analytics: ['google-analytics.com', 'mixpanel.com', 'quantserve.com', 'hotjar.com'],
        socialMedia: ['facebook.com', 'linkedin.com'],
        research: ['scorecardresearch.com'],
        session: ['session'], // Example of session cookies
        // Add more categories as needed
    };

    return document.cookie.split(';').map(cookie => {
        const cookieValue = cookie.trim();
        const [name, value] = cookieValue.split('=');
        const cookieDomain = extractCookieDomain(cookieValue);
        const cookieProps = {
            value: cookieValue,
            name: name || 'N/A',
            domain: cookieDomain,
            expires: extractCookieExpiry(cookieValue),
            type: determineCookieType(name, cookieCategories) // Get type based on cookie name
        };
        return cookieProps;
    });
}

// Determine the type of the cookie based on its name
function determineCookieType(name, categories) {
    if (name.includes('session')) {
        return 'Session'; // Example for session cookies
    }

    for (const [type, domainList] of Object.entries(categories)) {
        if (domainList.some(domain => name.includes(domain))) {
            return type.charAt(0).toUpperCase() + type.slice(1); // Capitalize type
        }
    }
    return 'Other'; // Default type if no match
}

// Extract domain from the cookie string (if available)
function extractCookieDomain(cookie) {
    const domainMatch = cookie.match(/domain=([^;]*)/i);
    return domainMatch ? domainMatch[1] : 'N/A';
}

// Extract expiration from the cookie string (if available)
function extractCookieExpiry(cookie) {
    const expiryMatch = cookie.match(/expires=([^;]*)/i);
    return expiryMatch ? expiryMatch[1] : 'Session Only';
}

// Detect trackers by checking external resources and known tracker domains
function detectTrackers() {
    const trackers = [];
    const trackerDomains = [
        { domain: 'google-analytics.com', type: 'Analytics', description: 'Google Analytics for tracking user interactions.' },
        { domain: 'facebook.com', type: 'Social Media', description: 'Facebook tracking for social media interactions.' },
        { domain: 'doubleclick.net', type: 'Advertising', description: 'DoubleClick for ad serving and tracking.' },
        { domain: 'ads.twitter.com', type: 'Advertising', description: 'Twitter Ads for advertisement tracking.' },
        { domain: 'scorecardresearch.com', type: 'Research', description: 'Scorecard Research for web traffic analysis.' },
        { domain: 'quantserve.com', type: 'Analytics', description: 'Quantcast for audience measurement.' },
        { domain: 'linkedin.com', type: 'Social Media', description: 'LinkedIn tracking for social interactions.' },
        { domain: 'hotjar.com', type: 'Analytics', description: 'Hotjar for user behavior analytics.' },
        { domain: 'mixpanel.com', type: 'Analytics', description: 'Mixpanel for product analytics.' },
        { domain: 'adroll.com', type: 'Advertising', description: 'AdRoll for retargeting ads.' }
    ];

    const resources = Array.from(document.querySelectorAll('img, script, iframe, link')).map(elem => elem.src || elem.href || '');

    resources.forEach(resource => {
        if (resource) {
            try {
                const url = new URL(resource);
                const domain = url.hostname;
                const matchedTracker = trackerDomains.find(tracker => domain.includes(tracker.domain));
                if (matchedTracker) {
                    trackers.push({
                        domain: domain,
                        type: matchedTracker.type,
                        description: matchedTracker.description
                    });
                }
            } catch (error) {
                console.error("Error parsing resource URL:", resource, error);
            }
        }
    });

    return trackers.length ? trackers : [{ domain: 'None', type: 'None', description: 'No Trackers Detected' }];
}
