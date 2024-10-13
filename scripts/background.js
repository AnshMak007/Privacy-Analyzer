// Fetch malicious indicators when the extension is loaded
fetch(chrome.runtime.getURL("maliciousIndicators.json"))
  .then(response => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.json();
  })
  .then(data => {
    console.log("Loaded malicious indicators:", data.malicious_indicators); // Accessing the nested key
    // You can now use `data.malicious_indicators` to compare scripts or cookies to detect malicious activity
  })
  .catch(error => {
    console.error("Error loading malicious indicators:", error);
  });


// Function to generate the detailed report as HTML content
function generateDetailedReport(data, pageURL) {
    const reportContent = `
    <html>
    <head>
        <title>Privacy Analysis Report</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: white;
                border-radius: 5px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            h1 {
                color: #333;
            }
            h2 {
                color: #555;
                border-bottom: 2px solid #eaeaea;
                padding-bottom: 5px;
                margin-bottom: 10px;
            }
            h3 {
                color: #777;
                font-size: 1.2em;
            }
            .section {
                margin-bottom: 20px;
                padding: 15px;
                background: #f9f9f9;
                border-left: 4px solid #007bff;
                border-radius: 3px;
            }
            ul {
                list-style-type: none;
                padding: 0;
            }
            li {
                background: #fff;
                margin: 5px 0;
                padding: 10px;
                border: 1px solid #eaeaea;
                border-radius: 3px;
            }
            strong {
                color: #333;
            }
            .alert {
                color: red;
                font-weight: bold;
            }
            .none {
                color: green;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Privacy Analysis Report</h1>
            <h3>Website URL: ${pageURL}</h3>

            <div class="section">
                <h2>Scripts Detected</h2>
                ${generateScriptReport(data.scripts)}
            </div>

            <div class="section">
                <h2>Malicious Scripts Detected</h2>
                ${generateMaliciousScriptReport(data.maliciousScripts)}
            </div>

            <div class="section">
                <h2>Cookies Detected & Security Analysis</h2>
                ${generateCookieReport(data.cookies)}
                ${analyzeCookieSecurity(data.cookies)}
            </div>

            <div class="section">
                <h2>Trackers Detected</h2>
                ${generateTrackerReport(data.trackers)}
            </div>
        </div>
    </body>
    </html>`;

    return reportContent;
}

// Function to generate report for malicious scripts detected
function generateMaliciousScriptReport(maliciousScripts) {
    if (!maliciousScripts || !Array.isArray(maliciousScripts) || maliciousScripts.length === 0) {
        return "<p class='none'>No malicious scripts detected.</p>";
    }
    return `<ul>${maliciousScripts.map(script => 
        `<li class="alert"><strong>${script.name}</strong>: ${script.threatLevel}</li>`
    ).join('')}</ul>`;
}
// // Example function to detect malicious scripts
// function detectMaliciousScripts(scripts) {
//     console.log("Analyzing scripts for malicious indicators:", scripts); 
//     const maliciousIndicators = [
//         "malicious.com",
//         "badsite.net",
//         "untrusted.org",
//         // Add more indicators as needed
//     ];
//     let detected = false;
//     let results = "<ul>";

//     scripts.forEach(script => {
//         for (let indicator of maliciousIndicators) {
//             if (script.includes(indicator)) {
//                 detected = true;
//                 results += `<li class="alert">Malicious script detected: ${script}</li>`;
//                 break;
//             }
//         }
//     });

//     if (!detected) {
//         results += "<li>No malicious scripts detected.</li>";
//     }
//     results += "</ul>";
//     return results;
// }

