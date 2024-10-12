// Function to generate the detailed report as HTML content


function generateDetailedReport(data) {
    let reportContent = `
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

        <h2>Scripts Detected</h2>
        <ul>${data.scripts.map(script => 
            `<li><span class="category">${script.type}</span>: ${script.src}</li>`
        ).join('')}</ul>

        <h2>Cookies Detected</h2>
        <ul>${data.cookies.map(cookie => 
            `<li><span class="category">${cookie.category}</span>: ${cookie.value}</li>`
        ).join('')}</ul>

        <h2>Trackers Detected</h2>
        <ul>${data.trackers.map(tracker => 
            `<li>Domain: ${tracker.domain} (Name: ${tracker.name})</li>`
        ).join('')}</ul>
    </body>
    </html>`;
    return reportContent;
}

// Function to download the detailed report as an HTML file
function downloadDetailedReport() {
    chrome.storage.local.get('pageAnalysis', function(result) {
        if (result.pageAnalysis) {
            const reportContent = generateDetailedReport(result.pageAnalysis);
            const blob = new Blob([reportContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'privacy_analysis_report.html';
            a.click();
            URL.revokeObjectURL(url);
        } else {
            console.error('No page analysis data found.');
        }
    });
}

// Listening for messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'requestDetailedReport') {
        console.log('Received message in analysis.js:', message);
        downloadDetailedReport(); // Call the function to download the report
        sendResponse({ success: true }); // Send a success response
    } else {
        sendResponse({ success: false }); // Send a failure response for unrecognized messages
    }
});
