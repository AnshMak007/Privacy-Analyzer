# Privacy Analysis Chrome Extension

## Overview

The **Privacy Analysis Chrome Extension** helps users analyze web pages for potential security threats by detecting malicious scripts, cookies, and trackers. It fetches a list of known malicious indicators and compares them with the resources loaded on the current page. This extension aims to enhance users' privacy and security while browsing the web.

## Features

- **Script Detection**: Identifies all scripts loaded on a webpage and checks them against a list of known malicious indicators.
- **Cookie Analysis**: Inspects cookies for security attributes such as `Secure` and `HttpOnly`.
- **Tracker Detection**: Lists third-party trackers present on the page.
- **Detailed Reports**: Generates an HTML report summarizing the analysis results, including detected scripts, cookies, and trackers.

## Installation

1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** by toggling the switch in the top right corner.
4. Click on **Load unpacked** and select the directory containing the extension files.
5. The extension will be added to your browser, and you can begin using it.

## Usage

1. Click on the extension icon in the Chrome toolbar.
2. The extension will analyze the current page for scripts, cookies, and trackers.
3. A detailed report will be generated and displayed as an HTML document.
4. Review the findings to identify any potential threats or privacy concerns.

## Files Structure

- `manifest.json`: Configuration file for the extension, including permissions and background scripts.
- `background.js`: The background script that handles fetching data, analyzing the page, and generating reports.
- `maliciousIndicators.json`: A JSON file containing known malicious indicators used for comparison during analysis.
- `content.js`: Content script injected into web pages for analysis.
- `popup.html`: The HTML file for the extension’s user interface (if applicable).

## Acknowledgments

- Thanks to [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/mv3/) for providing detailed guidance on developing Chrome extensions.
- The malicious indicators list is based on publicly available data to help enhance user security.
