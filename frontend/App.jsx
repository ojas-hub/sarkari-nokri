import 'regenerator-runtime/runtime.js';
import { useMemo, useRef, useState } from 'react';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import JSZip from 'jszip';

const HINDI_FONT_URL = `${import.meta.env.BASE_URL}fonts/NotoSansDevanagari-Regular.ttf`;
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const hindiSamples = [
  'भारत सरकार के कार्यालय में सभी अभिलेख समय पर तैयार किए जाएंगे।',
  'कृपया पत्रावली का परीक्षण कर आवश्यक अनुमोदन प्रदान करें।',
  'जनहित से संबंधित प्रकरणों का निस्तारण प्राथमिकता से किया जाए।',
  'सभी अधिकारी निर्धारित प्रारूप में प्रतिवेदन प्रस्तुत करें।',
];

const wordOverrides = {
  namaste: 'नमस्ते',
  bharat: 'भारत',
  sarkar: 'सरकार',
  karyalay: 'कार्यालय',
  karyalaya: 'कार्यालय',
  adhikari: 'अधिकारी',
  karmchari: 'कर्मचारी',
  karmachari: 'कर्मचारी',
  patra: 'पत्र',
  patravali: 'पत्रावली',
  aavedan: 'आवेदन',
  avedan: 'आवेदन',
  suchna: 'सूचना',
  soochna: 'सूचना',
  vibhag: 'विभाग',
  praman: 'प्रमाण',
  dinank: 'दिनांक',
  kripya: 'कृपया',
  seva: 'सेवा',
  prapt: 'प्राप्त',
  bheja: 'भेजा',
  file: 'फाइल',
  suchit: 'सूचित',
  niyam: 'नियम',
  anurodh: 'अनुरोध',
  anumodan: 'अनुमोदन',
  hastakshar: 'हस्ताक्षर',
  vishay: 'विषय',
  mahoday: 'महोदय',
  prativedan: 'प्रतिवेदन',
  prarthana: 'प्रार्थना',
  pramanpatra: 'प्रमाणपत्र',
};

const vowels = [
  ['ai', ['ऐ', 'ै']], ['au', ['औ', 'ौ']], ['aa', ['आ', 'ा']], ['ee', ['ई', 'ी']],
  ['ii', ['ई', 'ी']], ['oo', ['ऊ', 'ू']], ['uu', ['ऊ', 'ू']], ['ri', ['ऋ', 'ृ']],
  ['a', ['अ', '']], ['i', ['इ', 'ि']], ['u', ['उ', 'ु']], ['e', ['ए', 'े']], ['o', ['ओ', 'ो']],
];

const consonants = [
  ['ksh', 'क्ष'], ['gy', 'ज्ञ'], ['jny', 'ज्ञ'], ['shr', 'श्र'], ['chh', 'छ'],
  ['kh', 'ख'], ['gh', 'घ'], ['ch', 'च'], ['jh', 'झ'], ['th', 'थ'], ['dh', 'ध'],
  ['ph', 'फ'], ['bh', 'भ'], ['sh', 'श'], ['gn', 'ज्ञ'], ['tr', 'त्र'],
  ['k', 'क'], ['g', 'ग'], ['c', 'क'], ['j', 'ज'], ['t', 'त'], ['d', 'द'],
  ['n', 'न'], ['p', 'प'], ['b', 'ब'], ['m', 'म'], ['y', 'य'], ['r', 'र'],
  ['l', 'ल'], ['v', 'व'], ['w', 'व'], ['s', 'स'], ['h', 'ह'], ['f', 'फ'], ['z', 'ज'],
];

