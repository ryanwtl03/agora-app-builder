import os
import base64
import time
import logging
from typing import List, Optional
from pydantic import BaseModel
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agora_stt_backend")

# Load environment variables
load_dotenv()

AGORA_APP_ID = os.getenv("AGORA_APP_ID")
AGORA_APP_CERTIFICATE = os.getenv("AGORA_APP_CERTIFICATE")
AGORA_CUSTOMER_ID = os.getenv("AGORA_CUSTOMER_ID")
AGORA_CUSTOMER_SECRET = os.getenv("AGORA_CUSTOMER_SECRET")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not AGORA_APP_ID:
    logger.warning("AGORA_APP_ID environment variable is missing!")
if not AGORA_APP_CERTIFICATE:
    logger.warning("AGORA_APP_CERTIFICATE environment variable is missing!")
if not AGORA_CUSTOMER_ID:
    logger.warning("AGORA_CUSTOMER_ID environment variable is missing (Required for STT REST API)!")
if not AGORA_CUSTOMER_SECRET:
    logger.warning("AGORA_CUSTOMER_SECRET environment variable is missing (Required for STT REST API)!")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY environment variable is missing!")

app = FastAPI(title="Agora Video STT & Gemini API Backend")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import token builder components
try:
    from agora_token_builder.RtcTokenBuilder import RtcTokenBuilder, Role_Publisher
except ImportError:
    logger.error("Failed to import RtcTokenBuilder from agora_token_builder.")
    RtcTokenBuilder = None

# In-memory store for active STT tasks
# Key: channelName, Value: agent_id
active_stt_agents = {}

# Schema for STT Requests
class STTRequest(BaseModel):
    channelName: str

# Schema for Token Requests
class TokenRequest(BaseModel):
    channelName: str
    uid: int
    role: int

@app.post("/api/token")
async def get_token(req: TokenRequest):
    if not AGORA_APP_ID or not AGORA_APP_CERTIFICATE:
        raise HTTPException(status_code=500, detail="Agora App ID or App Certificate is not configured on the server.")
    
    # Map role integer
    role = req.role # 1 for Publisher, 2 for Subscriber
    privilege_expired_ts = int(time.time()) + 3600
    
    try:
        token = RtcTokenBuilder.buildTokenWithUid(
            AGORA_APP_ID,
            AGORA_APP_CERTIFICATE,
            req.channelName,
            req.uid,
            role,
            privilege_expired_ts
        )
        return {
            "token": token,
            "uid": req.uid,
            "channelName": req.channelName,
            "expiresAt": privilege_expired_ts
        }
    except Exception as e:
        logger.exception("Error generating RTC token")
        raise HTTPException(status_code=500, detail=f"Token generation failed: {str(e)}")

@app.post("/api/stt/start")
async def start_stt(req: STTRequest):
    if not AGORA_APP_ID or not AGORA_APP_CERTIFICATE:
        raise HTTPException(
            status_code=500,
            detail="Agora App ID or App Certificate is missing on the server configuration."
        )
    if not AGORA_CUSTOMER_ID or not AGORA_CUSTOMER_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Agora Customer ID or Customer Secret is missing. Please configure them in .env (obtained from Account Management -> RESTful API in the Agora Console)."
        )
    
    channel_name = req.channelName
    if channel_name in active_stt_agents:
        return {
            "message": "STT task already running for this channel.",
            "agent_id": active_stt_agents[channel_name]["agent_id"],
            "sub_bot_uid": active_stt_agents[channel_name]["sub_bot_uid"]
        }
        
    # Standard STT Bot UID
    bot_uid = 88222
    privilege_expired_ts = int(time.time()) + 3600
    
    # Generate token for the bot
    bot_token = RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        channel_name,
        bot_uid,
        Role_Publisher,
        privilege_expired_ts
    )
    
    # Basic Auth credentials using Customer ID and Customer Secret
    credentials = f"{AGORA_CUSTOMER_ID}:{AGORA_CUSTOMER_SECRET}"
    b64_credentials = base64.b64encode(credentials.encode()).decode()
    
    headers = {
        "Authorization": f"Basic {b64_credentials}",
        "Content-Type": "application/json"
    }
    
    url = f"https://api.agora.io/api/speech-to-text/v1/projects/{AGORA_APP_ID}/join"
    
    payload = {
        "languages": ["en-US"],
        "name": f"stt-{channel_name}",
        "maxIdleTime": 120,
        "rtcConfig": {
            "channelName": channel_name,
            "subBotUid": str(bot_uid),
            "subBotToken": bot_token,
            "pubBotUid": str(bot_uid),
            "pubBotToken": bot_token,
            "enableJsonProtocol": True  # Pushes compressed JSON instead of binary Protobuf
        }
    }
    
    logger.info(f"Starting STT task for channel: {channel_name} with bot UID: {bot_uid}")
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code != 200:
            logger.error(f"Agora STT API error. Code: {response.status_code}, Body: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Agora STT Service returned error: {response.text}"
            )
        
        data = response.json()
        agent_id = data.get("agent_id")
        if not agent_id:
            raise HTTPException(
                status_code=500,
                detail="Agora STT join request did not return an agent_id."
            )
            
        active_stt_agents[channel_name] = {
            "agent_id": agent_id,
            "sub_bot_uid": bot_uid
        }
        
        logger.info(f"STT task started successfully. Agent ID: {agent_id}")
        return {
            "message": "STT task started successfully.",
            "agent_id": agent_id,
            "sub_bot_uid": bot_uid
        }
    except requests.exceptions.RequestException as e:
        logger.exception("Network error while connecting to Agora STT REST API")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to communicate with Agora STT REST API: {str(e)}"
        )

