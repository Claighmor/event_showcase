# Gemini Realtime Voice Agent POC

This is a "vibe coding" proof-of-concept for a voice-first agent using the Gemini Multimodal Live API.

## Setup

1.  Get a Gemini API Key from [Google AI Studio](https://aistudio.google.com/).
2.  Create a `.env.local` file in the root directory:
    ```
    NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
4.  Navigate to `/agent` to use the Voice Agent.

## Features

- **Voice Interaction**: Speak to the agent and hear responses.
- **Tools**:
    - `get_current_time`: Asks for the time.
    - `get_directions`: Asks for directions (opens Google Maps).
    - `web_search`: Searches the web.
- **Visualizer**: See the audio waveform.
- **Logs**: See what the agent is doing.

## Architecture

- **Frontend**: Next.js + React
- **Audio**: Native Web Audio API (Recorder & Player)
- **Transport**: WebSocket (Gemini Multimodal Live API)

