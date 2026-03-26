"""
FastAPI application: file upload + SSE streaming endpoint.
Supports both multipart form upload and JSON (base64) for Vercel compatibility.
"""

from __future__ import annotations
import base64
import os
import uuid
import logging

from fastapi import FastAPI, UploadFile, File, Form, Request, HTTPException
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
async def analyze(request: Request):
    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        data = await request.json()
        goal = data.get("goal", "")
        filename = data.get("filename", "data.xlsx")
        file_b64 = data.get("file", "")

        if not goal or not file_b64:
            raise HTTPException(status_code=400, detail="Missing goal or file")

        file_content = base64.b64decode(file_b64)
    else:
        form = await request.form()
        goal = form.get("goal", "")
        file_field = form.get("file")

        if not goal or not file_field:
            raise HTTPException(status_code=400, detail="Missing goal or file")

        filename = file_field.filename or "data.xlsx"
        file_content = await file_field.read()

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("xlsx", "xls", "csv"):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx, .xls, .csv 文件")

    session_id = uuid.uuid4().hex[:12]
    safe_name = f"{session_id}_{filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_name)

    with open(filepath, "wb") as f:
        f.write(file_content)

    logger.info("File uploaded: %s (%d bytes), goal: %s", safe_name, len(file_content), goal[:100])

    async def event_stream():
        try:
            async for event in run_agent(
                user_goal=goal,
                filename=filename,
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