const krutiPairs = [
  ['d', 'क'], ['D', 'क्'], ['f', 'ि'], ['h', 'ी'], ['j', 'र'], ['k', 'ा'],
  ['l', 'स'], [';', 'य'], ['v', 'अ'], ['c', 'ब'], ['x', 'ग'], ['u', 'ह'],
  ['i', 'प'], ['o', 'द'], ['p', 'ज'], ['r', 'त'], ['t', 'म'], ['y', 'न'],
  ['e', 'भ'], ['w', 'ै'], ['q', 'ु'], ['a', 'ं'], ['s', 'े'], ['z', '्र'],
  ['{', 'क्ष'], ['}', 'द्व'], ['|', '।'],
];

const tabs = [
  ['typing', 'Typing Office'],
  ['converter', 'Font Converter'],
  ['test', 'Typing Test'],
  ['templates', 'Templates'],
  ['pdf', 'PDF Office'],
  ['advanced', 'Advanced Tools'],
  ['security', 'Security'],
];

const templates = [
  {
    name: 'Office Order',
    body: 'कार्यालय आदेश\n\nविषय: कार्यालय व्यवस्था के संबंध में।\n\nउक्त विषयक आदेशानुसार सभी अधिकारी एवं कर्मचारी निर्धारित समय में कार्य पूर्ण करना सुनिश्चित करें।\n\nदिनांक:\nहस्ताक्षर:\nपदनाम:',
  },
  {
    name: 'Notice',
    body: 'सूचना\n\nसभी संबंधितों को सूचित किया जाता है कि दिनांक ______ को कार्यालय में बैठक आयोजित की जाएगी। कृपया समय पर उपस्थित हों।\n\nस्थान:\nसमय:\nहस्ताक्षर:',
  },
  {
    name: 'Application',
    body: 'सेवा में,\nकार्यालय प्रमुख महोदय,\n\nविषय: आवेदन पत्र।\n\nमहोदय,\nसविनय निवेदन है कि ______________________________। कृपया आवश्यक कार्यवाही करने का कष्ट करें।\n\nभवदीय,\nनाम:\nदिनांक:',
  },
  {
    name: 'Meeting Minutes',
    body: 'बैठक कार्यवृत्त\n\nबैठक दिनांक ______ को आयोजित की गई। निम्न बिंदुओं पर चर्चा की गई:\n\n1. \n2. \n3. \n\nनिर्णय:\n\nहस्ताक्षर:',
  },
  {
    name: 'Certificate',
    body: 'प्रमाणपत्र\n\nयह प्रमाणित किया जाता है कि श्री/श्रीमती __________________ ने कार्यालय अभिलेखों के अनुसार आवश्यक कार्य पूर्ण किया है।\n\nदिनांक:\nस्थान:\nप्राधिकृत हस्ताक्षर:',
  },
  {
    name: 'Forwarding Letter',
    body: 'प्रेषण पत्र\n\nविषय: पत्रावली प्रेषित करने के संबंध में।\n\nसंलग्न पत्रावली आवश्यक कार्यवाही हेतु प्रेषित की जाती है। कृपया परीक्षण कर प्रतिवेदन उपलब्ध कराएं।\n\nभवदीय,\nहस्ताक्षर:',
  },
];

const pdfTools = [
  ['merge', 'Merge PDF', 'Combine multiple PDFs'],
  ['split', 'Split / Extract', 'Save selected pages as ZIP'],
  ['compress', 'Optimize PDF', 'Re-save and reduce structure overhead'],
  ['organize', 'Organize Pages', 'Keep selected page ranges'],
  ['rotate', 'Rotate PDF', 'Rotate all pages'],
  ['crop', 'Crop Margins', 'Trim page boundaries'],
  ['watermark', 'Watermark', 'Stamp text on every page'],
  ['numbers', 'Page Numbers', 'Add page numbers'],
  ['sign', 'Sign PDF', 'Add typed signature'],
  ['image', 'Image to PDF', 'JPG/PNG to PDF'],
  ['text', 'Text to PDF', 'Draft text into a PDF'],
];

