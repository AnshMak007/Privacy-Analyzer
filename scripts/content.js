console.log("Content script loaded.");

// Listener for messages from background or popup scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log("Message received in content script:", message);  // Check if the message is received

    if (message.type === 'analyzePage') {
        // Analyze the page and collect scripts, cookies, and trackers
        const scripts = analyzeScripts();
        const cookies = analyzeCookies();
        const trackers = detectTrackers();

        // Save analysis data to chrome.storage.local
        chrome.storage.local.set({
            pageAnalysis: {
                scripts: scripts,
                cookies: cookies,
                trackers: trackers
            }
        }, () => {
            console.log('Page analysis saved.');
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

// Analyze scripts on the page and categorize them
function analyzeScripts() {
    return Array.from(document.scripts).map(script => {
        return {
            src: script.src || 'Inline Script',
            type: categorizeScript(script.src) // Categorizes the script
        };
    });
}

// Analyze cookies on the page and categorize them
function analyzeCookies() {
    return document.cookie.split(';').map(cookie => {
        const cookieValue = cookie.trim();
        return {
            value: cookieValue,
            category: categorizeCookie(cookieValue) // Categorizes the cookie
        };
    });
}

// Detect trackers by checking external resources and known tracker domains
function detectTrackers() {
    const trackers = [];
    const trackerDomains = [
        'google-analytics.com',
        'facebook.com',
        'doubleclick.net',
        'ads.twitter.com',
        'scorecardresearch.com',
        'quantserve.com'
    ];

    // Get the source URLs of all external resources (scripts, images, iframes, etc.)
    const resources = Array.from(document.querySelectorAll('img, script, iframe, link')).map(elem => elem.src || elem.href || '');

    resources.forEach(resource => {
        // Attempt to extract the domain from the resource link
        if (resource) {
            try {
                const domain = (new URL(resource)).hostname;
                if (trackerDomains.some(trackerDomain => domain.includes(trackerDomain))) {
                    trackers.push({ domain: domain, name: categorizeTracker(domain) });
                }
            } catch (error) {
                console.error("Error parsing resource:", resource, error);
            }
        }
    });

    return trackers.length ? trackers : [{ domain: 'None', name: 'No Trackers Detected' }];
}

// Function to categorize cookies
function categorizeCookie(cookie) {
    cookie = cookie.toLowerCase();
    if (cookie.includes('session')) {
        return 'Session Cookie'; // Stores session-specific data
    } else if (cookie.includes('auth')) {
        return 'Authentication Cookie'; // Used for user authentication
    } else if (cookie.includes('secure')) {
        return 'Secure Cookie'; // Transmitted over HTTPS
    } else if (cookie.includes('tracking')) {
        return 'Tracking Cookie'; // Used for tracking user activity
    } else if (cookie.includes('prefs')) {
        return 'Preference Cookie'; // Stores user preferences (like language)
    }
    return 'Other Cookie'; // General cookie
}

// Function to categorize scripts based on their source
function categorizeScript(scriptSrc) {
    scriptSrc = scriptSrc.toLowerCase();
    if (scriptSrc.includes('analytics')) {
        return 'Analytics Script'; // Used for analytics and data tracking
    } else if (scriptSrc.includes('ads') || scriptSrc.includes('advert')) {
        return 'Advertising Script'; // Used for displaying or tracking ads
    } else if (scriptSrc.includes('social')) {
        return 'Social Media Script'; // Integrates social media functionality (e.g., Facebook, Twitter)
    } else if (scriptSrc.includes('cdn')) {
        return 'Content Delivery Script'; // Used for content delivery (like CDN scripts)
    } else if (!scriptSrc) {
        return 'Inline Script'; // Script embedded directly in the HTML
    }
    return 'Other Script'; // General script
}

// Function to categorize known trackers based on their domain
function categorizeTracker(domain) {
    if (domain.includes('google-analytics')) {
        return 'Google Analytics';
    } else if (domain.includes('facebook')) {
        return 'Facebook Pixel';
    } else if (domain.includes('doubleclick')) {
        return 'Google Ads';
    } else if (domain.includes('ads.twitter')) {
        return 'Twitter Ads';
    }
    return 'Other Tracker'; // General tracker
}
