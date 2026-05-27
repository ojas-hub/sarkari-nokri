from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, UploadFile, File
from backend.ai.whisper import transcribe_file

router = APIRouter(prefix="/api/voice", tags=["voice"])
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    suffix = Path(file.filename or "audio.webm").suffix or ".webm"
    path = UPLOAD_DIR / f"{uuid4().hex}{suffix}"
    path.write_bytes(await file.read())
    try:
        return {"text": transcribe_file(str(path))}
    finally:
        path.unlink(missing_ok=True)
