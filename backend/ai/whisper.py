from functools import lru_cache
import whisper

MODEL_NAME = "base"

@lru_cache(maxsize=1)
def get_whisper_model():
    return whisper.load_model(MODEL_NAME)

def transcribe_file(path):
    result = get_whisper_model().transcribe(path)
    return result.get("text", "").strip()
