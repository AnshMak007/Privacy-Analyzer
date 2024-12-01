// background.js

let maliciousIndicators = [];

// Listener to handle messages from content.js and popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        switch (message.type) {
            case "maliciousIndicatorsLoaded":
                // Synchronize malicious indicators
                if (Array.isArray(message.data)) {
                    maliciousIndicators = message.data;
                    console.log("Malicious indicators received in background.js:", maliciousIndicators);
                    sendResponse({ success: true });
                } else {
                    console.warn("Invalid malicious indicators data format.");
                    sendResponse({ success: false, error: "Invalid data format" });
                }
                break;

            case "fetchScriptContent":
                if (message.url) {
                    fetchScriptContent(message.url)
                        .then((content) => {
                            if (content) {
                                sendResponse({ success: true, content });
                            } else {
                                sendResponse({ success: false, content: null });
                            }
                        })
                        .catch((error) => {
                            console.error("Error fetching script content:", error);
                            sendResponse({ success: false, error: error.message });
                        });
                    return true; // Keep the message channel open for asynchronous response
                } else {
                    console.warn("No URL provided for fetchScriptContent.");
                    sendResponse({ success: false, error: "No URL provided" });
                }
                break;

            case "downloadReport":
                chrome.storage.local.get("pageAnalysis", (result) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error fetching page analysis:", chrome.runtime.lastError.message);
                        sendResponse({ error: "Failed to fetch page analysis." });
                        return;
                    }

                    const pageAnalysis = result.pageAnalysis;
                    if (pageAnalysis) {
                        try {
                            const reportContent = generateDetailedReport(pageAnalysis, pageAnalysis.url || "Unknown URL");
                            const blob = new Blob([reportContent], { type: "text/html" });
                            const reader = new FileReader();

                            reader.onloadend = () => {
                                chrome.downloads.download(
                                    {
                                        url: reader.result,
                                        filename: "Privacy_Analysis_Report.html",
                                        saveAs: true,
                                    },
                                    (downloadId) => {
                                        if (chrome.runtime.lastError) {
                                            console.error("Download error:", chrome.runtime.lastError.message);
                                            sendResponse({ success: false, error: "Failed to download report." });
                                        } else {
                                            console.log("Report download initiated with ID:", downloadId);
                                            sendResponse({ success: true });
                                        }
                                    }
                                );
                            };
                            reader.readAsDataURL(blob);
                        } catch (error) {
                            console.error("Error generating or downloading report:", error);
                            sendResponse({ success: false, error: "Error generating report" });
                        }
                    } else {
                        console.warn("No page analysis found in storage.");
                        sendResponse({ error: "No page analysis found." });
                    }
                });
                return true; // Keep the message channel open for async response

            default:
                console.warn("Unknown message type received:", message.type);
                sendResponse({ success: false, error: "Unknown message type" });
        }
    } catch (error) {
        console.error("Unexpected error in message handling:", error);
        sendResponse({ success: false, error: "Unexpected error in background script" });
    }
});

// Improved function to fetch script content with detailed error handling
async function fetchScriptContent(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch script content: ${response.statusText} (Status: ${response.status})`);
        }
        return await response.text();
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
                body { 
                    font-family: Arial, sans-serif; 
                    background-color: #f4f4f4; 
                    padding: 20px; 
                }
                .container { 
                    max-width: 800px; 
                    margin: 0 auto; 
                    background: white; 
                    padding: 20px; 
                    border-radius: 5px; 
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); 
                }
                h1, h2, h3 { 
                    color: #333; 
                }
                h2 { 
                    border-bottom: 2px solid #eaeaea; 
                    padding-bottom: 5px; 
                    margin-bottom: 10px; 
                }
                .section { 
                    margin-bottom: 20px; 
                    padding: 15px; 
                    background: #f9f9f9; 
                    border-left: 4px solid #007bff; 
                    border-radius: 3px; 
                }
                .script-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Flexible layout */
                    gap: 15px;
                    margin-top: 10px;
                }
                
                .script-item {
                    background: #ffffff;
                    padding: 10px 15px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    transition: transform 0.2s ease-in-out;
                    font-size: 14px;
                }
                .script-item:hover {
                    transform: translateY(-3px); /* Subtle hover effect */
                }
                .script-item strong {
                    display: block;
                    font-weight: bold;
                    color: black;
                    margin-bottom: 5px;
                }

                .script-item ul {
                    margin-top: 5px;
                    padding-left: 20px;
                    list-style: disc;
                }

                .script-item li {
                    word-wrap: break-word; /* Prevent overflow for long texts */
                    overflow-wrap: break-word;
                    color: #555;
                }
                .cookie-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 15px;
                    margin-top: 10px;
                }
                .cookie-item {
                    background: #ffffff;
                    padding: 10px 15px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    transition: transform 0.2s ease-in-out;
                }
                .cookie-item:hover {
                    transform: translateY(-3px);
                }
                .cookie-item strong {
                    color: black;
                    font-weight: bold;
                }
                .cookie-item .alert {
                    color: red;
                    font-weight: bold;
                }
                .cookie-status.secure {
                    color: green;
                    font-weight: bold;
                }

                .cookie-status.insecure {
                    color: red;
                    font-weight: bold;
                }
                .alert { 
                    color: red; 
                    font-weight: bold; 
                }
                .none { 
                    color: green; 
                    font-weight: bold; 
                }
                .highlight { 
                    color: #ff0000; 
                    font-weight: bold; 
                }
                .tracker-list { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                    gap: 15px; 
                    margin-top: 10px;
                }
                .tracker-item { 
                    background: #ffffff; 
                    padding: 10px 15px; 
                    border: 1px solid #ddd; 
                    border-radius: 5px; 
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); 
                    transition: transform 0.2s ease-in-out; 
                }
                .tracker-item:hover { 
                    transform: translateY(-3px); 
                }
                .tracker-item strong { 
                    color: black; 
                    font-weight: bold; 
                }
                .tracker-item a { 
                    color: #007bff; 
                    text-decoration: none; 
                }
                .tracker-item a:hover { 
                    text-decoration: underline; 
                }

            </style>


        </head>
        <body>
            <div class="container">
                <h1>Privacy Analysis Report</h1>
                <h2>Website URL: ${pageURL}</h2>
                
                <!-- Scripts Detected -->
                <div class="section">
                    <h2>Scripts Detected</h2>
                    ${generateScriptReport(data.scripts)}
                </div>

                <!-- Security & Privacy Violations Detected -->
                <div class="section">
                    <h2>Security & Privacy Violations Detected</h2>
                    ${generateCategorizedScriptReport(data.scripts, data.suspiciousActivity)}
                </div>

                <!-- Cookies Detected & Security Analysis -->
                <div class="section">
                    ${generateCookieReport(data.cookies)}
                </div>

                <!-- Trackers Detected -->
                <div class="section">
                    <h2>Trackers Detected</h2>
                    ${generateTrackerReport(data.trackers || [])}
                </div>
            </div>
        </body>


        </html>`;
}

