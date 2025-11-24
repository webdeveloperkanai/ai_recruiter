# Cehpoint AI Recruiter

## 🤖 Overview
**Cehpoint AI Recruiter** is an advanced, automated HR interview platform designed to streamline the initial screening process for candidates. Powered by Google's **Gemini Multimodal Live API**, it creates a real-time, human-like voice interview experience that assesses candidates based on technical knowledge, communication skills, and behavioral traits.

Instead of static forms or text chatbots, candidates engage in a **live voice conversation** with "Sarah," an AI recruiter who adapts her questions based on the candidate's responses.

---

## 🚀 Key Features

### 1. **Real-Time Multimodal AI**
*   **Voice-to-Voice Interaction**: Candidates speak naturally to the AI, and the AI responds instantly with synthesized speech.
*   **Low Latency**: Uses WebSocket technology for near-instantaneous responses, mimicking a real phone or video call.
*   **Dynamic Context**: The AI remembers previous answers and asks follow-up questions to validate depth of knowledge, rather than reading from a fixed script.

### 2. **Intelligent Assessment Engine**
*   **Role-Specific Evaluation**: Supports multiple job profiles (Marketing Executive, SDE Intern, Full Stack Developer), each with unique evaluation criteria and technical questions.
*   **Behavioral Monitoring**:
    *   **Silence Detection**: The system tracks long pauses. If a candidate is silent for too long (potential cheating or checking answers), they receive warnings ("Strikes"). Three strikes result in automatic failure.
    *   **Interruption Handling**: If the candidate constantly interrupts the AI, the system detects this and issues a behavioral warning.
*   **Time Management**: Enforces a strict 5-minute interview duration to test conciseness and time management.

### 3. **Automated Results & Logging**
*   **Instant Pass/Fail Decision**: The AI autonomously determines if a candidate is shortlisted based on the quality of their answers.
*   **Live Transcription**: A real-time transcript is generated on-screen and saved for review.
*   **Google Sheets Integration**: Interview results (Name, Role, Status, Notes, Transcript) are automatically pushed to a centralized Google Sheet for HR review.
*   **Downloadable Logs**: Candidates or HR can download a `.txt` file of the entire conversation immediately after the interview.

---

## 🛠️ How It Works

### Step 1: Candidate Onboarding
The candidate arrives at the landing page and enters their:
*   **Full Name**
*   **Target Position** (e.g., Software Developer)
*   **Preferred Language** (English, Hindi, Bengali)

### Step 2: The Interview (The Core)
*   The session connects to the Google Gemini Live API.
*   **Sarah (The AI)** introduces herself and begins the screening.
*   **Visualizers**: Real-time audio visualizers show when the user is speaking vs. when the AI is "thinking" or speaking.
*   **Subtitles**: Live captions appear to ensure accessibility.
*   **Defense Mechanism**: If the candidate stays silent for 8+ seconds, the AI prompts them. If it happens 3 times, the interview terminates.

### Step 3: Result & Data Sync
*   Once the interview ends (via timer or AI decision), the **Result Screen** appears.
*   **Pass**: The candidate sees a "Shortlisted" animation, followed by the CEO's direct contact line and HR email.
*   **Fail**: The candidate receives constructive feedback on why they didn't make the cut.
*   **Background Sync**: The application silently POSTs the interview data to a configured Google Sheet.

---

## 🏗️ Technical Architecture

*   **Frontend**: React 19, Vite, Tailwind CSS.
*   **AI Engine**: Google GenAI SDK (`@google/genai`) accessing the `gemini-2.5-flash-native-audio-preview-09-2025` model.
*   **Audio Processing**: Web Audio API for raw PCM audio streaming (16kHz input / 24kHz output).
*   **Backend (Data)**: Google Apps Script (acting as a serverless database for Google Sheets).
*   **Protocol**: WebSocket (via `ai.live.connect`) for bi-directional media streaming.

---

## 📋 Requirements
*   **Hardware**: Device with a working Microphone and Camera.
*   **Browser**: Modern Chrome, Edge, or Firefox (Web Audio API support required).
*   **Network**: Stable internet connection (WebSocket requires low packet loss).
*   **API Key**: A valid Google Gemini API Key with access to "Live" models.

## 📄 License
Internal proprietary tool for Cehpoint.
