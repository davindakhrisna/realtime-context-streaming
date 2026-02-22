from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import collection
from ws_manager import handle_audio_stream

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
