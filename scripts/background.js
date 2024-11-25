// background.js

let maliciousIndicators = [];

// Listener to handle messages from content.js and popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.type === "maliciousIndicatorsLoaded") {
            // Synchronize malicious indicators
            maliciousIndicators = message.data;
            console.log("Malicious indicators received in background.js:", maliciousIndicators);
            sendResponse({ success: true });

        } else if (message.type === "fetchScriptContent" && message.url) {
            // Call fetchScriptContent and send the result back
            fetchScriptContent(message.url)
                .then(content => {
                    if (content) {
                        sendResponse({ success: true, content });
                    } else {
                        sendResponse({ success: false, content: null });
                    }
                })
                .catch(error => {
                    console.error("Error handling fetchScriptContent request:", error);
                    sendResponse({ success: false, content: null });
                });
            return true; // Keep the message channel open for asynchronous response

        } else if (message.type === 'downloadReport') {
            // Generate and download the report
            chrome.storage.local.get('pageAnalysis', result => {
                if (chrome.runtime.lastError) {
                    console.error("Error fetching page analysis:", chrome.runtime.lastError.message);
                    sendResponse({ error: 'Failed to fetch page analysis.' });
                    return;
                }

                if (result.pageAnalysis) {
                    const reportContent = generateDetailedReport(result.pageAnalysis, result.pageAnalysis.url);
                    const blob = new Blob([reportContent], { type: 'text/html' });

                    // Convert blob to Data URL for downloading
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        chrome.downloads.download({
                            url: reader.result,
                            filename: 'Privacy_Analysis_Report.html',
                            saveAs: true
                        }, downloadId => {
                            if (chrome.runtime.lastError) {
                                console.error("Download error:", chrome.runtime.lastError.message);
                                sendResponse({ error: 'Failed to download report.' });
                            } else {
                                console.log("Report download initiated with ID:", downloadId);
                                sendResponse({ success: true });
                            }
                        });
                    };
                    reader.readAsDataURL(blob);
                } else {
                    console.error("No page analysis found in storage.");
                    sendResponse({ error: 'No page analysis found.' });
                }
            });

            return true; // Keep the message channel open for async response

        } else {
            console.warn("Unknown message type received:", message.type);
            sendResponse({ success: false, error: "Unknown message type" });
        }
    } catch (error) {
        console.error("Unexpected error in message handling:", error);
        sendResponse({ success: false, error: "Unexpected error in background script" });
    }
});

