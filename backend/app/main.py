"""
FastAPI application — file upload + SSE streaming endpoint.
"""

import os
import uuid
import logging

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import UPLOAD_DIR
from .agent import run_agent
from .protocol import StreamEvent, EventType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Chartly — AI Data Analysis Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}


@app.post("/api/analyze")
async def analyze(
    file: UploadFile = File(...),
    goal: str = Form(...),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    file_id = uuid.uuid4().hex[:12]
    save_name = f"{file_id}{ext}"
    save_path = os.path.join(UPLOAD_DIR, save_name)

    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    logger.info(f"Uploaded file saved: {save_path} ({len(content)} bytes)")

    async def event_stream():
        try:
            async for event in run_agent(user_goal=goal, file_path=save_path):
                yield event.to_sse()
        except Exception as e:
            logger.error(f"Agent error: {e}")
            yield StreamEvent(type=EventType.ERROR, content=str(e)).to_sse()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}
