// Function to generate the detailed report as HTML content
function generateDetailedReport(data, pageURL) {
    let reportContent = `
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
                ${generateCookieReport(data.cookies, new URL(pageURL).hostname)} <!-- Pass the domain here -->
            </div>

            <div class="section">
                <h2>Trackers Detected</h2>
                <ul>${data.trackers.map(tracker => 
                    `<li>Domain: ${tracker.domain} (Name: ${tracker.name})</li>`
                ).join('')}</ul>
            </div>
        </div>
    </body>
    </html>`;

    return reportContent;
}

// Generate Script Report: Group by script type and show counts
function generateScriptReport(scripts) {
    const scriptCategories = groupByCategory(scripts, 'type');
    let scriptReport = '';

    for (const category in scriptCategories) {
        scriptReport += `
            <div class="script-category">
                <h3>${category} Scripts <span class="category-count">(${scriptCategories[category].length})</span></h3>
                <ul>
                    ${scriptCategories[category].map(script => `<li>${script.src}</li>`).join('')}
                </ul>
            </div>`;
    }

    return scriptReport;
}

// Generate Cookie Report: Categorize and show additional cookie info
function generateCookieReport(cookies, currentDomain) {
    const categorizedCookies = categorizeCookies(cookies, currentDomain);
    let cookieReport = '';

    for (const category in categorizedCookies) {
        cookieReport += `
            <div class="cookie-category">
                <h3>${category} Cookies <span class="category-count">(${categorizedCookies[category].length})</span></h3>
                <ul>
                    ${categorizedCookies[category].map(cookie => `
                        <li>
                            ${cookie.value}
                            <div class="cookie-info">
                                Domain: ${cookie.domain || 'N/A'}, Expires: ${cookie.expires || 'Session Only'}
                            </div>
                        </li>`).join('')}
                </ul>
            </div>`;
    }

    return cookieReport;
}

// Group items by category
function groupByCategory(items, categoryField) {
    return items.reduce((acc, item) => {
        const category = item[categoryField] || 'Other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {});
}

// Categorize cookies into session, third-party, persistent, etc.
function categorizeCookies(cookies, currentDomain) {
    const categories = {
        'Session': [],
        'Persistent': [],
        'Third-party': [],
        'Other': []
    };

    cookies.forEach(cookie => {
        const isPersistent = /expires=/i.test(cookie.value);
        const domainMatch = cookie.value.match(/domain=([^;]*)/i);
        const cookieDomain = domainMatch ? domainMatch[1] : null;

        if (!isPersistent && !cookieDomain) {
            categories['Session'].push(cookie);
        } else if (isPersistent) {
            categories['Persistent'].push(cookie);
        } else if (cookieDomain && cookieDomain !== currentDomain) {
            categories['Third-party'].push(cookie);
        } else {
            categories['Other'].push(cookie);
        }
    });

    return categories;
}

// Listen for the inject and analyze message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'injectAndAnalyze') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0].id;
            const pageURL = tabs[0].url;  // Correctly capture the URL here

            chrome.scripting.executeScript({
                target: { tabId: activeTab },
                files: ['scripts/content.js']
            }, () => {
                chrome.tabs.sendMessage(activeTab, { type: 'analyzePage', pageURL: pageURL }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError.message);
                    } else {
                        // Store the analysis data in local storage for report generation
                        chrome.storage.local.set({ pageAnalysis: { ...response, pageURL: pageURL } }, () => {
                            sendResponse(response);
                        });
                    }
                });
            });
        });
        return true; // Indicate asynchronous response
    }

    if (message.type === 'requestDetailedReport') {
        chrome.storage.local.get('pageAnalysis', function(result) {
            if (result.pageAnalysis) {
                const reportContent = generateDetailedReport(result.pageAnalysis, result.pageAnalysis.pageURL);
                sendResponse({ report: reportContent });
            } else {
                sendResponse({ success: false, error: 'No data found for report' });
            }
        });
        return true; // Indicate asynchronous response
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed or Updated.');
});
