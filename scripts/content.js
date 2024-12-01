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
    const cookies = document.cookie.split(";").filter(cookie => cookie.trim() !== ""); // Ensure no empty cookies
    return cookies.map(cookie => {
        const [name, ...rest] = cookie.split("=");
        const value = rest.join("=").trim();

        return {
            name: name.trim(),
            value: value,
            secure: document.location.protocol === "https:", // HTTPS indicates a secure context
            isSession: !value.includes("=") && !value.includes(";"), // Guess if the cookie is session-based
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

async function collectTrackers() {
    const trackerPatterns = await getCombinedTrackers();
    const detectedTrackers = [];
    const scripts = Array.from(document.scripts);

    scripts.forEach(script => {
        if (script.src) {
            const cleanSrc = new URL(script.src).hostname;
            trackerPatterns.forEach(tracker => {
                if (tracker.domain && cleanSrc.includes(tracker.domain)) {
                    let trackerEntry = detectedTrackers.find(t => t.domain === tracker.domain);
                    if (!trackerEntry) {
                        trackerEntry = { domain: tracker.domain, scripts: [] };
                        detectedTrackers.push(trackerEntry);
                    }
                    trackerEntry.scripts.push(script.src);
                }
            });
        }
    });

    return detectedTrackers;
}


async function checkPhishingDomain(domain) {
    const apiKey = 'AIzaSyCKN36NdLprKcx5puR6nYiH2AWj6Fm9lk4';  // Replace with your actual API key
    const url = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;

    const requestPayload = {
        client: {
            clientId: "your-client-id",
            clientVersion: "1.0"
        },
        threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: domain }]
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload)
        });

        const result = await response.json();

        if (result.matches && result.matches.length > 0) {
            console.log("Phishing domain detected:", domain);
            return true;  // Phishing detected
        } else {
            console.log("Domain is safe:", domain);
            return false; // Not phishing
        }
    } catch (error) {
        console.error("Error checking phishing domain:", error);
        return false;  // Default to not phishing in case of error
    }
}


// Analyze scripts for phishing, cookie theft, untrusted network calls, and behavioral patterns
async function analyzeScripts(scripts) {
    const phishing = [];
    const cookieTheft = [];
    const untrustedCalls = [];
    const keylogging = [];
    const fakeLogin = [];
    const behavioralIndicators = [];

    // Loop through each script for analysis
    for (const script of scripts) {
        const src = script.src ? script.src.toLowerCase() : "Inline script";
        let content = script.content || null;

        // Fetch external script content via background.js
        if (script.src && !content) {
            try {
                const response = await new Promise(resolve => {
                    chrome.runtime.sendMessage(
                        { type: "fetchScriptContent", url: script.src },
                        resolve
                    );
                });

                if (response.success) {
                    content = response.content;
                } else {
                    console.warn(`Failed to fetch external script content: ${script.src}`);
                }
            } catch (error) {
                console.error("Error fetching script content:", error);
                continue; // Skip further analysis
            }
        }

        // Check against maliciousIndicators
        const matchesMaliciousIndicator = maliciousIndicators.some(indicator => src.includes(indicator));
        if (matchesMaliciousIndicator) {
            phishing.push(src);
            behavioralIndicators.push({
                type: "malicious_indicator",
                description: `Script matches malicious indicator: ${src}`
            });
        }

        // Analyze behavior patterns in the script content
        if (content) {
            // Phishing detection: Compare with known phishing domains
            if (await checkPhishingDomain(script.src)) {
                phishing.push(src);
                behavioralIndicators.push({
                    type: "phishing",
                    description: `Phishing attempt detected from: ${src}`
                });
            }

            // Cookie theft detection: Enhanced pattern recognition
            if (/document\.cookie/i.test(content)) {
                if (/secure|httponly/i.test(content)) {
                    cookieTheft.push(src);
                    behavioralIndicators.push({
                        type: "cookie_theft",
                        description: `Potential cookie theft detected in: ${src}`
                    });
                }
            }

            // Improved Untrusted Network Call Detection
            if (/fetch\(/i.test(content) || /new\sXMLHttpRequest\(/i.test(content)) {
                // Detect fetch() calls
                const fetchMatches = content.match(/fetch\(['"]([^'"]+)['"](,?\s*{[^}]*})?/g);
                if (fetchMatches) {
                    fetchMatches.forEach(match => {
                        const urlMatch = match.match(/fetch\(['"]([^'"]+)['"]/);
                        const optionsMatch = match.match(/,\s*{[^}]*"method"\s*:\s*"([^"]+)"/i); // Extract method
                        if (urlMatch) {
                            const url = urlMatch[1];
                            untrustedCalls.push({
                                src,
                                url,
                                method: optionsMatch ? optionsMatch[1] : "GET", // Default to GET if no method specified
                            });
                            behavioralIndicators.push({
                                type: "untrusted_network_call",
                                description: `Untrusted network call detected in: ${src} (URL: ${url}, Method: ${optionsMatch ? optionsMatch[1] : "GET"})`
                            });
                        }
                    });
                }

                // Detect XMLHttpRequest calls
                const xhrMatches = content.match(/new\sXMLHttpRequest\(\).*?\.open\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/gi);
                if (xhrMatches) {
                    xhrMatches.forEach(match => {
                        const methodMatch = match.match(/\.open\(\s*['"]([^'"]+)['"]/); // Extract method
                        const urlMatch = match.match(/\.open\([^,]+,\s*['"]([^'"]+)['"]/); // Extract URL
                        if (methodMatch && urlMatch) {
                            const method = methodMatch[1];
                            const url = urlMatch[1];
                            untrustedCalls.push({
                                src,
                                url,
                                method,
                            });
                            behavioralIndicators.push({
                                type: "untrusted_network_call",
                                description: `Untrusted network call detected in: ${src} (URL: ${url}, Method: ${method})`
                            });
                        }
                    });
                }
            }
            // Keylogging detection: Advanced detection
            if (/addEventListener\(['"](keypress|keydown|keyup)['"],/i.test(content) ||
                /window\.onkeypress/i.test(content) ||
                /window\.onkeydown/i.test(content)) {
                keylogging.push(src);
                behavioralIndicators.push({
                    type: "keylogging",
                    description: `Keylogging behavior detected in: ${src}`
                });
            }

            // Fake login form detection
            if (/document\.getElementById\(.+?action\s*=\s*['"]http/i.test(content)) {
                fakeLogin.push(src);
                behavioralIndicators.push({
                    type: "fake_login_form",
                    description: `Fake login form manipulation detected in: ${src}`
                });
            }
        } else {
            console.warn(`No content available for script: ${src}`);
        }
    }

    return { phishing, cookieTheft, untrustedCalls, keylogging, fakeLogin, behavioralIndicators };
}

// Analyze the page and save data in local storage
async function analyzePage(sendResponse) {
    try {
        const scripts = collectScripts();
        const cookies = collectCookies();
        const trackers = await collectTrackers();
        const trackerMappings = monitorNetworkRequests(trackers.map(t => t.domain));

        // Analyzing scripts for suspicious activity
        const suspiciousActivity = await analyzeScripts(scripts);

        // Detect insecure cookies (cookies without secure flag)
        const insecureCookies = cookies.filter(cookie => !cookie.secure);

        // Save all analysis data in local storage for later report generation
        chrome.storage.local.set({
            pageAnalysis: {
                url: window.location.href,
                scripts,
                cookies,
                insecureCookies,
                trackers,
                trackerMappings, // Include tracker-to-script mappings
                suspiciousActivity // Contains phishing, cookie theft, etc.
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