const advancedTools = [
  ['PDF to Word', 'Needs local conversion engine', 'Requires LibreOffice/PDF parser to preserve layout.'],
  ['Word to PDF', 'Needs local conversion engine', 'Requires LibreOffice for accurate DOCX rendering.'],
  ['PDF to Excel', 'Needs extraction engine', 'Tables need OCR/tabula-style processing.'],
  ['PDF to PowerPoint', 'Needs conversion engine', 'Slides must be reconstructed page by page.'],
  ['PowerPoint to PDF', 'Needs local conversion engine', 'Requires Office/LibreOffice renderer.'],
  ['Excel to PDF', 'Needs local conversion engine', 'Requires spreadsheet renderer and print settings.'],
  ['PDF to JPG', 'Needs rasterizer', 'Requires PDF.js or backend page rendering.'],
  ['OCR PDF', 'Needs OCR engine', 'Requires Tesseract or cloud OCR.'],
  ['Compare PDF', 'Needs diff engine', 'Requires text and image comparison.'],
  ['Redact PDF', 'Needs secure backend', 'Must permanently remove hidden content.'],
  ['Protect / Unlock PDF', 'Needs crypto engine', 'Requires password/security handlers.'],
  ['Repair PDF', 'Needs repair engine', 'Requires qpdf/mutool-style recovery.'],
  ['Forms', 'Needs form engine', 'Requires AcroForm/XFA handling.'],
  ['AI Summarizer', 'Needs AI backend', 'Requires text extraction and model endpoint.'],
  ['Translate PDF', 'Needs AI/backend', 'Requires OCR/text extraction and translation.'],
];

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseRanges(input, total) {
  if (!input.trim()) return Array.from({ length: total }, (_, i) => i);
  const picked = new Set();
  input.split(',').forEach((part) => {
    const item = part.trim();
    if (!item) return;
    const [a, b] = item.split('-').map((n) => Number(n.trim()));
    if (!Number.isFinite(a)) return;
    const start = Math.max(1, a);
    const end = Number.isFinite(b) ? Math.min(total, b) : start;
    for (let n = start; n <= end; n += 1) picked.add(n - 1);
  });
  return [...picked].sort((a, b) => a - b);
}

function pickToken(input, list) {
  return list.find(([token]) => input.startsWith(token));
}

function transliterateWord(rawWord) {
  const match = rawWord.match(/^([A-Za-z]+)([.,;:!?]*)$/);
  if (!match) return rawWord;
  const [, letters, punctuation] = match;
  const word = letters.toLowerCase();
  if (wordOverrides[word]) return `${wordOverrides[word]}${punctuation}`;

  let out = '';
  let i = 0;
  while (i < word.length) {
    const rest = word.slice(i);
    const vowel = pickToken(rest, vowels);
    if (vowel) {
      out += vowel[1][0];
      i += vowel[0].length;
      continue;
    }

    const consonant = pickToken(rest, consonants);
    if (!consonant) {
      out += rest[0];
      i += 1;
      continue;
    }

    const afterConsonant = word.slice(i + consonant[0].length);
    const nextVowel = pickToken(afterConsonant, vowels);
    out += consonant[1];
    if (nextVowel) {
      out += nextVowel[1][1];
      i += consonant[0].length + nextVowel[0].length;
    } else {
      i += consonant[0].length;
    }
  }
  return `${out}${punctuation}`;
}

function transliterateText(text) {
  return text.split(/(\s+)/).map((part) => (/^[A-Za-z]+[.,;:!?]?$/.test(part) ? transliterateWord(part) : part)).join('');
}

function unicodeToKruti(text) {
  return krutiPairs.reduce((out, [legacy, uni]) => out.split(uni).join(legacy), text);
}

function krutiToUnicode(text) {
  return krutiPairs.reduce((out, [legacy, uni]) => out.split(legacy).join(uni), text);
}

function textToLines(text, max = 78) {
  const lines = [];
  text.split(/\n/).forEach((paragraph) => {
    const words = paragraph.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean);
    let line = '';
    words.forEach((word) => {
      if ((line + ' ' + word).trim().length > max) {
        lines.push(line);
        line = word;
      } else {
        line = `${line} ${word}`.trim();
      }
    });
    lines.push(line);
  });
  return lines.length ? lines : [''];
}

