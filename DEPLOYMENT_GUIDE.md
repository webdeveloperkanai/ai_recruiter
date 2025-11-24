# Deployment Guide: Cehpoint AI Recruiter

This guide outlines the steps to deploy the Cehpoint AI Recruiter application to **Vercel**. This application uses React, Vite, and the Google GenAI SDK (Gemini Multimodal Live API).

## 1. Prerequisites

Before you begin, ensure you have the following:

1.  **GitHub Account**: You need a repository to host your code.
2.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com) (you can log in with GitHub).
3.  **Google Gemini API Key**: A valid API key from [Google AI Studio](https://aistudio.google.com/).
    *   *Note: Ensure your API key has access to the `gemini-2.5-flash-native-audio-preview-09-2025` model.*

## 2. Local Preparation

Before uploading your code, verify it builds correctly on your machine.

1.  **Install Dependencies**:
    Open your terminal in the project folder and run:
    ```bash
    npm install
    ```

2.  **Check for Build Errors**:
    Run the build command to ensure TypeScript compiles without issues:
    ```bash
    npm run build
    ```
    *If this command fails, fix the errors shown in the terminal before proceeding.*

3.  **Git Setup**:
    If you haven't already initialized a git repository:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```

4.  **Push to GitHub**:
    Create a new repository on GitHub and push your code there.

## 3. Deploying to Vercel

1.  **Dashboard**: Log in to your Vercel Dashboard.
2.  **New Project**: Click **"Add New..."** -> **"Project"**.
3.  **Import Git Repository**: Find your `cehpoint-ai-recruiter` repository in the list and click **"Import"**.

## 4. Project Configuration (Crucial Step)

In the "Configure Project" screen, ensure the following settings:

*   **Framework Preset**: Vercel should automatically detect **Vite**. If not, select "Vite" from the dropdown.
*   **Root Directory**: `./` (default).
*   **Build Command**: `npm run build` (default).
*   **Output Directory**: `dist` (default).

### **Environment Variables** (Most Important)

You must add your Google API Key here so the app can access Gemini.

1.  Expand the **"Environment Variables"** section.
2.  Add the variable:
    *   **Key**: `API_KEY`
    *   **Value**: `your_actual_google_api_key_starts_with_AIza...`
3.  Click **Add**.

*Why this works:* The `vite.config.ts` file in this project is configured to read this environment variable during the build process and embed it securely into the application code.

## 5. Finalize Deployment

1.  Click **"Deploy"**.
2.  Wait for the build to complete (usually 30-60 seconds).
3.  Once finished, you will see a "Congratulations!" screen with a screenshot of your app.
4.  Click the **Preview** image to open your live URL (e.g., `https://cehpoint-ai-recruiter.vercel.app`).

## 6. Troubleshooting & Common Issues

### Issue: "Connection Lost" or WebSocket Errors
*   **Cause**: The API Key might be missing or invalid.
*   **Fix**: Go to Vercel Dashboard -> Settings -> Environment Variables. Check if `API_KEY` is set. If you change it, you must go to the **Deployments** tab and **Redeploy** for the change to take effect.

### Issue: Microphone/Camera Permissions Denied
*   **Cause**: The browser blocks permissions on insecure (HTTP) sites.
*   **Fix**: Vercel provides HTTPS automatically. Ensure you are accessing the site via `https://...`. Check your browser address bar for the lock icon.

### Issue: "ReferenceError: process is not defined"
*   **Cause**: The code is trying to access `process.env` directly in the browser without Vite replacing it.
*   **Fix**: This project is already patched for this. The `vite.config.ts` file contains:
    ```typescript
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    ```
    Ensure you haven't removed this configuration.

### Issue: Transcription Not Appearing
*   **Cause**: Network firewall or API model limitations.
*   **Fix**:
    1.  Ensure your network allows WebSocket connections (wss://).
    2.  Verify in Google AI Studio that your API Key is valid and billing is enabled if you are hitting quota limits.

## 7. Post-Deployment Logic
This application uses the **Gemini Multimodal Live API**. This is a real-time WebSocket connection.
*   **Usage Costs**: Be aware that streaming audio/video to Gemini incurs costs based on session duration.
*   **Security**: While your API key is hidden from the source code repository via `.env`, it is technically embedded in the frontend build. For a production enterprise app, you should proxy these calls through a backend server. For this prototype/demo, the current setup is standard.
