document.addEventListener('DOMContentLoaded', function() {
    let analyzePageBtn = document.getElementById('analyzePage');
    let downloadReportBtn = document.getElementById('downloadReport');

    // Initially disable the download report button
    downloadReportBtn.disabled = true;

    // Analyze page button click
    analyzePageBtn.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'analyzePage' }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);  // Log any errors from the messaging system
                    return;
                }
                if (response && response.analysisComplete) {
                    downloadReportBtn.disabled = false;  // Enable the download button once analysis is complete
                    console.log('Page analysis complete');
                } else {
                    console.error('Failed to analyze the page.');
                }
            });
        });
    });

    // Download report button click
    downloadReportBtn.addEventListener('click', function() {
        // Send a message to the background script (analysis.js) to generate the report
        chrome.runtime.sendMessage({ type: 'requestDetailedReport' }, function(response) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError.message);
                return;
            }
    
            if (response && response.report) {
                // Create a Blob and trigger the download
                const blob = new Blob([response.report], { type: 'text/html' });
                const url = window.URL.createObjectURL(blob);
    
                const a = document.createElement('a');
                a.href = url;
                a.download = 'privacy_analysis_report.html';
                a.click();
                window.URL.revokeObjectURL(url);
    
                console.log('Report downloaded successfully.');
            } else {
                console.error('Failed to generate or download the report.');
            }
        });
    });
});
