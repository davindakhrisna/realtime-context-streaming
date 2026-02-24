from llama_cpp import Llama
from llama_cpp.llama_chat_format import MoondreamChatHandler
import os
import base64

model = None
chat_handler = None

def load_model():
    global model, chat_handler

    current_dir = os.path.dirname(os.path.abspath(__file__))
    base_path = os.path.join(current_dir, "models")

    model_path = os.path.join(base_path, "moondream2-text-model-f16_ct-vicuna.gguf")
    projector_path = os.path.join(base_path, "moondream2-mmproj-f16-20250414.gguf")

    print(f"🔍 Looking for models in: {base_path}", flush=True)
    print(f"   Text model exists: {os.path.exists(model_path)}", flush=True)
    print(f"   Vision adapter exists: {os.path.exists(projector_path)}", flush=True)

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Main model not found: {model_path}")
    if not os.path.exists(projector_path):
        raise FileNotFoundError(f"Vision adapter not found: {projector_path}")

    print(f"⏳ Loading Moondream chat handler...", flush=True)
    chat_handler = MoondreamChatHandler(
        clip_model_path=projector_path,
        verbose=False
    )

    print(f"⏳ Loading Llama model (trying GPU first)...", flush=True)
    
    # Try GPU first, fall back to CPU if it fails
    try:
        model = Llama(
            model_path=model_path,
            chat_handler=chat_handler,
            n_ctx=2048,
            n_gpu_layers=-1,  # Offload all layers to GPU
            verbose=False
        )
        print(f"✅ Model loaded on GPU successfully", flush=True)
    except Exception as e:
        print(f"⚠️ GPU loading failed ({e}), falling back to CPU...", flush=True)
        model = Llama(
            model_path=model_path,
            chat_handler=chat_handler,
            n_ctx=2048,
            n_gpu_layers=0,  # CPU only
            verbose=False
        )
        print(f"✅ Model loaded on CPU", flush=True)
    
    return model

def analyze_image(image_bytes: bytes, prompt: str = "Describe this image."):
    if model is None:
        raise Exception("Vision model not loaded")

    # Convert image to base64 data URI
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
    data_uri = f"data:image/png;base64,{image_base64}"

    # Use chat completion with Moondream handler
    output = model.create_chat_completion(
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": data_uri}},
                    {"type": "text", "text": prompt}
                ]
            }
        ],
        max_tokens=512,
        temperature=0.1
    )

    return output["choices"][0]["message"]["content"].strip()
