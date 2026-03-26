"""
FastAPI application: file upload + SSE streaming endpoint.
"""

from __future__ import annotations
import os
import uuid
import logging

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import UPLOAD_DIR
from .agent import run_agent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("chartly.api")

app = FastAPI(title="Chartly API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/api/analyze")
async def analyze(
    file: UploadFile = File(...),
    goal: str = Form(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="未提供文件")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("xlsx", "xls", "csv"):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx, .xls, .csv 文件")

    session_id = uuid.uuid4().hex[:12]
    safe_name = f"{session_id}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_name)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    logger.info("File uploaded: %s (%d bytes), goal: %s", safe_name, len(content), goal[:100])

    async def event_stream():
        try:
            async for event in run_agent(
                user_goal=goal,
                filename=file.filename,
                filepath=filepath,
            ):
                yield event
        except Exception as e:
            logger.exception("Stream error")
            import json
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)}, ensure_ascii=False)}\n\n"

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
    return {"status": "ok", "service": "chartly"}
