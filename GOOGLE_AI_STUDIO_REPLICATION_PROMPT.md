# Sarkari Office Suite — Full Replication Brief for Google AI Studio

**How to use this file:** Copy everything below the line `--- BEGIN PROMPT ---` into Google AI Studio (or Gemini) and ask it to **generate the complete project from scratch** following this specification. You can also attach this file directly if the UI supports file upload.

**Goal:** Recreate a government-office web app for Hindi typing, document templates, PDF tools, and an optional local AI backend (summarize, semantic search, voice transcription). The UI should feel like a clean Indian government workspace (saffron/green/navy accents, Devanagari-friendly).

---

## BEGIN PROMPT ---

You are an expert full-stack developer. Build a complete, runnable project named **Sarkari Office Suite** exactly as specified below. Use **React 18+**, **Vite**, **pdf-lib**, **@pdf-lib/fontkit**, **jszip**, and an optional **FastAPI** Python backend. Do not use placeholder “lorem ipsum” UIs—implement working features.

---

## 1. Project identity

| Field | Value |
|--------|--------|
| Name | Sarkari Office Suite |
| Tagline | Hindi Typing + PDF Suite |
| Primary language | Hindi (Devanagari) + English UI labels |
| Target users | Government office staff, clerks, typists |
| Deployment | Static frontend (`npm run build` → `dist/`); optional Python API on port 8000 |

---

## 2. Tech stack (required)

### Frontend
- **Vite** with `@vitejs/plugin-react`
- **React** + **react-dom**
- **pdf-lib** + **@pdf-lib/fontkit** (Hindi PDF embedding)
- **jszip** (split PDF → ZIP of single-page PDFs)
- **regenerator-runtime** (speech / async compatibility)
- `vite.config.js`: `base: './'` for offline-friendly relative paths

### Backend (optional but include full code)
- **FastAPI** + **uvicorn**
- **CORS**: allow `http://127.0.0.1:5173` and `http://localhost:5173`
- **transformers** + **t5-small** for summarization
- **sentence-transformers** (`all-MiniLM-L6-v2`) for semantic search
- **openai-whisper** (`base` model) for audio transcription
- **python-multipart** for file uploads

### Environment
- Frontend: `VITE_API_BASE` (default `http://127.0.0.1:8000`)
- Notes stored in **browser localStorage** only (no DB required for v1)

---

## 3. Repository structure (create all files)

```text
sarkari-office/
├── index.html                 # <div id="root">, script → /frontend/main.jsx
├── package.json
├── vite.config.js
├── README.md
├── .env.example               # VITE_API_BASE=http://127.0.0.1:8000
├── public/
│   └── fonts/
│       └── NotoSansDevanagari-Regular.ttf   # bundle or document download URL
├── frontend/
│   ├── main.jsx               # ReactDOM.createRoot, StrictMode, mount App
│   ├── App.jsx                # ENTIRE main application (single file is OK)
│   └── styles/
│       └── globals.css
└── backend/
    ├── main.py
    ├── requirements.txt
    ├── routes/
    │   ├── ai.py
    │   ├── voice.py
    │   └── notes.py
    └── ai/
        ├── summarizer.py
        ├── embeddings.py
        ├── semantic_search.py
        └── whisper.py
```

**Entry point:** `index.html` loads `/frontend/main.jsx`. **Do not** split into 50 micro-files unless asked—one `App.jsx` (~600–700 lines) matching the behavior below is preferred.

---

## 4. Application layout (UI)

### Shell: two-column layout
- **Left sidebar (268px, sticky, full height)**
  - Brand: circular emblem with tricolor gradient (saffron / white / green), text “भारत”
  - Title: **Sarkari Office**, subtitle: **Hindi Typing + PDF Suite**
  - Vertical tab buttons (one active at a time, navy background when active)
  - Status box at bottom (toast messages mirror here briefly)
- **Main area**
  - Header: eyebrow Hindi text “सरल, सुरक्षित, कार्यालय उपयोग के लिए”, title “Government document workspace”, **Print** button (`window.print()`)
  - Content switches by active tab

### Design tokens (CSS variables)
```css
--bg: #f6f7f3;
--panel: #ffffff;
--line: #dfe4dc;
--text: #17202a;
--muted: #667085;
--saffron: #c95f14;
--green: #16723a;
--navy: #1f3d7a;
--soft: #eef3ec;
--radius: 8px;
```
- Font stack: `"Noto Sans Devanagari"`, `Nirmala UI`, `Segoe UI`, sans-serif
- `@font-face` for bundled Devanagari TTF at `/fonts/NotoSansDevanagari-Regular.ttf`
- Responsive: below 820px, sidebar stacks on top; tab grid 2 columns

