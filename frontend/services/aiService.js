const API_BASE = import.meta.env.VITE_API_BASE || '';

const stopWords = new Set('a an and are as at be by for from has have he her his i in is it its me my of on or our she that the their them they this to was we were will with you your'.split(' '));

function words(text = '') {
  return String(text).toLowerCase().match(/[a-z0-9#]+/g)?.filter(w => !stopWords.has(w)) || [];
}

function scoreNote(query, note) {
  const queryWords = words(query);
  const haystack = words(`${note.title || ''} ${note.body || ''} ${(note.tags || []).join(' ')} ${note.status || ''} ${note.type || ''}`);
  if (!queryWords.length || !haystack.length) return 0;
  const counts = new Map();
  haystack.forEach(w => counts.set(w, (counts.get(w) || 0) + 1));
  return queryWords.reduce((sum, word) => sum + (counts.get(word) || 0), 0);
}

function offlineSummary(text) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const sentences = clean.match(/[^.!?]+[.!?]*/g) || [];
  return (sentences.slice(0, 3).join(' ') || clean.slice(0, 240)).trim();
}

async function readJson(response) {
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function summarizeText(text) {
  if (!API_BASE) return { summary: offlineSummary(text) };
  return readJson(await fetch(`${API_BASE}/api/ai/summarize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }));
}

export async function semanticSearch(query, notes) {
  if (!API_BASE) {
    return {
      results: notes
        .map(note => ({ ...note, score: scoreNote(query, note) }))
        .filter(note => note.score > 0)
        .sort((a, b) => b.score - a.score),
    };
  }
  return readJson(await fetch(`${API_BASE}/api/ai/search`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, notes }) }));
}

export async function transcribeAudio(audioBlob) {
  if (!API_BASE) throw new Error('Voice transcription needs the optional local backend.');
  const form = new FormData();
  form.append('file', audioBlob, 'note.webm');
  return readJson(await fetch(`${API_BASE}/api/voice/transcribe`, { method: 'POST', body: form }));
}