async function embedOfficeFont(pdf) {
  pdf.registerFontkit(fontkit);
  const bytes = await fetch(HINDI_FONT_URL).then((res) => {
    if (!res.ok) throw new Error('Hindi font could not be loaded');
    return res.arrayBuffer();
  });
  return pdf.embedFont(bytes, { subset: true });
}

export default function App() {
  const [active, setActive] = useState('typing');
  const [typing, setTyping] = useState('');
  const [source, setSource] = useState('');
  const [converted, setConverted] = useState('');
  const [direction, setDirection] = useState('romanToHindi');
  const [testText, setTestText] = useState(hindiSamples.join(' '));
  const [testInput, setTestInput] = useState('');
  const [testStart, setTestStart] = useState(null);
  const [message, setMessage] = useState('Ready for office work');
  const [pdfMode, setPdfMode] = useState('merge');
  const [files, setFiles] = useState([]);
  const [range, setRange] = useState('');
  const [watermark, setWatermark] = useState('Sarkari Office');
  const [signature, setSignature] = useState('Authorized Signatory');
  const [rotate, setRotate] = useState('90');
  const [cropMargin, setCropMargin] = useState('24');
  const [draft, setDraft] = useState('');
  const [speechLang, setSpeechLang] = useState('hi-IN');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const [aiText, setAiText] = useState('');
  const [aiOut, setAiOut] = useState('');
  const [aiTarget, setAiTarget] = useState('en');

  const stats = useMemo(() => {
    const words = typing.trim() ? typing.trim().split(/\s+/).length : 0;
    const lines = typing ? typing.split(/\n/).length : 0;
    return { chars: typing.length, words, lines };
  }, [typing]);

  const testStats = useMemo(() => {
    if (!testStart) return { wpm: 0, accuracy: 100, errors: 0 };
    const minutes = Math.max((Date.now() - testStart) / 60000, 0.05);
    const words = testInput.trim() ? testInput.trim().split(/\s+/).length : 0;
    let correct = 0;
    [...testInput].forEach((char, index) => {
      if (char === testText[index]) correct += 1;
    });
    const errors = Math.max(testInput.length - correct, 0);
    const accuracy = testInput.length ? Math.max(Math.round((correct / testInput.length) * 100), 0) : 100;
    return { wpm: Math.round(words / minutes), accuracy, errors };
  }, [testInput, testStart, testText]);

  function toast(text) {
    setMessage(text);
    setTimeout(() => setMessage('Ready for office work'), 3500);
  }

  function handleTypingKey(event) {
    if (event.key === ' ') {
      setTimeout(() => setTyping((value) => {
        const parts = value.split(/(\s+)/);
        const index = parts.length - 2 >= 0 ? parts.length - 2 : parts.length - 1;
        parts[index] = transliterateWord(parts[index]);
        return parts.join('');
      }), 0);
    }
    if (event.key === '|') {
      event.preventDefault();
      setTyping((value) => `${value}।`);
    }
  }

  function saveText(name, value) {
    downloadBlob(new Blob([value], { type: 'text/plain;charset=utf-8' }), name);
    toast('Text file downloaded');
  }

  async function copyText(value) {
    await navigator.clipboard.writeText(value);
    toast('Copied to clipboard');
  }

  async function makeTextPdf(text, name = 'office-document.pdf') {
    const pdf = await PDFDocument.create();
    const font = await embedOfficeFont(pdf);
    let page = pdf.addPage([595, 842]);
    let y = 790;
    textToLines(text || 'Government Office Document').forEach((line) => {
      if (y < 54) {
        page = pdf.addPage([595, 842]);
        y = 790;
      }
      page.drawText(line || ' ', { x: 50, y, size: 12, font, color: rgb(0.08, 0.09, 0.12) });
      y -= 20;
    });
    downloadBlob(new Blob([await pdf.save()], { type: 'application/pdf' }), name);
    toast('PDF downloaded');
  }

  async function postJson(path, payload) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function runAiAction(kind) {
    try {
      if (!aiText.trim()) throw new Error('Paste text first');
      if (kind === 'summarize') {
        toast('Summarizing (Gemini/local)…');
        const data = await postJson('/api/ai/summarize', { text: aiText });
        setAiOut(data.summary || '');
        toast('Summary ready');
      }
      if (kind === 'translate') {
        toast('Translating (Gemini/local)…');
        const data = await postJson('/api/ai/translate', { text: aiText, target_lang: aiTarget });
        setAiOut(data.text || '');
        toast('Translation ready');
      }
    } catch (error) {
      toast(error.message || 'AI tool failed (is backend running?)');
    }
  }

  async function loadFirstPdf() {
    if (!files[0]) throw new Error('Select a PDF file first');
    return PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true });
  }

  async function mergePdfs() {
    if (files.length < 2) throw new Error('Select at least two PDF files');
    const output = await PDFDocument.create();
    for (const file of files) {
      const input = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const pages = await output.copyPages(input, input.getPageIndices());
      pages.forEach((page) => output.addPage(page));
    }
    downloadBlob(new Blob([await output.save({ useObjectStreams: true })], { type: 'application/pdf' }), 'merged-office-file.pdf');
  }

  async function splitPdf() {
    const input = await loadFirstPdf();
    const pages = parseRanges(range, input.getPageCount());
    if (!pages.length) throw new Error('Enter valid pages');
    const zip = new JSZip();
    for (const index of pages) {
      const out = await PDFDocument.create();
      const [page] = await out.copyPages(input, [index]);
      out.addPage(page);
      zip.file(`page-${index + 1}.pdf`, await out.save({ useObjectStreams: true }));
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), 'split-pages.zip');
  }

  async function optimizePdf() {
    const pdf = await loadFirstPdf();
    pdf.setProducer('Sarkari Office Suite');
    downloadBlob(new Blob([await pdf.save({ useObjectStreams: true })], { type: 'application/pdf' }), 'optimized.pdf');
  }

  async function organizePdf() {
    const input = await loadFirstPdf();
    const output = await PDFDocument.create();
    const selected = parseRanges(range, input.getPageCount());
    if (!selected.length) throw new Error('Enter valid pages');
    const pages = await output.copyPages(input, selected);
    pages.forEach((page) => output.addPage(page));
    downloadBlob(new Blob([await output.save({ useObjectStreams: true })], { type: 'application/pdf' }), 'organized.pdf');
  }

  async function rotatePdf() {
    const pdf = await loadFirstPdf();
    pdf.getPages().forEach((page) => page.setRotation(degrees(Number(rotate))));
    downloadBlob(new Blob([await pdf.save({ useObjectStreams: true })], { type: 'application/pdf' }), 'rotated.pdf');
  }

  async function cropPdf() {
    const pdf = await loadFirstPdf();
    const margin = Math.max(Number(cropMargin) || 0, 0);
    pdf.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      page.setCropBox(margin, margin, Math.max(width - margin * 2, 10), Math.max(height - margin * 2, 10));
    });
    downloadBlob(new Blob([await pdf.save({ useObjectStreams: true })], { type: 'application/pdf' }), 'cropped.pdf');
  }

  async function markPdf(type) {
    const pdf = await loadFirstPdf();
    const font = await pdf.embedFont(type === 'sign' ? StandardFonts.HelveticaOblique : StandardFonts.HelveticaBold);
    const pages = pdf.getPages();
    pages.forEach((page, index) => {
      const { width, height } = page.getSize();
      if (type === 'numbers') {
        page.drawText(`${index + 1} / ${pages.length}`, { x: width / 2 - 18, y: 28, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
      }
      if (type === 'watermark') {
        page.drawText(watermark, {
          x: width * 0.16, y: height * 0.48, size: 34, font,
          color: rgb(0.72, 0.72, 0.72), rotate: degrees(-32), opacity: 0.35,
        });
      }
    });
    if (type === 'sign') {
      const page = pages[pages.length - 1];
      page.drawText(signature, { x: 56, y: 72, size: 16, font, color: rgb(0.08, 0.09, 0.12) });
      page.drawText(new Date().toLocaleDateString('en-IN'), { x: 56, y: 52, size: 9, font, color: rgb(0.35, 0.35, 0.35) });
    }
    downloadBlob(new Blob([await pdf.save({ useObjectStreams: true })], { type: 'application/pdf' }), `${type}.pdf`);
  }

  async function imagesToPdf() {
    if (!files.length) throw new Error('Select JPG or PNG files');
    const pdf = await PDFDocument.create();
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const image = file.type.includes('png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const page = pdf.addPage([595, 842]);
      const scale = Math.min(520 / image.width, 760 / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      page.drawImage(image, { x: (595 - width) / 2, y: (842 - height) / 2, width, height });
    }
    downloadBlob(new Blob([await pdf.save({ useObjectStreams: true })], { type: 'application/pdf' }), 'images.pdf');
  }

  async function runPdfTool() {
    const actions = {
      merge: mergePdfs,
      split: splitPdf,
      compress: optimizePdf,
      organize: organizePdf,
      rotate: rotatePdf,
      crop: cropPdf,
      watermark: () => markPdf('watermark'),
      numbers: () => markPdf('numbers'),
      sign: () => markPdf('sign'),
      image: imagesToPdf,
      text: () => makeTextPdf(draft, 'converted-text.pdf'),
    };
    try {
      await actions[pdfMode]?.();
      toast('Done. Download started');
    } catch (error) {
      toast(error.message || 'Could not process this file');
    }
  }

  function applyConvert() {
    if (direction === 'romanToHindi') setConverted(transliterateText(source));
    if (direction === 'unicodeToKruti') setConverted(unicodeToKruti(source));
    if (direction === 'krutiToUnicode') setConverted(krutiToUnicode(source));
  }

  function startVoiceTyping() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast('Voice typing is not supported in this browser');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = speechLang;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
      }
      if (transcript) setTyping((value) => `${value}${value ? ' ' : ''}${transcript.trim()}`);
    };
    recognition.onerror = () => toast('Voice typing stopped. Check microphone permission');
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    toast('Listening for voice typing');
  }

  function stopVoiceTyping() {
    recognitionRef.current?.stop();
    setListening(false);
    toast('Voice typing stopped');
  }

  const selectedPdfTool = pdfTools.find(([id]) => id === pdfMode);

  return (
    <main className="office-shell">
      <aside className="office-sidebar">
        <div className="office-brand">
          <div className="emblem">भारत</div>
          <div>
            <h1>Sarkari Office</h1>
            <p>Hindi Typing + PDF Suite</p>
          </div>
        </div>
        <nav className="office-tabs">
          {tabs.map(([id, label]) => (
            <button className={active === id ? 'active' : ''} key={id} onClick={() => setActive(id)}>{label}</button>
          ))}
        </nav>
        <div className="status-box">{message}</div>
      </aside>

      <section className="office-main">
        <header className="office-header">
          <div>
            <p className="eyebrow">सरल, सुरक्षित, कार्यालय उपयोग के लिए</p>
            <h2>Government document workspace</h2>
          </div>
          <button onClick={() => window.print()}>Print</button>
        </header>

        {active === 'typing' && (
          <section className="panel-grid">
            <div className="work-panel wide">
              <div className="panel-title">
                <h3>Hindi Typing Editor</h3>
                <span>{stats.words} words · {stats.chars} chars · {stats.lines} lines</span>
              </div>
              <div className="control-row">
                <select value={speechLang} onChange={(event) => setSpeechLang(event.target.value)}>
                  <option value="hi-IN">Hindi voice</option>
                  <option value="en-IN">English voice</option>
                </select>
                <button onClick={listening ? stopVoiceTyping : startVoiceTyping}>{listening ? 'Stop Voice' : 'Start Voice'}</button>
                <button onClick={() => setTyping(transliterateText(typing))}>Roman to Hindi</button>
              </div>
              <textarea className="office-textarea hindi" value={typing} onChange={(event) => setTyping(event.target.value)} onKeyDown={handleTypingKey} placeholder="Type bharat sarkar and press space. Use the pipe key for ।" />
              <div className="button-row">
                <button onClick={() => saveText('hindi-draft.txt', typing)}>Save TXT</button>
                <button onClick={() => makeTextPdf(typing, 'hindi-draft.pdf')}>Download Hindi PDF</button>
                <button onClick={() => copyText(typing)}>Copy</button>
                <button onClick={() => setTyping('')}>Clear</button>
              </div>
            </div>
            <div className="work-panel">
              <h3>Typing Guide</h3>
              <div className="guide-grid">
                {Object.entries(wordOverrides).slice(0, 18).map(([en, hi]) => <span key={en}><b>{en}</b>{hi}</span>)}
              </div>
            </div>
          </section>
        )}

        {active === 'converter' && (
          <section className="panel-grid">
            <div className="work-panel">
              <h3>Text Converter</h3>
              <select value={direction} onChange={(event) => setDirection(event.target.value)}>
                <option value="romanToHindi">Roman Hindi to Unicode Hindi</option>
                <option value="unicodeToKruti">Unicode to Kruti Dev basic</option>
                <option value="krutiToUnicode">Kruti Dev basic to Unicode</option>
              </select>
              <textarea className="office-textarea" value={source} onChange={(event) => setSource(event.target.value)} placeholder="Paste source text here" />
              <button className="primary-action" onClick={applyConvert}>Convert</button>
            </div>
            <div className="work-panel">
              <h3>Converted Output</h3>
              <textarea className="office-textarea hindi" value={converted} onChange={(event) => setConverted(event.target.value)} />
              <div className="button-row">
                <button onClick={() => copyText(converted)}>Copy</button>
                <button onClick={() => saveText('converted-text.txt', converted)}>Save TXT</button>
              </div>
            </div>
          </section>
        )}

        {active === 'test' && (
          <section className="panel-grid">
            <div className="work-panel wide">
              <div className="panel-title">
                <h3>Hindi Typing Test</h3>
                <span>{testStats.wpm} WPM · {testStats.accuracy}% accuracy · {testStats.errors} errors</span>
              </div>
              <p className="sample-text">{testText}</p>
              <textarea className="office-textarea hindi" value={testInput} onFocus={() => setTestStart((value) => value || Date.now())} onChange={(event) => setTestInput(event.target.value)} placeholder="Start typing here" />
              <div className="button-row">
                <button onClick={() => { setTestInput(''); setTestStart(Date.now()); }}>Restart</button>
                <button onClick={() => setTestText(hindiSamples.sort(() => Math.random() - 0.5).join(' '))}>New Passage</button>
              </div>
            </div>
          </section>
        )}

        {active === 'templates' && (
          <section className="tool-list">
            {templates.map((template) => (
              <button key={template.name} onClick={() => { setTyping(template.body); setActive('typing'); toast(`${template.name} loaded`); }}>
                <b>{template.name}</b>
                <span>Load into Hindi editor</span>
              </button>
            ))}
          </section>
        )}

        {active === 'pdf' && (
          <section className="panel-grid">
            <div className="work-panel">
              <h3>PDF Office Tools</h3>
              <div className="tool-list compact">
                {pdfTools.map(([id, name, desc]) => (
                  <button className={pdfMode === id ? 'active' : ''} key={id} onClick={() => { setPdfMode(id); setFiles([]); }}>
                    <b>{name}</b>
                    <span>{desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="work-panel">
              <h3>{selectedPdfTool?.[1]}</h3>
              <p className="panel-help">{selectedPdfTool?.[2]}</p>
              {pdfMode !== 'text' && (
                <input type="file" multiple accept={pdfMode === 'image' ? 'image/png,image/jpeg' : '.pdf'} onChange={(event) => setFiles([...event.target.files])} />
              )}
              <div className="file-list">{files.map((file) => <span key={file.name}>{file.name}</span>)}</div>
              {(pdfMode === 'split' || pdfMode === 'organize') && <input value={range} onChange={(event) => setRange(event.target.value)} placeholder="Pages: 1-3,5,8" />}
              {pdfMode === 'watermark' && <input value={watermark} onChange={(event) => setWatermark(event.target.value)} placeholder="Watermark text" />}
              {pdfMode === 'sign' && <input value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Typed signature" />}
              {pdfMode === 'rotate' && <select value={rotate} onChange={(event) => setRotate(event.target.value)}><option>90</option><option>180</option><option>270</option></select>}
              {pdfMode === 'crop' && <input type="number" min="0" value={cropMargin} onChange={(event) => setCropMargin(event.target.value)} placeholder="Crop margin in points" />}
              {pdfMode === 'text' && <textarea className="office-textarea hindi" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Paste Hindi or English text here" />}
              <button className="primary-action" onClick={runPdfTool}>Process & Download</button>
            </div>
          </section>
        )}

        {active === 'advanced' && (
          <section className="panel-grid">
            <div className="work-panel wide">
              <div className="panel-title">
                <h3>Advanced AI Tools (Backend)</h3>
                <span>Works with local backend; Gemini optional</span>
              </div>
              <textarea
                className="office-textarea"
                value={aiText}
                onChange={(event) => setAiText(event.target.value)}
                placeholder="Paste text here (Hindi or English)…"
              />
              <div className="control-row" style={{ marginTop: 10 }}>
                <button onClick={() => runAiAction('summarize')}>Summarize</button>
                <select value={aiTarget} onChange={(event) => setAiTarget(event.target.value)} style={{ maxWidth: 180 }}>
                  <option value="en">Translate to English</option>
                  <option value="hi">Translate to Hindi</option>
                </select>
                <button onClick={() => runAiAction('translate')}>Translate</button>
                <button onClick={() => copyText(aiOut)} disabled={!aiOut.trim()}>Copy output</button>
                <button onClick={() => setAiOut('')} disabled={!aiOut.trim()}>Clear output</button>
              </div>
              <textarea
                className="office-textarea hindi"
                value={aiOut}
                onChange={(event) => setAiOut(event.target.value)}
                placeholder="Output will appear here…"
              />
            </div>

            <div className="work-panel">
              <h3>Engine Status</h3>
              <p className="panel-help">
                If output is empty or you see an error, start the backend at <b>{API_BASE}</b>.
                For Gemini, set <b>GOOGLE_API_KEY</b> in the backend environment (never in frontend).
              </p>
              <div className="advanced-grid">
                {advancedTools.map(([name, status, note]) => (
                  <article className="advanced-card" key={name}>
                    <div>
                      <h3>{name}</h3>
                      <strong>{status}</strong>
                    </div>
                    <p>{note}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {active === 'security' && (
          <section className="panel-grid">
            <div className="work-panel wide">
              <h3>Secure Office Checklist</h3>
              <div className="check-grid">
                {[
                  'Use browser-only tools for ordinary PDFs and non-confidential drafts.',
                  'Use watermark and page numbers before circulating internal files.',
                  'Do not promise unlock, OCR, redaction, or Office conversion until the local engine is installed.',
                  'Keep original files backed up before splitting, cropping, or organizing pages.',
                  'Use the Hindi PDF export for Devanagari text instead of print-to-PDF.',
                  'Share the project folder with npm install instructions for another PC.',
                ].map((item) => <label key={item}><input type="checkbox" /> {item}</label>)}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
