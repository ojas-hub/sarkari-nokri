from functools import lru_cache
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"

@lru_cache(maxsize=1)
def get_embedding_model():
    return SentenceTransformer(MODEL_NAME)

def encode_texts(texts):
    # Prefer Gemini embeddings if configured; fall back to local sentence-transformers if not.
    try:
        from backend.ai.gemini_client import gemini_available, embed_texts

        if gemini_available():
            return embed_texts([str(t) for t in texts])
    except Exception:
        pass

    model = get_embedding_model()
    return model.encode(texts, normalize_embeddings=True)
