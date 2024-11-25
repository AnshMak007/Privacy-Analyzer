console.log("Content script loaded successfully.");

let maliciousIndicators = [];

// Load malicious indicators from the JSON file
fetch(chrome.runtime.getURL('scripts/maliciousIndicators.json'))
    .then((response) => response.json())
    .then((data) => {
        maliciousIndicators = data;
        console.log("Malicious indicators loaded:", maliciousIndicators);
        
        // Start analysis only after malicious indicators are loaded
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'analyzePage') {
                console.log("Received analyzePage message.");
                analyzePage(sendResponse); // Pass sendResponse to handle async response
                return true; // Keep the message channel open for async response
            } else if (message.type === 'downloadReport') {
                // Request the background script to download the report
                chrome.runtime.sendMessage({ type: 'downloadReport' }, (response) => {
                    if (response.error) {
                        console.error("Failed to download report:", response.error);
                        sendResponse({ success: false, error: response.error });
                    } else {
                        console.log("Report download initiated.");
                        sendResponse({ success: true });
                    }
                });
                return true; // Keep the message channel open for async response
            }
        });
    })
    .catch((error) => {
        console.error("Failed to load malicious indicators:", error);
    });

// Function to collect information about scripts on the page
function collectScripts() {
    return Array.from(document.scripts).map(script => ({
        src: script.src || 'Inline script',
        async: script.async,
        defer: script.defer,
        crossorigin: script.crossOrigin || null,
        content: script.src ? null : script.textContent // Collect inline script content
    }));
}

// Function to collect cookies on the page
function collectCookies() {
    return document.cookie.split(";").map(cookie => {
        const [name, ...rest] = cookie.split("=");
        return {
            name: name.trim(),
            value: rest.join("=").trim(),
            secure: document.location.protocol === 'https:',
            httpOnly: false // Cannot access httpOnly attribute from JS
        };
    });
}
async function fetchEasyListTrackers() {
    try {
        const response = await fetch("https://easylist.to/easylist/easylist.txt");
        if (!response.ok) throw new Error("Failed to fetch EasyList data.");
        const text = await response.text();

        // Extract domains from EasyList, skipping invalid rules
        const trackerDomains = text
            .split("\n")
            .filter(line => line.startsWith("||") && !line.includes("*")) // Valid EasyList rules start with "||" and skip wildcard patterns
            .map(line => {
                const match = line.match(/\|\|([^\^$]+)/); // Match domain patterns without modifiers
                return match ? match[1] : null; // Extract the domain part
            })
            .filter(Boolean); // Remove null or undefined entries

        console.log("Sanitized EasyList Trackers:", trackerDomains);
        return trackerDomains;
    } catch (error) {
        console.error("Error fetching EasyList trackers:", error);
        return [];
    }
}

function monitorNetworkRequests(trackerDomains) {
    const scriptTrackerMapping = {};

    // Proxy fetch to monitor network requests
    window.fetch = new Proxy(window.fetch, {
        apply: function (target, thisArg, args) {
            const url = args[0];
            if (trackerDomains.some(domain => url.includes(domain))) {
                const scriptName = document.currentScript?.src || "Inline script";
                if (!scriptTrackerMapping[scriptName]) {
                    scriptTrackerMapping[scriptName] = [];
                }
                scriptTrackerMapping[scriptName].push(url);
                console.log(`Tracker detected (fetch): ${url} by ${scriptName}`);
            }
            return Reflect.apply(target, thisArg, args);
        }
    });

    // Proxy XMLHttpRequest to monitor network requests
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        if (trackerDomains.some(domain => url.includes(domain))) {
            const scriptName = document.currentScript?.src || "Inline script";
            if (!scriptTrackerMapping[scriptName]) {
                scriptTrackerMapping[scriptName] = [];
            }
            scriptTrackerMapping[scriptName].push(url);
            console.log(`Tracker detected (XMLHttpRequest): ${url} by ${scriptName}`);
        }
        return originalXhrOpen.apply(this, [method, url, ...rest]);
    };

    return scriptTrackerMapping;
}


// Combine local and EasyList trackers
async function getCombinedTrackers() {
    const localTrackers = [
        { domain: "google-analytics.com", type: "Analytics", description: "Used for website analytics." },
        { domain: "facebook.com", type: "Advertising", description: "Tracks user behavior for ad targeting." },
        { domain: "doubleclick.net", type: "Advertising", description: "Tracks user behavior for advertising." },
    ];

    const easyListTrackers = await fetchEasyListTrackers();

    const combinedTrackers = [
        ...localTrackers,
        ...easyListTrackers.map(domain => ({
            domain,
        })),
    ];

    return combinedTrackers;
}


// Collect trackers from scripts on the page
// async function collectTrackers() {
//     const trackerPatterns = await getCombinedTrackers();
//     const detectedTrackers = [];
//     const scripts = Array.from(document.scripts);

