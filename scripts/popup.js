document.addEventListener("DOMContentLoaded", () => {
    const analyzeButton = document.getElementById("analyzeButton");
    const downloadButton = document.getElementById("downloadButton");
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");
    const loadingMessage = document.getElementById("loading");

    if (!analyzeButton || !downloadButton || !errorMessage || !successMessage || !loadingMessage) {
        console.error("One or more elements are missing in the DOM.");
        return;
    }

    // Initially disable the download button and hide messages
    downloadButton.disabled = true;
    hideMessages();

    // Add event listener for the Analyze button
    analyzeButton.addEventListener("click", () => {
        hideMessages(); // Clear existing messages
        displayLoadingMessage("Analyzing the webpage...");

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                console.log(`Sending analyzePage message to tab ID: ${tabs[0].id}`);
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { type: "analyzePage" },
                    (response) => {
                        hideLoadingMessage();

                        if (chrome.runtime.lastError) {
                            console.error("Error:", chrome.runtime.lastError.message);
                            displayErrorMessage("Failed to start analysis. Ensure the content script is active.");
                            return;
                        }

                        if (response && response.success) {
                            console.log("Page analysis completed successfully.");
                            downloadButton.disabled = false;
                            displaySuccessMessage("Analysis completed successfully. Ready to download the report.");
                        } else {
                            console.error("Unexpected response from content script:", response);
                            displayErrorMessage("Page analysis failed. Please try again.");
                        }
                    }
                );
            } else {
                console.error("No active tab found.");
                displayErrorMessage("No active tab found. Please open a valid webpage.");
                hideLoadingMessage();
            }
        });
    });

    // Add event listener for the Download Report button
    downloadButton.addEventListener("click", () => {
        hideMessages(); // Clear existing messages
        displayLoadingMessage("Generating the report...");

        // Send message to background.js to fetch the stored cookies and prepare the report
        chrome.runtime.sendMessage({ type: "generateReport" }, (response) => {
            hideLoadingMessage();

            if (chrome.runtime.lastError) {
                console.error("Error during report generation:", chrome.runtime.lastError.message);
                displayErrorMessage("Failed to generate the report.");
                return;
            }

            if (response && response.success) {
                console.log("Report generated successfully.");
                displaySuccessMessage("Report generated successfully.");
            } else {
                console.error("Report generation failed.", response);
                displayErrorMessage("Failed to generate the report. Please try again.");
            }
        });
    });
});

// Function to display success messages
function displaySuccessMessage(message) {
    hideMessages(); // Clear other messages
    const successMessage = document.getElementById("successMessage");
    if (successMessage) {
        successMessage.innerText = message;
        successMessage.style.display = "block";
    }
}

// Function to display error messages
function displayErrorMessage(message) {
    hideMessages(); // Clear other messages
    const errorMessage = document.getElementById("errorMessage");
    if (errorMessage) {
        errorMessage.innerText = message;
        errorMessage.style.display = "block";
    }
}

// Function to display loading message
function displayLoadingMessage(message) {
    const loadingMessage = document.getElementById("loading");
    if (loadingMessage) {
        loadingMessage.innerText = message;
        loadingMessage.style.display = "block";
    }
}

// Function to hide loading message
function hideLoadingMessage() {
    const loadingMessage = document.getElementById("loading");
    if (loadingMessage) {
        loadingMessage.style.display = "none";
    }
}

// Function to hide all messages
function hideMessages() {
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");
    const loadingMessage = document.getElementById("loading");

    if (errorMessage) errorMessage.style.display = "none";
    if (successMessage) successMessage.style.display = "none";
    if (loadingMessage) loadingMessage.style.display = "none";
}
