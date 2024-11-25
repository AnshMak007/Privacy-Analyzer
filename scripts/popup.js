document.addEventListener("DOMContentLoaded", () => {
    const analyzeButton = document.getElementById("analyzeButton");
    const downloadButton = document.getElementById("downloadButton");
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");

    if (!analyzeButton || !downloadButton || !errorMessage || !successMessage) {
        console.error("One or more elements are missing in the DOM.");
        return;
    }

    // Disable the download button initially
    downloadButton.disabled = true;

    // Add event listener for analysis button
    analyzeButton.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                console.log(`Active tab ID: ${tabs[0].id}, URL: ${tabs[0].url}`);
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { type: "analyzePage" },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.error("Error:", chrome.runtime.lastError.message);
                            displayErrorMessage("Failed to start analysis. Ensure content script is active.");
                            return;
                        }
        
                        if (response && response.success) {
                            console.log("Page analysis started successfully.");
                            downloadButton.disabled = false;
                            displaySuccessMessage("Analysis completed successfully. Ready to download report.");
                        } else {
                            console.error("Content script did not respond as expected.", response);
                            displayErrorMessage("Failed to analyze the page.");
                        }
                    }
                );
            } else {
                console.error("No active tab found.");
                displayErrorMessage("No active tab found. Please open a valid webpage.");
            }
        });        
    });

    // Add event listener for download button
    downloadButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "downloadReport" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error during report download:", chrome.runtime.lastError.message);
                displayErrorMessage("Failed to generate report.");
                return;
            }

            if (response && response.success) {
                console.log("Report downloaded successfully.");
                displaySuccessMessage("Report downloaded successfully.");
            } else {
                console.error("Report generation failed.", response);
                displayErrorMessage("Failed to generate report. Please try again.");
            }
        });
    });
});

// Function to display success messages
function displaySuccessMessage(message) {
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");

    if (errorMessage && successMessage) {
        errorMessage.style.display = "none";
        successMessage.innerText = message;
        successMessage.style.display = "block";
    }
}

// Function to display error messages
function displayErrorMessage(message) {
    const successMessage = document.getElementById("successMessage");
    const errorMessage = document.getElementById("errorMessage");

    if (successMessage && errorMessage) {
        successMessage.style.display = "none";
        errorMessage.innerText = message;
        errorMessage.style.display = "block";
    }
}