// Function to analyze cookie security
function analyzeCookieSecurity(cookies) {
    let results = "<ul>";

    if (cookies.length === 0) {
        results += "<li>No cookies detected.</li>";
    } else {
        cookies.forEach(cookie => {
            const secure = cookie.secure ? "Secure" : "Insecure";
            const httpOnly = cookie.httpOnly ? "HttpOnly" : "Not HttpOnly";
            const status = secure === "Insecure" ? "Insecure" : "Secure";

            results += `<li>
                Cookie: ${cookie.name}, 
                Status: <span class="${status === 'Insecure' ? 'alert' : 'none'}">${status}</span>, 
                HttpOnly: ${httpOnly}
            </li>`;
        });
    }

    results += "</ul>";
    return results;
}

// function generateScriptReport(scripts) {
//     if (!scripts || scripts.length === 0) {
//         return "<p>No scripts detected.</p>";
//     }
//     return `<ul>${scripts.map(script => `<li><strong>${script.name}</strong>: ${script.category}</li>`).join('')}</ul>`;
// }

function generateScriptReport(scripts) {
    if (!scripts || scripts.length === 0) {
        return "<p>No scripts detected.</p>";
    }

    return `
        <ul>
            ${scripts.map(script => `
                <li>
                    <strong>Source:</strong> ${script.src}<br>
                    <strong>Attributes:</strong>
                    <ul>
                        <li><strong>Async:</strong> ${script.attributes.async}</li>
                        <li><strong>Defer:</strong> ${script.attributes.defer}</li>
                        <li><strong>CORS:</strong> ${script.attributes.crossorigin}</li>
                    </ul>
                </li>
                <br>
            `).join('')}
        </ul>
        <br>
    `;
}

function generateCookieReport(cookies) {
    if (cookies.length === 0) {
        return "<p>No cookies detected.</p>";
    }

    return `
        <ul>
            ${cookies.map(cookie => `
                <li>
                    <strong>Cookie Name:</strong> ${cookie.name} <br />
                    <strong>Value:</strong> ${cookie.value} <br />
                    <strong>Domain:</strong> ${cookie.domain} <br />
                    <strong>Expires:</strong> ${cookie.expires} <br />
                    <strong>Type:</strong> ${cookie.type} <br />
                </li>
                <br>
            `).join('')}
        </ul>
    `;
}
// Function to check if a cookie is secure (for client-side analysis)
function isCookieSecure(cookie) {
    // Look for the 'Secure' flag in the cookie string
    const secureFlag = cookie.secure || cookie.value.match(/secure/i);
    return secureFlag !== null;
}


function generateTrackerReport(trackers) {
    if (!trackers || trackers.length === 0) {
        return "<p>No trackers detected.</p>";
    }
    return `
        <ul>
            ${trackers.map(tracker => `
                <li>
                    <strong>Domain:</strong> ${tracker.domain}<br>
                    <strong>Description:</strong> ${tracker.description}<br>
                    <strong>Type:</strong> ${tracker.type}
                </li>
                <br>
            `).join('')}
        </ul>
    `;
}
// Listen for messages from content.js or popup scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'injectAndAnalyze') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0].id;
            const pageURL = tabs[0].url;

            // Inject content script to analyze page
            chrome.scripting.executeScript({
                target: { tabId: activeTab },
                files: ['scripts/content.js']
            }, () => {
                // Send message to content script to start analysis
                chrome.tabs.sendMessage(activeTab, { type: 'analyzePage', pageURL: pageURL }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError.message);
                    } else {
                        // Store the analysis result in local storage
                        chrome.storage.local.set({ pageAnalysis: { ...response, pageURL: pageURL } }, () => {
                            sendResponse(response);
                        });
                    }
                });
            });
        });
        return true; // Keeps the message channel open for async response
    }

    if (message.type === 'requestDetailedReport') {
        chrome.storage.local.get('pageAnalysis', function(result) {
            console.log("Page Analysis:", result.pageAnalysis);
            if (result.pageAnalysis) {
                const reportContent = generateDetailedReport(result.pageAnalysis, result.pageAnalysis.pageURL);
                sendResponse({ report: reportContent });
            } else {
                sendResponse({ success: false, error: 'No data found for report' });
            }
        });
        return true; // Keeps the message channel open for async response
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed or Updated.');
});
