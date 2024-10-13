// Function to generate the detailed report as HTML content
function generateDetailedReport(data, pageURL) {
    const reportContent = `
    <html>
    <head>
        <title>Privacy Analysis Report</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f9; color: #333; }
            h1 { color: #2c3e50; text-align: center; }
            h2, h3 { color: #34495e; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            ul { list-style-type: none; padding: 0; }
            li { background-color: #e3f2fd; padding: 10px; margin: 5px 0; border-radius: 4px; }
            .category { font-weight: bold; color: #1a237e; }
            .container { max-width: 800px; margin: 0 auto; }
            .section { margin-bottom: 20px; }
            .category-count { color: #16a085; font-weight: bold; }
            .cookie-info { font-size: 0.9em; color: #555; }
            .cookie-category { font-size: 1.1em; color: #2c3e50; margin-top: 10px; }
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
                <h2>Cookies Detected</h2>
                ${generateCookieReport(data.cookies)}
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
        <hr>
        <br>
    `;
}

function generateCookieReport(cookies) {
    if (!cookies || cookies.length === 0) {
        return "<p>No cookies detected.</p>";
    }

    return `
        <ul>
            ${cookies.map(cookie => `
                <li>
                    <strong>Name:</strong> ${cookie.name}<br>
                    <strong>Value:</strong> ${cookie.value}<br>
                    <strong>Domain:</strong> ${cookie.domain}<br>
                    <strong>Expires:</strong> ${cookie.expires}<br>
                    <strong>Type:</strong> ${cookie.type}
                </li>
                <br>
            `).join('')}
        </ul>
        <hr>
        <br>
    `;
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
