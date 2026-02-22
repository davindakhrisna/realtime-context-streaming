# Realtime Context Streaming

## Setup

Server :

```bash
cd server

uv sync
uv run fastapi dev
```

Client :

```bash
cd client

pnpm install
pnpm dev
```

Download Model :

<https://huggingface.co/ggml-org/moondream2-20250414-GGUF/tree/main>
Download both files and copy them to the `/models` under the server folder

or

```bash
pip install -U huggingface_hub

hf download ggml-org/moondream2-20250414-GGUF moondream2-text-model-f16_ct-vicuna.gguf --local-dir models
hf download ggml-org/moondream2-20250414-GGUF moondream2-mmproj-f16-20250414.gguf --local-dir models
```