@app.post("/api/stt/stop")
async def stop_stt(req: STTRequest):
    if not AGORA_APP_ID or not AGORA_APP_CERTIFICATE:
        raise HTTPException(
            status_code=500,
            detail="Agora App ID or App Certificate is missing on the server configuration."
        )
    if not AGORA_CUSTOMER_ID or not AGORA_CUSTOMER_SECRET:
        raise HTTPException(
            status_code=500,
            detail="Agora Customer ID or Customer Secret is missing."
        )
        
    channel_name = req.channelName
    if channel_name not in active_stt_agents:
        raise HTTPException(
            status_code=404,
            detail=f"No active STT task found for channel: {channel_name}"
        )
        
    task_info = active_stt_agents[channel_name]
    agent_id = task_info["agent_id"]
    
    # Basic Auth credentials using Customer ID and Customer Secret
    credentials = f"{AGORA_CUSTOMER_ID}:{AGORA_CUSTOMER_SECRET}"
    b64_credentials = base64.b64encode(credentials.encode()).decode()
    
    headers = {
        "Authorization": f"Basic {b64_credentials}",
        "Content-Type": "application/json"
    }
    
    url = f"https://api.agora.io/api/speech-to-text/v1/projects/{AGORA_APP_ID}/agents/{agent_id}/leave"
    
    logger.info(f"Stopping STT task for channel: {channel_name}, Agent ID: {agent_id}")
    try:
        response = requests.post(url, headers=headers, timeout=15)
        active_stt_agents.pop(channel_name, None)
        
        if response.status_code != 200:
            logger.error(f"Agora STT leave API error. Code: {response.status_code}, Body: {response.text}")
            return {
                "message": "STT task stopped locally, but remote API reported error.",
                "api_response": response.text
            }
            
        return {"message": "STT task stopped successfully."}
    except requests.exceptions.RequestException as e:
        logger.exception("Network error while connecting to Agora STT REST API")
        return {
            "message": "STT task stopped locally, but network error occurred while stopping remotely.",
            "error": str(e)
        }

# Schema for Summary Request
class SummaryRequest(BaseModel):
    transcript: str

@app.post("/api/summary")
async def generate_summary(req: SummaryRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Gemini API Key is missing on the server configuration."
        )
    
    if not req.transcript.strip():
        return {"summary": "No transcript content available to summarize."}
        
    # Construct the query endpoint for Gemini 2.5 Flash
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    prompt = (
        "You are an expert AI meeting assistant. Analyze the following transcript of a video call "
        "and generate clean, beautifully structured meeting notes in Markdown.\n\n"
        "Include these sections:\n"
        "1. 📌 **Executive Summary**: A concise paragraph summary of the meeting.\n"
        "2. 💡 **Key Topics & Discussions**: Bulleted highlights of the core topics, decisions made, or insights.\n"
        "3. 🏁 **Action Items**: A clear task list with designated owners (or generic roles if owners are unnamed).\n\n"
        "Be professional, clear, and high-fidelity based only on the provided transcript.\n\n"
        f"Transcript:\n{req.transcript}"
    )
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }
    
    try:
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
        if response.status_code != 200:
            logger.error(f"Gemini API error. Code: {response.status_code}, Body: {response.text}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Gemini API returned error: {response.text}"
            )
            
        data = response.json()
        try:
            summary_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return {"summary": summary_text}
        except (KeyError, IndexError) as parse_error:
            logger.error(f"Failed to parse Gemini response structure: {response.text}")
            raise HTTPException(
                status_code=500,
                detail="Failed to parse the summary from Gemini response format."
            )
            
    except requests.exceptions.RequestException as e:
        logger.exception("Network error while connecting to Gemini API")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to communicate with Gemini API: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)