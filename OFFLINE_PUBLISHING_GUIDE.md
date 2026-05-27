# Sarkari Office Suite Publishing Guide

## Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Build A Shareable Copy

```bash
npm run build
```

The production files are created in `dist`.

## Share With A Friend

Send the full project folder if your friend may need to edit or rebuild the app.

Send only `dist` if your friend only needs to preview the built app. The `dist` folder should be served with a static server, for example:

```bash
npx serve dist
```

## Current Browser-Safe Tools

- Hindi typing editor, voice typing, templates, typing test, text export, and Hindi PDF export
- PDF merge, split, optimize, organize, rotate, crop, watermark, page numbers, signature, image-to-PDF, and text-to-PDF

Advanced tools such as OCR, redaction, Office conversion, repair, compare, protect, unlock, AI summary, and translation need a local processing engine before they can be reliable.
