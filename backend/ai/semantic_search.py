import numpy as np
from .embeddings import encode_texts

def note_text(note):
    parts = [note.get("title", ""), note.get("body", ""), " ".join(note.get("tags", [])), note.get("status", ""), note.get("type", "")]
    return "\n".join(part for part in parts if part)

def search_notes(query, notes, limit=12):
    if not query.strip() or not notes:
        return []
    documents = [note_text(note) or note.get("title", "Untitled") for note in notes]
    vectors = encode_texts([query] + documents)
    query_vec = vectors[0]
    doc_vecs = vectors[1:]
    scores = np.dot(doc_vecs, query_vec)
    ranked = np.argsort(scores)[::-1][:limit]
    return [{"id": notes[i]["id"], "score": float(scores[i]), "title": notes[i].get("title", "Untitled")} for i in ranked]
