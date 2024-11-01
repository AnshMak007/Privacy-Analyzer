// // Fetch malicious indicators when the extension is loaded
// fetch(chrome.runtime.getURL("scripts/maliciousIndicators.json"))
//   .then(response => {
//     if (!response.ok) {
//       throw new Error("Network response was not ok");
//     }
//     return response.json();
//   })
//   .then(data => {
//     console.log("Loaded malicious indicators:", data.malicious_indicators);
//   })
//   .catch(error => {
//     console.error("Error loading malicious indicators:", error);
//   });

// // Function to generate the detailed report as HTML content
// function generateDetailedReport(data, pageURL) {
//     const reportContent = `
//     <html>
//     <head>
//         <title>Privacy Analysis Report</title>
//         <style>
//             body {
//                 font-family: Arial, sans-serif;
//                 line-height: 1.6;
//                 margin: 0;
//                 padding: 20px;
//                 background-color: #f4f4f4;
//             }
//             .container {
//                 max-width: 800px;
//                 margin: 0 auto;
//                 padding: 20px;
//                 background: white;
//                 border-radius: 5px;
//                 box-shadow: 0 0 10px rgba(0,0,0,0.1);
//             }
//             h1 {
//                 color: #333;
//             }
//             h2 {
//                 color: #555;
//                 border-bottom: 2px solid #eaeaea;
//                 padding-bottom: 5px;
//                 margin-bottom: 10px;
//             }
//             h3 {
//                 color: #777;
//                 font-size: 1.2em;
//             }
//             .section {
//                 margin-bottom: 20px;
//                 padding: 15px;
//                 background: #f9f9f9;
//                 border-left: 4px solid #007bff;
//                 border-radius: 3px;
//             }
//             ul {
//                 list-style-type: none;
//                 padding: 0;
//             }
//             li {
//                 background: #fff;
//                 margin: 5px 0;
//                 padding: 10px;
//                 border: 1px solid #eaeaea;
//                 border-radius: 3px;
//             }
//             strong {
//                 color: #333;
//             }
//             .alert {
//                 color: red;
//                 font-weight: bold;
//             }
//             .none {
//                 color: green;
//                 font-weight: bold;
//             }
//         </style>
//     </head>
//     <body>
//         <div class="container">
//             <h1>Privacy Analysis Report</h1>
//             <h3>Website URL: ${pageURL}</h3>

//             <div class="section">
//                 <h2>Scripts Detected</h2>
//                 ${generateScriptReport(data.scripts)}
//             </div>

//             <div class="section">
//                 <h2>Malicious Scripts Detected</h2>
//                 ${generateMaliciousScriptReport(data.maliciousScripts)}
//             </div>

//             <div class="section">
//                 <h2>Cookies Detected & Security Analysis</h2>
//                 ${generateCookieReport(data.cookies)}
//                 ${analyzeCookieSecurity(data.cookies)}
//             </div>

//             <div class="section">
//                 <h2>Trackers Detected</h2>
//                 ${generateTrackerReport(data.trackers)}
//             </div>
//         </div>
//     </body>
//     </html>`;

//     return reportContent;
// }

// // Define the helper functions used in generateDetailedReport

// // Function to generate the script report
// function generateScriptReport(scripts) {
//     if (!scripts || scripts.length === 0) {
//         return "<p>No scripts detected.</p>";
//     }
//     return `
//         <ul>
//             ${scripts.map(script => `
//                 <li>
//                     <strong>Source:</strong> ${script.src}<br>
//                     <strong>Attributes:</strong>
//                     <ul>
//                         <li><strong>Async:</strong> ${script.attributes.async}</li>
//                         <li><strong>Defer:</strong> ${script.attributes.defer}</li>
//                         <li><strong>CORS:</strong> ${script.attributes.crossorigin}</li>
//                     </ul>
//                 </li>
//                 <br>
//             `).join('')}
//         </ul>
//         <br>
//     `;
// }

// // Function to generate report for malicious scripts detected
// function generateMaliciousScriptReport(maliciousScripts) {
//     if (!maliciousScripts || !Array.isArray(maliciousScripts) || maliciousScripts.length === 0) {
//         return "<p class='none'>No malicious scripts detected.</p>";
//     }
//     return `<ul>${maliciousScripts.map(script => 
//         `<li class="alert"><strong>${script.name}</strong>: ${script.threatLevel}</li>`
//     ).join('')}</ul>`;
// }

// // Function to generate cookie report
// function generateCookieReport(cookies) {
//     if (cookies.length === 0) {
//         return "<p>No cookies detected.</p>";
//     }
//     return `
//         <ul>
//             ${cookies.map(cookie => `
//                 <li>
//                     <strong>Cookie Name:</strong> ${cookie.name} <br />
//                     <strong>Value:</strong> ${cookie.value} <br />
//                     <strong>Domain:</strong> ${cookie.domain} <br />
//                     <strong>Expires:</strong> ${cookie.expires} <br />
//                     <strong>Type:</strong> ${cookie.type} <br />
//                 </li>
//                 <br>
//             `).join('')}
//         </ul>
//     `;
// }

// // Function to analyze cookie security
// function analyzeCookieSecurity(cookies) {
//     let results = "<ul>";
//     if (cookies.length === 0) {
//         results += "<li>No cookies detected.</li>";
//     } else {
//         cookies.forEach(cookie => {
//             const secure = cookie.secure ? "Secure" : "Insecure";
//             const httpOnly = cookie.httpOnly ? "HttpOnly" : "Not HttpOnly";
//             const status = secure === "Insecure" ? "Insecure" : "Secure";
//             results += `<li>
//                 Cookie: ${cookie.name}, 
//                 Status: <span class="${status === 'Insecure' ? 'alert' : 'none'}">${status}</span>, 
//                 HttpOnly: ${httpOnly}
//             </li>`;
//         });
//     }
//     results += "</ul>";
//     return results;
// }

