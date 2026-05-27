from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.ai import router as ai_router
from backend.routes.voice import router as voice_router
from backend.routes.notes import router as notes_router

app = FastAPI(title="Sarkari Office Local Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes_router)
app.include_router(ai_router)
app.include_router(voice_router)

@app.get("/")
def root():
    return {"app": "Sarkari Office Local Engine", "status": "ready"}
