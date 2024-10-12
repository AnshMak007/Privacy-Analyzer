// Function to generate the detailed report as HTML content
function generateDetailedReport(data) {
    return `
    <html>
    <head>
        <title>Privacy Analysis Report</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #2c3e50; }
            h2, h3 { color: #34495e; }
            ul { list-style-type: none; padding: 0; }
            li { background-color: #e3f2fd; padding: 10px; margin: 5px 0; border-radius: 4px; }
            .category { font-weight: bold; color: #1a237e; }
        </style>
    </head>
    <body>
        <h1>Privacy Analysis Report</h1>

        ${generateScriptsSection(data.scripts)}
        ${generateCookiesSection(data.cookies)}
        ${generateTrackersSection(data.trackers)}
    </body>
    </html>`;
}

// Helper function to generate the Scripts section
function generateScriptsSection(scripts) {
    if (!scripts || scripts.length === 0) return '<h2>No Scripts Detected</h2>';
    return `
        <h2>Scripts Detected</h2>
        <ul>${scripts.map(script => 
            `<li><span class="category">${script.type}</span>: ${script.src || 'Unknown Source'}</li>`
        ).join('')}</ul>`;
}

// Helper function to generate the Cookies section
function generateCookiesSection(cookies) {
    if (!cookies || cookies.length === 0) return '<h2>No Cookies Detected</h2>';
    return `
        <h2>Cookies Detected</h2>
        <ul>${cookies.map(cookie => 
            `<li><span class="category">${cookie.category || 'Unknown Category'}</span>: ${cookie.value || 'No Value'}</li>`
        ).join('')}</ul>`;
}

// Helper function to generate the Trackers section
function generateTrackersSection(trackers) {
    if (!trackers || trackers.length === 0) return '<h2>No Trackers Detected</h2>';
    return `
        <h2>Trackers Detected</h2>
        <ul>${trackers.map(tracker => 
            `<li>Domain: ${tracker.domain || 'Unknown Domain'} (Name: ${tracker.name || 'Unknown Name'})</li>`
        ).join('')}</ul>`;
}

// Listen for messages from popup.js and content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'injectAndAnalyze') {
        // Inject content.js and send analyzePage message
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0].id;

            // Inject the content script to analyze the page
            chrome.scripting.executeScript({
                target: { tabId: activeTab },
                files: ['scripts/content.js']
            }, () => {
                // After injection, send a message to the content script to start analysis
                chrome.tabs.sendMessage(activeTab, { type: 'analyzePage' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error(`Error injecting script: ${chrome.runtime.lastError.message}`);
                        sendResponse({ success: false, error: 'Failed to inject script.' });
                    } else {
                        sendResponse(response);
                    }
                });
            });
        });
        return true; // Keeps the message channel open for async response
    }

    if (message.type === 'requestDetailedReport') {
        // Retrieve page analysis data from storage and generate the report
        chrome.storage.local.get('pageAnalysis', (result) => {
            if (result.pageAnalysis) {
                const reportContent = generateDetailedReport(result.pageAnalysis);
                sendResponse({ success: true, report: reportContent });
            } else {
                sendResponse({ success: false, error: 'No data found for report' });
            }
        });
        return true; // Keeps the message channel open for async response
    }
});

// Event listener for extension installation or update
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed or updated.');
});