// // Function to generate tracker report
// function generateTrackerReport(trackers) {
//     if (!trackers || trackers.length === 0) {
//         return "<p>No trackers detected.</p>";
//     }
//     return `
//         <ul>
//             ${trackers.map(tracker => `
//                 <li>
//                     <strong>Domain:</strong> ${tracker.domain}<br>
//                     <strong>Description:</strong> ${tracker.description}<br>
//                     <strong>Type:</strong> ${tracker.type}
//                 </li>
//                 <br>
//             `).join('')}
//         </ul>
//     `;
// }

// // Listen for messages from content.js or popup scripts
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//     if (message.type === 'injectAndAnalyze') {
//         chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//             const activeTab = tabs[0].id;
//             const pageURL = tabs[0].url;

//             // Inject content script to analyze page
//             chrome.scripting.executeScript({
//                 target: { tabId: activeTab },
//                 files: ['scripts/content.js']
//             }, () => {
//                 // Send message to content script to start analysis
//                 chrome.tabs.sendMessage(activeTab, { type: 'analyzePage', pageURL: pageURL }, (response) => {
//                     if (chrome.runtime.lastError) {
//                         console.error(chrome.runtime.lastError.message);
//                     } else {
//                         // Store the analysis result in local storage
//                         chrome.storage.local.set({ pageAnalysis: { ...response, pageURL: pageURL } }, () => {
//                             sendResponse(response);
//                         });
//                     }
//                 });
//             });
//         });
//         return true; // Keeps the message channel open for async response
//     }

//     if (message.type === 'requestDetailedReport') {
//         chrome.storage.local.get('pageAnalysis', function(result) {
//             console.log("Page Analysis:", result.pageAnalysis);
//             if (result.pageAnalysis) {
//                 const reportContent = generateDetailedReport(result.pageAnalysis, result.pageAnalysis.pageURL);
//                 sendResponse({ report: reportContent });
//             } else {
//                 sendResponse({ error: 'No page analysis found.' });
//             }
//         });
//         return true; // Keeps the message channel open for async response
//     }
// });
// Fetch malicious indicators when the extension is loaded
// background.js

// Listener to handle messages from content.js
let maliciousIndicators = [];

// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.type === "maliciousIndicatorsLoaded") {
            // Load malicious indicators sent from content.js
            maliciousIndicators = message.data;
            console.log("Malicious indicators received in background.js:", maliciousIndicators);

            sendResponse({ success: true });
            return true; // Keeps the message port open for async response

        } else if (message.type === 'fetchScriptContent' && message.url) {
            // Handle CORS issue by fetching script content
            fetch(message.url)
                .then(response => {
                    if (!response.ok) throw new Error(`Failed to fetch script content: ${response.statusText}`);
                    return response.text();
                })
                .then(content => {
                    console.log("Fetched script content successfully.");
                    sendResponse({ success: true, content });
                })
                .catch(error => {
                    console.error("Error fetching script content:", error);
                    sendResponse({ success: false, error: error.message });
                });
            
            return true; // Keeps the message channel open for async response

        } else if (message.type === 'downloadReport') {
            // Retrieve the page analysis from storage and generate the report
            chrome.storage.local.get('pageAnalysis', result => {
                if (chrome.runtime.lastError) {
                    console.error("Error fetching page analysis:", chrome.runtime.lastError.message);
                    sendResponse({ error: 'Failed to fetch page analysis.' });
                    return;
                }

                if (result.pageAnalysis) {
                    const reportContent = generateDetailedReport(result.pageAnalysis, result.pageAnalysis.url);
                    const blob = new Blob([reportContent], { type: 'text/html' });

                    // Convert blob to a Data URL for downloading
                    const reader = new FileReader();
                    reader.onloadend = function() {
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
            return true; // Keeps the message channel open for async response

        } else {
            console.warn("Unknown message type received:", message.type);
            sendResponse({ success: false, error: "Unknown message type" });
        }
    } catch (error) {
        console.error("Unexpected error in message handling:", error);
        sendResponse({ success: false, error: "Unexpected error in background script" });
    }
});

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
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Privacy Analysis Report</h1>
                <h2>Website URL: ${pageURL}</h2>
                <div class="section"><h2>Scripts Detected</h2>${generateScriptReport(data.scripts)}</div>
                <div class="section"><h2>Phishing, Cookie Theft & Network Call Detection</h2>${generateCategorizedScriptReport(data.scripts)}</div>
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
    scripts.forEach(script => {
        const src = script.src.toLowerCase();
        if (maliciousIndicators.some(indicator => src.includes(indicator))) phishing.push(script.src);
        if (src.includes("cookie")) cookieTheft.push(script.src);
        if (src.includes("networkcall")) untrustedCalls.push(script.src);
    });

    return `
        <h3>Phishing Scripts</h3>${phishing.length ? generateScriptList(phishing) : "<p>No phishing scripts detected.</p>"}
        <h3>Cookie Theft Scripts</h3>${cookieTheft.length ? generateScriptList(cookieTheft) : "<p>No cookie theft scripts detected.</p>"}
        <h3>Untrusted Network Calls</h3>${untrustedCalls.length ? generateScriptList(untrustedCalls) : "<p>No untrusted network calls detected.</p>"}`;
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
    return `<ul>${trackers.map(tracker => `
        <li><strong>Domain:</strong> ${tracker.name}<br>
            <strong>Type:</strong> ${tracker.type}<br>
            <strong>Description:</strong> ${tracker.description || "N/A"}
        </li>`).join('')}</ul>`;
}


