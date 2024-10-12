console.log("Content script loaded.");

// Listener for messages from background or popup scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log("Message received in content script:", message);  // Check if the message is received

    if (message.type === 'analyzePage') {
        const pageURL = message.pageURL || window.location.href; // Capture URL from message or fallback to window URL

        // Analyze the page and collect scripts, cookies, and trackers
        const scripts = analyzeScripts();
        const cookies = analyzeCookies();
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
        const scriptDetails = {
            src: script.src || 'Inline Script',
            type: categorizeScript(script.src), // Categorizes the script
            attributes: {
                async: script.hasAttribute('async'),
                defer: script.hasAttribute('defer'),
                crossorigin: script.getAttribute('crossorigin') || 'N/A',
            }
        };

        // If it's an inline script, capture the script content
        // if (!script.src) {
        //     scriptDetails.content = script.innerHTML.trim() || 'No content available';
        // }

        return scriptDetails;
    });
}


// Analyze cookies on the page and categorize them
// Analyze cookies on the page and categorize them
function analyzeCookies() {
    return document.cookie.split(';').map(cookie => {
        const cookieValue = cookie.trim();
        const [name, value] = cookieValue.split('=');
        const cookieProps = {
            value: cookieValue,
            name: name || 'N/A',
            domain: extractCookieDomain(cookieValue), // Extracts the domain
            expires: extractCookieExpiry(cookieValue), // Extracts expiry date
            category: categorizeCookie(cookieValue) // Categorizes the cookie
        };
        
        return cookieProps;
    });
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
        { domain: 'adroll.com', type: 'Advertising', description: 'AdRoll for retargeting ads.' },
        // Add more domains as needed
    ];

    // Get the source URLs of all external resources (scripts, images, iframes, etc.)
    const resources = Array.from(document.querySelectorAll('img, script, iframe, link')).map(elem => elem.src || elem.href || '');

    resources.forEach(resource => {
        // Attempt to extract the domain from the resource link
        if (resource) {
            try {
                const url = new URL(resource);
                const domain = url.hostname;

                // Check if the domain matches any known tracker domains
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

// Function to categorize cookies
// Function to categorize cookies and provide detailed information
function categorizeCookie(cookie) {
    const [nameValue, ...attributes] = cookie.split(';').map(attr => attr.trim()); // Split cookie into name, value, and attributes
    const [name, value] = nameValue.split('='); // Extract name and value

    // Default categorization
    const cookieAttributes = {
        isSession: false,
        isPersistent: false,
        isThirdParty: false,
        isSecure: false,
        isHttpOnly: false,
    };

    // Determine if it's a session cookie
    cookieAttributes.isSession = !/expires=/i.test(cookie) && !/max-age=/i.test(cookie); // No expiry = session cookie

    // Check for domain attribute
    const cookieDomainMatch = attributes.find(attr => attr.toLowerCase().startsWith('domain='));
    const cookieDomain = cookieDomainMatch ? cookieDomainMatch.split('=')[1] : null;

    // Check if it's a third-party cookie
    const currentDomain = window.location.hostname;
    if (cookieDomain && !cookieDomain.includes(currentDomain)) {
        cookieAttributes.isThirdParty = true; // From a different domain
    }

    // Check for persistent cookie based on expiration or max-age
    cookieAttributes.isPersistent = /expires=/i.test(cookie) || /max-age=/i.test(cookie);

    // Check for Secure and HttpOnly flags
    cookieAttributes.isSecure = attributes.some(attr => attr.toLowerCase() === 'secure');
    cookieAttributes.isHttpOnly = attributes.some(attr => attr.toLowerCase() === 'httponly');

    // Build the result object with common details
    const cookieDetails = {
        name: name || 'N/A',
        value: value || 'N/A',
        secure: cookieAttributes.isSecure,
        httpOnly: cookieAttributes.isHttpOnly
    };

    // Categorize the cookie based on the determined attributes
    if (cookieAttributes.isSession) {
        return {
            category: 'Session Cookie',
            details: cookieDetails
        };
    } 
    if (cookieAttributes.isPersistent) {
        return {
            category: 'Persistent Cookie',
            details: cookieDetails
        };
    } 
    if (cookieAttributes.isThirdParty) {
        return {
            category: 'Third-party Cookie',
            details: cookieDetails
        };
    } 
    return {
        category: 'Other Cookie',
        details: cookieDetails
    };
}


// Function to categorize scripts based on their source
function categorizeScript(scriptSrc) {
    scriptSrc = scriptSrc.toLowerCase();

    if (scriptSrc.includes('analytics') || scriptSrc.includes('gtag') || scriptSrc.includes('ga.')) {
        return 'Analytics Script'; // Used for analytics and data tracking
    } else if (scriptSrc.includes('ads') || scriptSrc.includes('advert') || scriptSrc.includes('doubleclick') || scriptSrc.includes('adservices')) {
        return 'Advertising Script'; // Used for displaying or tracking ads
    } else if (scriptSrc.includes('social') || scriptSrc.includes('facebook') || scriptSrc.includes('twitter') || scriptSrc.includes('linkedin') || scriptSrc.includes('instagram')) {
        return 'Social Media Script'; // Integrates social media functionality (e.g., Facebook, Twitter, etc.)
    } else if (scriptSrc.includes('cdn') || scriptSrc.includes('cloudflare') || scriptSrc.includes('cdnjs') || scriptSrc.includes('jsdelivr')) {
        return 'Content Delivery Script'; // Scripts from content delivery networks (CDNs)
    } else if (scriptSrc.includes('tagmanager') || scriptSrc.includes('google-tag-manager')) {
        return 'Tag Manager Script'; // Scripts used for tag management (e.g., Google Tag Manager)
    } else if (scriptSrc.includes('widget')) {
        return 'Widget Script'; // Scripts that add widgets to the page (e.g., chat widgets, weather widgets)
    } else if (scriptSrc.includes('payment') || scriptSrc.includes('checkout') || scriptSrc.includes('stripe') || scriptSrc.includes('paypal')) {
        return 'Payment Script'; // Scripts related to payment processing
    } else if (scriptSrc.includes('video') || scriptSrc.includes('player') || scriptSrc.includes('youtube') || scriptSrc.includes('vimeo')) {
        return 'Video/Media Script'; // Scripts for embedding video or media players
    // } else if (!scriptSrc) {
    //     return 'Inline Script'; // Script embedded directly in the HTML
    }
    return 'Other Script'; // General or uncategorized script
}

// Function to categorize known trackers based on their domain
function categorizeTracker(domain) {
    // Normalize the domain for easier matching
    const normalizedDomain = domain.toLowerCase();

    // Define tracker categories
    if (normalizedDomain.includes('google-analytics')) {
        return 'Google Analytics - Used for tracking user interactions and website traffic.';
    } else if (normalizedDomain.includes('facebook')) {
        return 'Facebook Pixel - Used for tracking conversions and retargeting on Facebook.';
    } else if (normalizedDomain.includes('doubleclick')) {
        return 'Google Ads - Used for ad serving and tracking performance.';
    } else if (normalizedDomain.includes('ads.twitter')) {
        return 'Twitter Ads - Used for tracking Twitter ad performance.';
    } else if (normalizedDomain.includes('linkedin')) {
        return 'LinkedIn Tracking - Used for tracking interactions on LinkedIn.';
    } else if (normalizedDomain.includes('hotjar')) {
        return 'Hotjar - Used for user behavior analytics and feedback.';
    } else if (normalizedDomain.includes('mixpanel')) {
        return 'Mixpanel - Used for product analytics and user engagement tracking.';
    } else if (normalizedDomain.includes('adroll')) {
        return 'AdRoll - Used for retargeting and display advertising.';
    } else if (normalizedDomain.includes('scorecardresearch')) {
        return 'Scorecard Research - Used for web traffic analysis.';
    } else if (normalizedDomain.includes('quantserve')) {
        return 'Quantserve - Used for audience measurement.';
    }

    return 'Other Tracker - General tracker not categorized.';
}