//     scripts.forEach(script => {
//         if (script.src) {
//             const cleanSrc = new URL(script.src).hostname;
//             trackerPatterns.forEach(tracker => {
//                 const pattern = new RegExp(tracker.domain, "i");
//                 if (pattern.test(cleanSrc)) {
//                     detectedTrackers.push({
//                         domain: tracker.domain,
//                         source: script.src // Include the source script responsible for the tracker
//                     });
//                     console.log(`Tracker detected: ${tracker.domain} added by ${script.src}`);
//                 }
//             });
//         }
//     });

//     return detectedTrackers;
// }
async function collectTrackers() {
    const trackerPatterns = await getCombinedTrackers();
    const detectedTrackers = [];
    const scripts = Array.from(document.scripts);

    scripts.forEach(script => {
        if (script.src) {
            const cleanSrc = new URL(script.src).hostname; // Extract hostname
            trackerPatterns.forEach(tracker => {
                const pattern = new RegExp(tracker.domain, "i");
                if (pattern.test(cleanSrc)) {
                    // Find existing tracker or add a new one
                    let existingTracker = detectedTrackers.find(t => t.domain === tracker.domain);

                    if (!existingTracker) {
                        existingTracker = {
                            domain: tracker.domain,
                            scripts: [],
                        };
                        detectedTrackers.push(existingTracker);
                    }

                    // Add the script to the tracker
                    existingTracker.scripts.push(script.src || "Inline script");
                }
            });
        }
    });

    return detectedTrackers;
}



// Analyze scripts for phishing, cookie theft, untrusted network calls, and behavioral patterns
async function analyzeScripts(scripts) {
    const phishing = [];
    const cookieTheft = [];
    const untrustedCalls = [];
    const keylogging = [];
    const fakeLogin = [];
    const obfuscatedScripts = [];
    const behavioralIndicators = [];

    for (const script of scripts) {
        const src = script.src ? script.src.toLowerCase() : "Inline script";
        let content = script.content || null;

        // Fetch external script content via background.js to bypass CORS
        if (script.src && !content) {
            try {
                const response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage(
                        { type: "fetchScriptContent", url: script.src },
                        resolve
                    );
                });

                if (response.success) {
                    content = response.content;
                } else {
                    console.warn(`Failed to fetch external script content: ${script.src}`);
                    content = "// Unable to fetch script content due to restrictions";
                }
            } catch (error) {
                console.error("Error fetching script content:", error);
                continue; // Skip further analysis for this script
            }
        }

        // Analyze behavior patterns in the script content
        if (content) {
            if (/password|login|session|token/i.test(content)) {
                phishing.push(src);
                behavioralIndicators.push({
                    type: "phishing_keywords",
                    description: `Detected phishing-related keywords in: ${src}`
                });
            }

            if (/document\.cookie/i.test(content)) {
                cookieTheft.push(src);
                behavioralIndicators.push({
                    type: "cookie_theft",
                    description: `Potential cookie theft detected in: ${src}`
                });
            }

            if (/fetch\(['"]http/i.test(content) || /new\sXMLHttpRequest\(\)/i.test(content)) {
                untrustedCalls.push(src);
                behavioralIndicators.push({
                    type: "untrusted_network_call",
                    description: `Untrusted network call detected in: ${src}`
                });
            }

            if (/addEventListener\(['"](keypress|keydown|keyup)['"],/i.test(content)) {
                keylogging.push(src);
                behavioralIndicators.push({
                    type: "keylogging",
                    description: `Keylogging behavior detected in: ${src}`
                });
            }

            if (/document\.getElementById\(.+?action\s*=\s*['"]http/i.test(content)) {
                fakeLogin.push(src);
                behavioralIndicators.push({
                    type: "fake_login_form",
                    description: `Fake login form manipulation detected in: ${src}`
                });
            }

            if (/eval\(|new Function\(|atob\(|btoa\(/i.test(content)) {
                obfuscatedScripts.push(src);
                behavioralIndicators.push({
                    type: "obfuscated_script",
                    description: `Obfuscated script detected in: ${src}`
                });
            }
        } else {
            console.warn(`No content available for script: ${src}`);
        }
    }

    return { phishing, cookieTheft, untrustedCalls, keylogging, fakeLogin, obfuscatedScripts, behavioralIndicators };
}

// Analyze the page and save data in local storage
async function analyzePage(sendResponse) {
    try {
        const scripts = collectScripts();
        const cookies = collectCookies();
        const trackers = await collectTrackers();
        const trackerMappings = monitorNetworkRequests(trackers.map(t => t.domain));

        const suspiciousActivity = await analyzeScripts(scripts);

        // Save analysis data in local storage for report generation
        chrome.storage.local.set({
            pageAnalysis: {
                url: window.location.href,
                scripts,
                cookies,
                trackers,
                trackerMappings, // Include tracker-to-script mappings
                suspiciousActivity
            }
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error saving page analysis:", chrome.runtime.lastError.message);
                sendResponse({ success: false, message: "Failed to save analysis." });
            } else {
                console.log("Page analysis saved.");
                sendResponse({ success: true, message: "Page analysis complete." });
            }
        });
    } catch (error) {
        console.error("Error during page analysis:", error);
        sendResponse({ success: false, message: "Page analysis failed due to an error." });
    }
}

