// background.js

let maliciousIndicators = [];

// Listener to handle messages from content.js and popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        switch (message.type) {
            case "getCookies":
                chrome.cookies.getAll({ url: message.url }, (cookies) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error fetching cookies:", chrome.runtime.lastError.message);
                        sendResponse({ success: false, error: "Failed to fetch cookies." });
                        return;
                    }
                    console.log("Cookies fetched in background script:", cookies); // Should log an array
                    sendResponse(cookies); // Send the array directly
                });
                return true;

            case "cookiesCollected":
                if (Array.isArray(message.cookies)) {
                    chrome.storage.local.set({ cookies: message.cookies }, () => {
                        if (chrome.runtime.lastError) {
                            console.error("Error saving cookies:", chrome.runtime.lastError.message);
                            sendResponse({ success: false, error: "Failed to save cookies." });
                        } else {
                            console.log("Cookies saved successfully.");
                            sendResponse({ success: true });
                        }
                    });
                } else {
                    console.error("Invalid cookies format.");
                    sendResponse({ success: false, error: "Invalid cookies format." });
                }
                return true;

            case "maliciousIndicatorsLoaded":
                if (Array.isArray(message.data)) {
                    maliciousIndicators = message.data;
                    console.log("Malicious indicators loaded:", maliciousIndicators);
                    sendResponse({ success: true });
                } else {
                    console.error("Invalid malicious indicators format.");
                    sendResponse({ success: false, error: "Invalid format." });
                }
                break;

            case "fetchScriptContent":
                if (message.url) {
                    fetchScriptContent(message.url)
                        .then((content) => {
                            if (content) {
                                sendResponse({ success: true, content });
                            } else {
                                sendResponse({ success: false, error: "Failed to fetch script content." });
                            }
                        })
                        .catch((error) => {
                            console.error("Error fetching script content:", error);
                            sendResponse({ success: false, error: error.message });
                        });
                    return true;
                } else {
                    console.error("No URL provided for fetchScriptContent.");
                    sendResponse({ success: false, error: "No URL provided." });
                }
                break;

            case "generateReport":
                chrome.storage.local.get("pageAnalysis", (result) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error fetching page analysis:", chrome.runtime.lastError.message);
                        sendResponse({ success: false, error: "Failed to fetch page analysis." });
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
                                            console.error("Error initiating download:", chrome.runtime.lastError.message);
                                            sendResponse({ success: false, error: "Failed to download report." });
                                        } else {
                                            console.log("Report downloaded successfully. Download ID:", downloadId);
                                            sendResponse({ success: true });
                                        }
                                    }
                                );
                            };
                            reader.readAsDataURL(blob);
                        } catch (error) {
                            console.error("Error generating report:", error);
                            sendResponse({ success: false, error: "Error generating report." });
                        }
                    } else {
                        console.warn("No page analysis data found.");
                        sendResponse({ success: false, error: "No data found." });
                    }
                });
                return true;

            default:
                console.warn("Unknown message type:", message.type);
                sendResponse({ success: false, error: "Unknown message type." });
        }
    } catch (error) {
        console.error("Unexpected error in background script:", error);
        sendResponse({ success: false, error: "Unexpected error." });
    }
});

