document.addEventListener("DOMContentLoaded", () => {
    const analyzeButton = document.getElementById("analyzeButton");
    const downloadButton = document.getElementById("downloadButton");
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");

    if (!analyzeButton || !downloadButton || !errorMessage || !successMessage) {
        console.error("One or more elements are missing in the DOM.");
        return;
    }

    // Initially disable the download button
    downloadButton.disabled = true;

    analyzeButton.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                console.log("Sending message to content script to start analysis.");

                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { type: "analyzePage" },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("Error:", chrome.runtime.lastError.message);
                            displayErrorMessage("Failed to start analysis on the current page.");
                            return;
                        }

                        if (response && response.success) {
                            console.log("Page analysis started successfully.");
                            downloadButton.disabled = false; // Enable the download button
                            displaySuccessMessage("Analysis completed successfully. Ready to download report.");
                        } else {
                            console.error("Content script did not respond as expected.", response);
                            displayErrorMessage("Failed to receive response from content script.");
                        }
                    }
                );
            } else {
                console.error("No active tab found.");
                displayErrorMessage("No active tab found. Please open a page to analyze.");
            }
        });
    });

    downloadButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "downloadReport" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Download error:", chrome.runtime.lastError.message);
                displayErrorMessage("Failed to generate report.");
                return; // Ensure we exit if there's an error
            }

            if (response && response.success) {
                console.log("Report downloaded successfully.");
                displaySuccessMessage("Report downloaded successfully.");
            } else {
                console.error("Report download failed:", response);
                displayErrorMessage("Report download failed.");
            }
        });
    });
});

// Helper functions
function displaySuccessMessage(message) {
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");

    if (errorMessage && successMessage) {
        errorMessage.style.display = "none";
        successMessage.innerText = message;
        successMessage.style.display = "block";
    }
}

function displayErrorMessage(message) {
    const successMessage = document.getElementById("successMessage");
    const errorMessage = document.getElementById("errorMessage");

    if (successMessage && errorMessage) {
        successMessage.style.display = "none";
        errorMessage.innerText = message;
        errorMessage.style.display = "block";
    }
}