// Improved function to fetch script content with detailed error handling
// Define the function to fetch script content from a URL
async function fetchScriptContent(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch script content: ${response.statusText} (Status: ${response.status})`);
        }
        const text = await response.text();
        return text;
    } catch (error) {
        console.error("Error in fetchScriptContent function:", error);
        return null; // Return null if an error occurs
    }
}

// Function to generate the HTML report content
function generateDetailedReport(data, pageURL) {
    return `
        <html>
        <head>
            <title>Privacy Analysis Report</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                h1, h2 { color: #333; }
                h2 { border-bottom: 2px solid #eaeaea; padding-bottom: 5px; margin-bottom: 10px; }
                .section { margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #007bff; border-radius: 3px; }
                .alert { color: red; font-weight: bold; }
                .none { color: green; font-weight: bold; }
                .highlight { color: #ff0000; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Privacy Analysis Report</h1>
                <h2>Website URL: ${pageURL}</h2>
                <div class="section"><h2>Scripts Detected</h2>${generateScriptReport(data.scripts)}</div>
                <div class="section"><h2>Security & Privacy Violations Detected</h2>${generateCategorizedScriptReport(data.scripts)}</div>
                <div class="section"><h2>Cookies Detected & Security Analysis</h2>${generateCookieReport(data.cookies)}</div>
                <div class="section"><h2>Trackers Detected</h2>${generateTrackerReport(data.trackers)}</div>
            </div>
        </body>
        </html>`;
}

// Helper functions to generate report sections
function generateScriptReport(scripts) {
    if (!scripts || scripts.length === 0) return "<p>No scripts detected.</p>";
    return `<ul>${scripts.map(script => `
        <li><strong>Source:</strong> ${script.src}<br>
            <strong>Attributes:</strong><ul>
                <li>Async: ${script.async}</li>
                <li>Defer: ${script.defer}</li>
                <li>CORS: ${script.crossorigin || 'N/A'}</li>
            </ul>
        </li>`).join('')}</ul>`;
}

function generateCategorizedScriptReport(scripts) {
    const phishing = [], cookieTheft = [], untrustedCalls = [];
    const keylogging = [], fakeLogin = [], obfuscatedScripts = [];

    scripts.forEach(script => {
        const src = script.src.toLowerCase();
        if (maliciousIndicators.some(indicator => src.includes(indicator))) phishing.push(script.src);
        if (src.includes("cookie")) cookieTheft.push(script.src);
        if (src.includes("networkcall")) untrustedCalls.push(script.src);

        // Additional behavior detections
        if (src.includes("keylog") || script.detectedBehavior === "keylogging") keylogging.push(script.src);
        if (src.includes("login") || script.detectedBehavior === "fakeLoginForm") fakeLogin.push(script.src);
        if (src.includes("obfuscate") || script.detectedBehavior === "obfuscated") obfuscatedScripts.push(script.src);
    });

    return `
        <h3>Phishing Scripts</h3>${phishing.length ? generateScriptList(phishing) : "<p>No phishing scripts detected.</p>"}
        <h3>Cookie Theft Scripts</h3>${cookieTheft.length ? generateScriptList(cookieTheft) : "<p>No cookie theft scripts detected.</p>"}
        <h3>Untrusted Network Calls</h3>${untrustedCalls.length ? generateScriptList(untrustedCalls) : "<p>No untrusted network calls detected.</p>"}
        <h3>Keylogging Scripts</h3>${keylogging.length ? generateScriptList(keylogging) : "<p>No keylogging behavior detected.</p>"}
        <h3>Fake Login Form Manipulation Scripts</h3>${fakeLogin.length ? generateScriptList(fakeLogin) : "<p>No fake login form manipulations detected.</p>"}
        <h3>Obfuscated Scripts</h3>${obfuscatedScripts.length ? generateScriptList(obfuscatedScripts) : "<p>No obfuscated scripts detected.</p>"}`;
}


function generateScriptList(scripts) {
    return `<ul>${scripts.map(src => `<li>${src}</li>`).join('')}</ul>`;
}

function generateCookieReport(cookies) {
    if (!cookies || cookies.length === 0) return "<p>No cookies detected.</p>";
    return `<ul>${cookies.map(cookie => `
        <li><strong>Name:</strong> ${cookie.name}<br>
            <strong>Type:</strong> ${cookie.type}<br>
            <strong>Secure:</strong> ${cookie.secure ? "Yes" : "<span class='alert'>No</span>"}<br>
            <strong>HttpOnly:</strong> ${cookie.httpOnly ? "Yes" : "<span class='alert'>No</span>"}
        </li>`).join('')}</ul>`;
}

function generateTrackerReport(trackers) {
    if (!trackers || trackers.length === 0) return "<p>No trackers detected.</p>";
    return `
        <h3>Detected Trackers</h3>
        <p>The following trackers were identified on this page:</p>
        <ul>
            ${trackers.map(tracker => `
                <li>
                    <strong>Domain:</strong> <a href="https://${tracker.domain}" target="_blank" rel="noopener noreferrer">${tracker.domain}</a><br>
                    <strong>Type:</strong> <span class="${tracker.type === 'Advertising' ? 'highlight' : ''}">${tracker.type}</span><br>
    
                </li>
            `).join('')}
        </ul>`;
}

