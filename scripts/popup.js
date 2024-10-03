document.addEventListener('DOMContentLoaded', function() {
    let analyzePageBtn = document.getElementById('analyzePage');
    let downloadReportBtn = document.getElementById('downloadReport');

    // Initially disable the download report button
    downloadReportBtn.disabled = true;

    // Analyze page button click
    analyzePageBtn.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'analyzePage' }, function(response) {
                if (response && response.analysisComplete) {
                    // Enable the download button after analysis is complete
                    downloadReportBtn.disabled = false;
                    console.log('Page analysis complete');
                } else {
                    console.error('Failed to analyze the page.');
                }
            });
        });
    });

    // Download report button click
    downloadReportBtn.addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'requestDetailedReport' }, function(response) {
                if (response && response.report) {
                    downloadReport(response.report);
                } else {
                    console.error('Failed to get the report.');
                }
            });
        });
    });
});

// Function to download the report as a text file
function downloadReport(reportData) {
    const blob = new Blob([reportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'privacy_analysis_report.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
