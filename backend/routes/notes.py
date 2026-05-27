from fastapi import APIRouter

router = APIRouter(prefix="/api/notes", tags=["notes"])

@router.get("/health")
def health():
    return {"status": "ok"}
