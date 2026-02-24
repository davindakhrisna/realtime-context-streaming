from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import collection
from ws_manager import handle_audio_stream
from vision import load_model
import asyncio

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # TanStack Start default
        "http://127.0.0.1:3000",
        "http://localhost:5173",  # Vite default (just in case)
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# LLM Startup
@app.on_event("startup")
async def startup_event():
    try:
        import traceback
        print("🚀 Starting vision model load...", flush=True)
        load_model()
        print("✅ Vision model + Adapter loaded successfully", flush=True)
    except Exception as e:
        print(f"❌ Vision model failed: {e}", flush=True)
        print(f"📋 Full Traceback:", flush=True)
        print(traceback.format_exc(), flush=True)

# Vector DB
class Item(BaseModel):
    id: str
    text: str

@app.post("/add")
def add_item(item: Item):
    collection.add(documents=[item.text], ids=[item.id])
    return {"status": "added"}

@app.post("/query")
def query_items(text: str, n: int = 5):
    return collection.query(query_texts=[text], n_results=n)

# STT Websocket
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await handle_audio_stream(websocket)

# Moondream
@app.post("/analyze")
async def analyze_endpoint(file: UploadFile = File(...), prompt: str = "Describe this image."):
    try:
        contents = await file.read()
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, analyze_image, contents, prompt)
        return {"result": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
