from pydantic import BaseModel, Field
from fastapi import APIRouter
from typing import Any
from backend.ai.semantic_search import search_notes
from backend.ai.summarizer import summarize_text

router = APIRouter(prefix="/api/ai", tags=["ai"])

class SummaryRequest(BaseModel):
    text: str

class TranslateRequest(BaseModel):
    text: str
    target_lang: str = "en"  # "en" or "hi" (or any ISO-like label Gemini can follow)

class SearchRequest(BaseModel):
    query: str
    notes: list[dict[str, Any]] = Field(default_factory=list)

@router.post("/summarize")
def summarize(payload: SummaryRequest):
    return {"summary": summarize_text(payload.text)}

@router.post("/translate")
def translate(payload: TranslateRequest):
    # Translate via Gemini when available; otherwise do a simple passthrough message.
    try:
        from backend.ai.gemini_client import gemini_available, generate_text

        if gemini_available():
            cleaned = " ".join(payload.text.split())
            if not cleaned:
                return {"text": ""}
            prompt = (
                f"Translate the following text to {payload.target_lang}. "
                "Preserve meaning, names, numbers, and office tone.\n\n"
                f"TEXT:\n{cleaned[:12000]}"
            )
            return {"text": generate_text(prompt)}
    except Exception:
        pass

    return {"text": payload.text}

@router.post("/search")
def semantic_search(payload: SearchRequest):
    return {"results": search_notes(payload.query, payload.notes)}
