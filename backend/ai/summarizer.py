from functools import lru_cache
from transformers import pipeline

MODEL_NAME = "t5-small"

@lru_cache(maxsize=1)
def get_summarizer():
    return pipeline("summarization", model=MODEL_NAME, tokenizer=MODEL_NAME)

def summarize_text(text):
    # Prefer Gemini if configured; fall back to local t5-small if not.
    try:
        from backend.ai.gemini_client import gemini_available, generate_text

        if gemini_available():
            cleaned = " ".join(str(text).split())
            if not cleaned:
                return ""
            prompt = (
                "Summarize the following text for an Indian government office user. "
                "Keep it concise, factual, and in the same language as the input.\n\n"
                f"TEXT:\n{cleaned[:12000]}"
            )
            return generate_text(prompt)
    except Exception:
        # If Gemini is misconfigured or temporarily failing, still allow local fallback.
        pass

    cleaned = " ".join(text.split())
    if not cleaned:
        return ""
    max_len = min(140, max(32, len(cleaned.split()) // 2))
    result = get_summarizer()(cleaned[:4000], max_length=max_len, min_length=20, do_sample=False)
    return result[0]["summary_text"].strip()
