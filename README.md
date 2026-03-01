# Budget Flow

A privacy-focused, offline-first personal finance application designed to help you project your financial future and manage cash flow effortlessly without relying on cloud services.

## Overview

Budget Flow moves beyond just tracking what you've spent; it helps you simulate your financial cash flow 30+ days into the future. By combining historical actual transactions with recurring projection rules, the app provides a real-time, mathematically accurate "Current Balance" that actively subtracts past-due bills and upcoming deductibles so you always know your "safe to spend" amount.

## Features

- **Offline-First Architecture**: Runs entirely client-side using standard HTML, CSS, and vanilla JS. Your financial data is securely stored within your browser's local storage—no servers required.
- **Dynamic Cash Flow Engine**: Calculates and visually graphs cash flow day-by-day with a customizable projection window (7-365 days).
- **Accurate Balance Reporting**: Provides a real-time "Working Balance" that safely subtracts today's scheduled payments and unpaid past-due items, while also providing your raw historical "Actual Balance".
- **Double-Counting Prevention**: Smart heuristic math uses a rolling tolerance window (e.g., +/- 14 days) to automatically prevent projecting duplicate expenses if you pay a recurring bill a few days early or late.
- **Monthly Budget Summaries**: Mathematically normalizes weekly, bi-weekly, and monthly recurring rules to give you a true apples-to-apples summary of your Monthly Net Cash Flow.
- **Portability**: Instantly download your full dataset into JSON format, allowing you to back it up or seamlessly move it between devices.
- **Capacitor Mobile Ready**: Built with responsive layouts and structural setup prepared for immediate compilation to iOS and Android utilizing Ionic Capacitor.

## Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS variables (No external frameworks or complex build steps)
- **Data Storage**: LocalStorage API
- **Visuals**: `Chart.js` (locally bundled) for cash flow graph projections
- **Mobile Packaging**: `Capacitor` configured out-of-the-box

## Getting Started

Because Budget Flow has zero backend dependencies, getting started is practically instantaneous.

### Running in the Browser

1. Clone this repository to your local machine:
    ```bash
    git clone https://github.com/your-username/budget-flow.git
    cd budget-flow
    ```
2. Navigate to the `app/www` directory.
3. Open `index.html` directly in your web browser, or launch it with a simple zero-config local HTTP server:
    ```bash
    npx serve -l 3000
    ```
4. Access the application at `http://localhost:3000`

### Building an App (Capacitor)

Budget Flow is pre-configured to be easily exported to native apps using Capacitor.

1. Install dependencies from the root directory:
    ```bash
    npm install
    ```
2. Sync the web assets over to Capacitor:
    ```bash
    npx cap sync
    ```
3. Open the project in your IDE of choice to build:
    ```bash
    npx cap open android
    # or
    npx cap open ios
    ```

## About

Built by Enoch Wright (enochwright.com)