### Sidebar tabs (ids → labels)
| id | label |
|----|--------|
| typing | Typing Office |
| converter | Font Converter |
| test | Typing Test |
| templates | Templates |
| pdf | PDF Office |
| advanced | Advanced Tools |
| security | Security |

---

## 5. Feature specifications

### 5.1 Typing Office (`active === 'typing'`)
- Large Hindi textarea (18px, Devanagari font)
- **Roman → Hindi on space:** when user presses space, transliterate the word just before the cursor
- **Pipe key `|`** inserts Devanagari danda `।` (prevent default `|`)
- Buttons: Start/Stop Voice, Roman to Hindi (whole text), Save TXT, Download Hindi PDF, Copy, Clear
- Voice: `webkitSpeechRecognition` / `SpeechRecognition`, langs `hi-IN` and `en-IN`, continuous mode, append transcript to editor
- Stats bar: word count, char count, line count
- Side panel: first 18 entries of word override dictionary (English → Hindi)

**Word overrides (must implement as lookup table):**
```
namaste→नमस्ते, bharat→भारत, sarkar→सरकार, karyalay/karyalaya→कार्यालय,
adhikari→अधिकारी, karmchari/karmachari→कर्मचारी, patra→पत्र, patravali→पत्रावली,
aavedan/avedan→आवेदन, suchna/soochna→सूचना, vibhag→विभाग, praman→प्रमाण,
dinank→दिनांक, kripya→कृपया, seva→सेवा, prapt→प्राप्त, bheja→भेजा, file→फाइल,
suchit→सूचित, niyam→नियम, anurodh→अनुरोध, anumodan→अनुमोदन, hastakshar→हस्ताक्षर,
vishay→विषय, mahoday→महोदय, prativedan→प्रतिवेदन, prarthana→प्रार्थना, pramanpatra→प्रमाणपत्र
```

**Transliteration engine (consonant + vowel rules):**
- Vowel tokens (longest first): `ai, au, aa, ee, ii, oo, uu, ri, a, i, u, e, o` → map to Devanagari standalone + matra forms
- Consonant tokens (longest first): include `ksh→क्ष`, `gy/jny→ज्ञ`, `shr→श्र`, `chh→छ`, digraphs `kh,gh,ch,jh,th,dh,ph,bh,sh`, singles `k,g,c,j,t,d,n,p,b,m,y,r,l,v,w,s,h,f,z`
- After consonant: if next token is vowel, append matra; else consonant only
- Non-matching chars pass through; preserve trailing punctuation on English words

**Hindi PDF export:**
- `PDFDocument.create()`, register fontkit, fetch/embed `NotoSansDevanagari-Regular.ttf`
- A4 pages 595×842, margin ~50pt, 12pt text, wrap lines ~78 chars
- Download blob as `hindi-draft.pdf`

### 5.2 Font Converter
- Direction select:
  - `romanToHindi` → run transliterate on full source
  - `unicodeToKruti` → character-pair replacement table
  - `krutiToUnicode` → reverse replacement
- Kruti basic map (legacy char → Unicode), apply via reduce split/join:
```
d→क, D→क्, f→ि, h→ी, j→र, k→ा, l→स, ;→य, v→अ, c→ब, x→ग, u→ह, i→प, o→द, p→ज,
r→त, t→म, y→न, e→भ, w→ै, q→ु, a→ं, s→े, z→्र, {→क्ष, }→द्व, |→।
```
- Convert button, output textarea (editable), Copy, Save TXT

### 5.3 Typing Test
- Sample passages (4 Hindi office sentences, join for test)
- User types in textarea; on focus start timer
- Live stats: WPM, accuracy %, error count (char-by-char vs sample)
- Restart clears input and resets timer; New Passage shuffles samples

### 5.4 Templates
- Six cards; click loads body into typing editor and switches to typing tab + toast

| name | purpose |
|------|---------|
| Office Order | कार्यालय आदेश boilerplate |
| Notice | सूचना with date/place/time |
| Application | सेवा में application |
| Meeting Minutes | बैठक कार्यवृत्त |
| Certificate | प्रमाणपत्र |
| Forwarding Letter | प्रेषण पत्र |

(Use full Hindi template bodies with placeholders like `______` and signature lines.)

### 5.5 PDF Office
Tool picker (left) + config panel (right). Tools:

| id | name | behavior |
|----|------|----------|
| merge | Merge PDF | ≥2 PDFs, copy all pages into one, download `merged-office-file.pdf` |
| split | Split / Extract | First PDF + page ranges `1-3,5,8` → ZIP of single-page PDFs |
| compress | Optimize PDF | Re-save with `useObjectStreams: true` |
| organize | Organize Pages | Keep only selected page indices |
| rotate | Rotate PDF | 90/180/270 on all pages (`degrees()`) |
| crop | Crop Margins | shrink crop box by N points each side |
| watermark | Watermark | diagonal semi-transparent text on every page |
| numbers | Page Numbers | `current / total` bottom center |
| sign | Sign PDF | italic signature + date on last page |
| image | Image to PDF | JPG/PNG files → scaled centered on A4 pages |
| text | Text to PDF | textarea draft → Hindi PDF via embedded font |

**Helpers:**
- `parseRanges(input, total)` → 0-based sorted page indices; empty input = all pages
- `downloadBlob(blob, filename)`
- File input: `.pdf` or images; show selected filenames
- Errors → toast message, no crash

### 5.6 Advanced Tools
Read-only grid of cards listing tools that **need backend engines** (PDF↔Office, OCR, redact, compare, repair, protect, forms, AI summarizer, translate). Each card: title, status badge “Needs … engine”, short note. **Do not fake these as working.**

### 5.7 Security
Checklist panel with 6 checkboxes (static labels about browser-only use, watermarking, backups, Hindi PDF export, sharing via npm, etc.)

### 5.8 Global UX
- `message` state + `toast(text)` → updates status box, resets to “Ready for office work” after 3.5s
- Clipboard copy with `navigator.clipboard.writeText`
- TXT download via Blob + temporary `<a download>`

---

## 6. Backend API (implement exactly)

### `GET /`
```json
{ "app": "Sarkari Office Local Engine", "status": "ready" }
```

### `GET /api/notes/health`
```json
{ "status": "ok" }
```

### `POST /api/ai/summarize`
Body: `{ "text": "..." }`  
Response: `{ "summary": "..." }`  
Implementation: HuggingFace `pipeline("summarization", model="t5-small")`, truncate input ~4000 chars, `max_length` dynamic, `min_length=20`.

### `POST /api/ai/search`
Body: `{ "query": "...", "notes": [{ "id", "title", "body", "tags", "status", "type" }] }`  
Response: `{ "results": [{ "id", "score", "title" }] }`  
Implementation: embed query + each note’s concatenated text with `all-MiniLM-L6-v2`, cosine similarity via dot product (normalized embeddings), return top 12.

### `POST /api/voice/transcribe`
Multipart file field `file`  
Response: `{ "text": "..." }`  
Save upload temporarily under `backend/uploads/`, run Whisper `base`, delete file after.

---

## 7. package.json (reference)

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1"
  },
  "dependencies": {
    "@pdf-lib/fontkit": "^1.1.1",
    "@vitejs/plugin-react": "latest",
    "jszip": "^3.10.1",
    "pdf-lib": "^1.17.1",
    "react": "latest",
    "react-dom": "latest",
    "regenerator-runtime": "^0.14.1",
    "vite": "latest"
  }
}
```

### backend/requirements.txt
```
fastapi
uvicorn
transformers
torch
sentence-transformers
openai-whisper
python-multipart
numpy
sentencepiece
```

---

## 8. Run instructions (include in README)

**Frontend only:**
```bash
npm install
npm run dev
# open http://127.0.0.1:5173/
```

**With backend:**
```bash
python -m venv .venv
# activate venv
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

**Production build:**
```bash
npm run build
# output in dist/ — serve with any static server
```

---

## 9. Optional enhancement (if user asks for Gemini)

Replace local `t5-small` / `sentence-transformers` / Whisper with **Google Gemini API**:
- Summarize: `gemini-2.0-flash` generateContent
- Search: `text-embedding-004` embed query + notes, rank by cosine similarity
- Voice: Gemini multimodal audio OR Cloud Speech-to-Text
- Store `GEMINI_API_KEY` in backend `.env`, never expose to frontend

---

## 10. Quality checklist (AI must verify)

- [ ] All 7 sidebar tabs render and switch without errors
- [ ] Space-triggered transliteration works for `bharat sarkar`
- [ ] Hindi PDF downloads and shows Devanagari (not tofu boxes)
- [ ] PDF merge/split/rotate/watermark produce valid files
- [ ] Mobile layout does not overflow horizontally
- [ ] `npm run build` succeeds
- [ ] Backend starts and CORS allows Vite dev origin
- [ ] Advanced tools clearly marked as not implemented

---

## 11. What NOT to build in v1

- User accounts / login
- Real PDF-to-Word/Excel (needs LibreOffice server)
- OCR, redaction, password protect PDF (needs qpdf/commercial libs)
- NoteIQ-style second app unless explicitly requested

---

**End of specification. Generate the full project now with all source files, ready to run on Windows 10/11.**

--- END PROMPT ---