// Function to fetch script content
async function fetchScriptContent(url) {
    console.log("Fetching script content from URL:", url);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.statusText} (Status: ${response.status})`);
        }
        const scriptContent = await response.text();
        console.log("Script content fetched successfully.");
        return scriptContent;
    } catch (error) {
        console.error("Error in fetchScriptContent:", error);
        return null;
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
                h3 {
                    color: #333;
                    margin-top: 20px;
                    font-size: 18px;
                }

                /* Section styles */
                .section, .suspicious-section {
                    margin-bottom: 20px;
                    padding: 15px;
                    background: #f9f9f9;
                    border-left: 4px solid #007bff;
                    border-radius: 3px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    transition: box-shadow 0.3s ease, transform 0.3s ease;
                }

                .section:hover, .suspicious-section:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                }

                /* Grid layout for items */
                .script-list, .cookie-list, .tracker-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                    gap: 15px;
                    margin-top: 10px;
                }

                /* Item styles with box structure */
                .script-item, .cookie-item, .tracker-item {
                    background: #ffffff; /* White background for box */
                    padding: 10px 15px; /* Add inner spacing */
                    border: 1px solid #ddd; /* Light border for box structure */
                    border-radius: 5px; /* Rounded corners for a clean look */
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1); /* Subtle shadow */
                    transition: transform 0.2s ease-in-out, box-shadow 0.3s ease;
                    word-wrap: break-word; /* Wrap long words */
                    overflow-wrap: break-word; /* Handle unbreakable long words */
                    word-break: break-word; /* Break overly long links */
                    max-width: 100%; /* Ensure content stays within container */
                }

                /* Hover effect for boxes */
                .script-item:hover, .cookie-item:hover, .tracker-item:hover {
                    transform: translateY(-5px); /* Slight lift effect */
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2); /* Enhanced shadow */
                }

                /* Styling for text and links inside boxes */
                .script-item strong, .cookie-item strong, .tracker-item strong {
                    color: black;
                    font-weight: bold;
                }

                .script-item ul, .cookie-item ul, .tracker-item ul {
                    margin-top: 5px;
                    padding-left: 20px;
                    list-style: disc;
                }

                .script-item li, .cookie-item li, .tracker-item li {
                    color: #555;
                }

                /* Links inside the items */
                .script-item a, .cookie-item a, .tracker-item a {
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    text-decoration: none;
                    color: #007bff; /* Link color */
                }

                .script-item a:hover, .cookie-item a:hover, .tracker-item a:hover {
                    text-decoration: underline; /* Highlight links on hover */
                }
                .cookie-report {
                    font-family: Arial, sans-serif;
                    margin: 20px 0;
                }

                .cookie-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }

                .cookie-item {
                    background: #f9f9f9;
                    border: 1px solid #ddd;
                    padding: 10px;
                    border-radius: 5px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    flex: 1 1 calc(45% - 10px);
                    max-width: calc(45% - 10px);
                }

                .cookie-item strong {
                    color: #333;
                }

                .cookie-status {
                    font-weight: bold;
                    padding: 2px 5px;
                    border-radius: 3px;
                    
                    color: #fff;
                }

                .cookie-status.secure {
                    background: #28a745;
                }

                .cookie-status.insecure {
                    background: #dc3545;
                }

                h4 {
                    margin-bottom: 10px;
                    color: #007bff;
                }


                /* Alert styles */
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
                    <h2>Cookies Detected</h2>
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
        <div class="suspicious-section">
            <h3>Phishing Scripts</h3>
            <div class="suspicious-content">${phishing.length ? generateScriptList(phishing) : "<p>No phishing scripts detected.</p>"}</div>
        </div>
        <div class="suspicious-section">
            <h3>Cookie Accessing Scripts</h3>
            <div class="suspicious-content">${cookieTheft.length ? generateScriptList(cookieTheft) : "<p>No cookie theft scripts detected.</p>"}</div>
        </div>
        <div class="suspicious-section">
            <h3>Untrusted Network Calls</h3>
            <div class="suspicious-content">${untrustedCalls.length ? generateScriptLists(untrustedCalls) : "<p>No untrusted network calls detected.</p>"}</div>
        </div>
        <div class="suspicious-section">
            <h3>Keylogging Scripts</h3>
            <div class="suspicious-content">${keylogging.length ? generateScriptList(keylogging) : "<p>No keylogging behavior detected.</p>"}</div>
        </div>`;
}

// Helper function to create the list of scripts
function generateScriptList(scripts) {
    return `<ul>${scripts.map(src => `<li>${src}</li>`).join('')}</ul>`;
}

function generateScriptLists(scripts) {
    return `<ul>${scripts.map(script => `<li>${script.src || 'Inline script'}</li>`).join('')}</ul>`;
}

function generateCookieReport(cookies) {
    console.log("Cookies received in generateCookieReport:", cookies);

    if (!cookies || cookies.length === 0) return "<p>No cookies detected.</p>";

    // Separate first-party and third-party cookies
    const firstPartyCookies = cookies.filter(cookie => !cookie.thirdParty);
    const thirdPartyCookies = cookies.filter(cookie => cookie.thirdParty);

    // Generate individual cookie items
    const renderCookieItem = (cookie) => `
        <div class="cookie-item">
            <strong>Name:</strong> ${cookie.name || "N/A"}<br>
            <strong>Value:</strong> ${cookie.value || "N/A"}<br>
            <strong>Secure:</strong> ${cookie.secure ? "Yes" : "<span class='alert'>No</span>"}<br>
            <strong>HttpOnly:</strong> ${cookie.httpOnly ? "Yes" : "No"}<br>
            <strong>Session:</strong> ${cookie.session ? "Yes" : "No"}<br>
            <strong>Domain:</strong> ${cookie.domain || "N/A"}<br>
            <span class="cookie-status ${cookie.secure ? 'secure' : 'insecure'}">
                ${cookie.secure ? 'Secure Cookie' : 'Insecure Cookie'}
            </span><br>
        </div>`;

    // Generate sections for each type of cookie
    const cookieSection = (title, cookieList) => `
        <h4>${title}</h4>
        <div class="cookie-list">
            ${cookieList.map(renderCookieItem).join("")}
        </div>`;

    // Generate the full report
    return `
        <div class="cookie-report">
            ${firstPartyCookies.length > 0 ? cookieSection("First-Party Cookies", firstPartyCookies) : "<p>No first-party cookies detected.</p>"}
            ${thirdPartyCookies.length > 0 ? cookieSection("Third-Party Cookies", thirdPartyCookies) : ""}
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

