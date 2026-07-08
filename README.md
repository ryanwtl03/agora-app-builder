# Agora App Builder - myAgora Project

This directory contains an **Agora App Builder** project named **myAgora**. Agora App Builder allows you to quickly generate, customize, and deploy real-time voice and video applications across Web, Android, iOS, Windows, macOS, and Linux from a single codebase.

---

## 🚀 How to Run the Project

### 1. Stup The FastAPI

```bash
uv pip install -r requirements.txt

uv run main.py # this will run the app via uvicorn at port 8000
```

### 2. Setup The App

Follow the Readme.txt in the Agora App Builder code, install and start the agora app building.
```bash
npm i && npm start
# Select `Install` after npm start
```
- > In the first build, choose `Install` and let it download the complete codebase.

### 2. Access The App

Access the app everytime by letting it open the Agora UI at `localhost:9000`.
```bash
npm start
```
- > Proceed only after finish downloading the codebase
- > Choose `Build` > `Web` and access Agora Video Call UI at `localhost:9000`

---

## 📂 Project Structure

```bash
v2\myAgora\agora-app-builder\myagora # the main app
v2/myAgora/agora-app-builder/myagora/src/subComponents/caption/SummarizerPanel.tsx # UI panel for the AI Summarizer
v2/myAgora/agora-app-builder/myagora/src/subComponents/caption/useSummaryDownload.ts # Markdown summary download logic for web
v2/myAgora/agora-app-builder/myagora/src/subComponents/caption/useSummaryDownload.native.ts # Markdown summary download logic for native/mobile
v2/myAgora/agora-app-builder/myagora/src/subComponents/caption/useCaption.tsx # Integrate summarizer into `CaptionContext` interface
v2/myAgora/agora-app-builder/myagora/src/components/Controls.tsx # Integrate summarizer into list of `actionMenuitems` during meeting
v2/myAgora/agora-app-builder/myagora/src/pages/video-call/VideoCallScreen.tsx # Import SummarizerPanel in left side the video call
v2/myAgora/agora-app-builder/myagora/src/subComponents/caption/utils.ts # Handle and set up the transcript for the AI summarizer API
```

---

## ✅ What is Currently Working

- **Developed AI Meeting Note Summarizer** using Agora RTC SDK for the video call
- **Using Agora STT product** to obtain the transcript
- **Able to connect** to Agora's real-time capabilities successfully
- **Able to generate** the summary using Gemini AI using custom backend endpoints in FastAPI


---

## 🛠️ What is Not Yet Completed / Next Improvements

The prototype is developed based on the requirements, nothing extra.
The next improvement can be:
- include different summarizing style of meeting note
- support different languages
- save or send the meeting via email and in the database