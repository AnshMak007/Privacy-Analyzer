chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'analyzePage') {
        // Collecting all the scripts
        const scripts = Array.from(document.scripts).map(script => {
            return {
                src: script.src || 'inline script',
                type: categorizeScript(script.src) // Function to categorize scripts
            };
        });

        // Collecting all cookies
        const cookies = document.cookie.split(';').map(cookie => {
            return {
                value: cookie.trim(),
                category: categorizeCookie(cookie.trim()) // Function to categorize cookies
            };
        });

        // Detect trackers (mock function for now)
        const trackers = detectTrackers();  // Implement detectTrackers to get domain info

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
        return true;
    }

    // Handle report request
    if (message.type === 'requestDetailedReport') {
        chrome.storage.local.get('pageAnalysis', function(result) {
            if (result.pageAnalysis) {
                sendResponse({ report: JSON.stringify(result.pageAnalysis, null, 2) });
            } else {
                sendResponse({ report: null });
            }
        });
        return true;
    }
});

// Function to categorize cookies
function categorizeCookie(cookie) {
    if (cookie.includes('session')) {
        return 'Session Cookie';
    } else if (cookie.includes('auth')) {
        return 'Authentication Cookie';
    } else if (cookie.includes('secure')) {
        return 'Secure Cookie';
    }
    return 'Other';
}

// Function to categorize scripts
function categorizeScript(scriptSrc) {
    if (scriptSrc.includes('analytics')) {
        return 'Analytics Script';
    } else if (scriptSrc.includes('ads')) {
        return 'Advertising Script';
    }
    return 'Other Script';
}

// Mock tracker detection
function detectTrackers() {
    return [
        { domain: 'tracker1.com', name: 'Tracker 1' },
        { domain: 'tracker2.com', name: 'Tracker 2' }
    ];
}
