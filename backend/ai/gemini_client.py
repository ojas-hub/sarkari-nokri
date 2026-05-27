import os
from functools import lru_cache


def _get_api_key() -> str | None:
    # Prefer the standard env var used by google-genai docs, but support common variants.
    return (
        os.getenv("GOOGLE_API_KEY")
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_GENAI_API_KEY")
    )


@lru_cache(maxsize=1)
def get_gemini_client():
    api_key = _get_api_key()
    if not api_key:
        return None

    from google import genai  # type: ignore

    return genai.Client(api_key=api_key)


def gemini_available() -> bool:
    return get_gemini_client() is not None


def generate_text(prompt: str, *, model: str = "gemini-2.5-flash") -> str:
    client = get_gemini_client()
    if client is None:
        raise RuntimeError("Gemini API key not configured (set GOOGLE_API_KEY).")
    resp = client.models.generate_content(model=model, contents=prompt)
    return (resp.text or "").strip()


def embed_texts(texts: list[str], *, model: str = "gemini-embedding-001") -> list[list[float]]:
    client = get_gemini_client()
    if client is None:
        raise RuntimeError("Gemini API key not configured (set GOOGLE_API_KEY).")
    resp = client.models.embed_content(model=model, contents=texts)
    # google-genai returns an object with embeddings list; each has a .values list of floats
    return [e.values for e in resp.embeddings]

