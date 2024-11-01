// console.log("Content script loaded.");
// let maliciousIndicators = [];
// fetch(chrome.runtime.getURL('maliciousIndicators.json'))
//     .then(response => response.json())
//     .then(data => {
//         maliciousIndicators = data.malicious_indicators; 
//     })
//     .catch(error => console.error('Error loading malicious indicators:', error));

// chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
//     if (message.type === 'analyzePage') {
//         const pageURL = message.pageURL || window.location.href;
//         const scripts = analyzeScripts();
//         const cookies = analyzeCookies();
//         const trackers = detectTrackers();

//         // chrome.storage.local.set({
//         //     pageAnalysis: { pageURL: pageURL, scripts: scripts, cookies: cookies, trackers: trackers }
//         // }, () => {
//         //     chrome.runtime.sendMessage({ type: 'categorizedData', pageURL: pageURL, cookies: cookies, scripts: scripts, trackers: trackers });
//         //     sendResponse({ analysisComplete: true });
//         // });
//         // return true;
//         chrome.storage.local.set({
//             pageAnalysis: { pageURL: pageURL, scripts: scripts, cookies: cookies, trackers: trackers }
//           }, () => {
//             console.log("Page analysis stored:", { pageURL, scripts, cookies, trackers });
//             chrome.runtime.sendMessage({ type: 'categorizedData', pageURL: pageURL, cookies: cookies, scripts: scripts, trackers: trackers });
//             sendResponse({ analysisComplete: true });
//           });
//           return true;
//     }
// });

// function analyzeScripts() {
//     return Array.from(document.scripts)
//         .filter(script => script.src)
//         .map(script => ({
//             src: script.src,
//             attributes: { async: script.hasAttribute('async'), defer: script.hasAttribute('defer'), crossorigin: script.getAttribute('crossorigin') || 'N/A' },
//             suspicious: detectSuspiciousPatterns(script.src)
//         }));
// }

// function detectSuspiciousPatterns(src) {
//     return { obfuscated: /[A-Za-z0-9+/=]{20,}/.test(src), untrusted: maliciousIndicators.some(indicator => src.includes(indicator)) };
// }

// function analyzeCookies() {
//     return document.cookie.split(';').map(cookie => {
//         const [name, value] = cookie.trim().split('=');
//         return { name, value, domain: extractDomain(cookie), secure: isSecure(cookie), httpOnly: isHttpOnly(cookie) };
//     });
// }

// function isSecure(cookie) { return /secure/i.test(cookie); }
// function isHttpOnly(cookie) { return false; }
// function extractDomain(cookie) { const domainMatch = cookie.match(/domain=([^;]*)/i); return domainMatch ? domainMatch[1] : 'N/A'; }

// function detectTrackers() {
//     const trackerDomains = ["google-analytics.com", "facebook.com"];
//     return Array.from(document.querySelectorAll('script')).map(script => {
//         const url = new URL(script.src);
//         return trackerDomains.some(domain => url.hostname.includes(domain)) ? { domain: url.hostname } : null;
//     }).filter(Boolean);
// }
// content.js

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
    const scripts = Array.from(document.scripts).map(script => ({
        src: script.src || 'Inline script',
        async: script.async,
        defer: script.defer,
        crossorigin: script.crossOrigin || null
    }));
    return scripts;
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

// Function to collect tracker information
function collectTrackers() {
    const trackerDomains = ["example-tracker.com", "another-tracker.com"];
    return trackerDomains.map(domain => ({
        name: domain,
        type: "Analytics",
        description: "Used for tracking and analytics."
    }));
}

// Analyze scripts for phishing, cookie theft, and untrusted network calls
function analyzeScripts(scripts) {
    const phishing = [];
    const cookieTheft = [];
    const untrustedCalls = [];
    
    scripts.forEach(script => {
        const src = script.src.toLowerCase();
        if (maliciousIndicators.some(indicator => src.includes(indicator))) phishing.push(script.src);
        if (src.includes("cookie")) cookieTheft.push(script.src);
        if (src.includes("networkcall")) untrustedCalls.push(script.src);
    });

    return { phishing, cookieTheft, untrustedCalls };
}

// Function to analyze the page and send data to local storage
function analyzePage(sendResponse) {
    const scripts = collectScripts();
    const cookies = collectCookies();
    const trackers = collectTrackers();

    const suspiciousActivity = analyzeScripts(scripts);

    // Save analysis data in local storage for report generation
    chrome.storage.local.set({
        pageAnalysis: {
            url: window.location.href,
            scripts,
            cookies,
            trackers,
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
}