// Helper functions to generate report sections
function generateScriptReport(scripts) {
    if (!scripts || scripts.length === 0) return "<p>No scripts detected.</p>";
    return `
        <div class="script-list">
            ${scripts.map(script => `
                <div class="script-item">
                    <strong>Source:</strong> ${script.src}<br>
                    <strong>Attributes:</strong>
                    <ul>
                        <li>Async: ${script.async}</li>
                        <li>Defer: ${script.defer}</li>
                        <li>CORS: ${script.crossorigin || 'N/A'}</li>
                    </ul>
                </div>
            `).join('')}
        </div>`;
}


function generateCategorizedScriptReport(scripts, suspiciousActivity) {
    const phishing = [], cookieTheft = [], untrustedCalls = [];
    const keylogging = [], fakeLogin = [];

    // Iterate over suspicious activity and categorize scripts accordingly
    suspiciousActivity.phishing.forEach(script => phishing.push(script));
    suspiciousActivity.cookieTheft.forEach(script => cookieTheft.push(script));
    suspiciousActivity.untrustedCalls.forEach(script => untrustedCalls.push(script));
    suspiciousActivity.keylogging.forEach(script => keylogging.push(script));
    suspiciousActivity.fakeLogin.forEach(script => fakeLogin.push(script));

    return `
        <h3>Phishing Scripts</h3>${phishing.length ? generateScriptList(phishing) : "<p>No phishing scripts detected.</p>"}
        <h3>Cookie Theft Scripts</h3>${cookieTheft.length ? generateScriptList(cookieTheft) : "<p>No cookie theft scripts detected.</p>"}
        <h3>Untrusted Network Calls</h3>${untrustedCalls.length ? generateScriptLists(untrustedCalls) : "<p>No untrusted network calls detected.</p>"}
        <h3>Keylogging Scripts</h3>${keylogging.length ? generateScriptList(keylogging) : "<p>No keylogging behavior detected.</p>"}
        <h3>Fake Login Form Manipulation Scripts</h3>${fakeLogin.length ? generateScriptList(fakeLogin) : "<p>No fake login form manipulations detected.</p>"}`;
}

// Helper function to create the list of scripts
function generateScriptList(scripts) {
    return `<ul>${scripts.map(src => `<li>${src}</li>`).join('')}</ul>`;
}
function generateScriptLists(scripts) {
    return `<ul>${scripts.map(script => `<li>${script.src || 'Inline script'}</li>`).join('')}</ul>`;
}


function generateCookieReport(cookies) {
    if (!cookies || cookies.length === 0) return "<p>No cookies detected.</p>";
    return `
        <h3>Cookies Detected & Security Analysis</h3>
        <div class="cookie-list">
            ${cookies.map(cookie => `
                <div class="cookie-item">
                    <strong>Name:</strong> ${cookie.name}<br>
                    <strong>Secure:</strong> ${cookie.secure ? "Yes" : "<span class='alert'>No</span>"}<br>
                    <strong>Session:</strong> ${cookie.isSession ? "Yes" : "No"}<br>
                    <span class="cookie-status ${cookie.secure ? 'secure' : 'insecure'}">
                        ${cookie.secure ? 'Secure Cookie' : 'Insecure Cookie'}
                    </span><br>
                </div>
            `).join("")}
        </div>`;
}


function generateTrackerReport(trackers) {
    if (!trackers || trackers.length === 0) return "<p>No trackers detected.</p>";

    return `
        <div class="tracker-list">
            ${trackers
                .map(tracker => `
                <div class="tracker-item">
                    <strong>Domain:</strong> 
                    <a href="https://${tracker.domain || 'Unknown'}" target="_blank" rel="noopener noreferrer">
                        ${tracker.domain || 'Unknown'}
                    </a>
                    ${tracker.scripts && tracker.scripts.length > 0 ? `
                    <br>
                    <strong>Related Scripts:</strong>
                    <ul class="script-list">
                        ${tracker.scripts.map(script => `<li class="script-item">${script}</li>`).join('')}
                    </ul>` : `
                    <p><em>No related scripts found.</em></p>`}
                </div>`)
                .join("")}
        </div>`;
}






