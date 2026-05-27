# Sarkari Office Suite

A simple government-office workspace combining Hindi typing utilities with practical PDF tools.

## What Works In The Browser

- Hindi typing editor with Roman-to-Hindi conversion
- Hindi voice typing where the browser supports speech recognition
- Hindi typing speed test with WPM, accuracy, and error count
- Office templates for orders, notices, applications, minutes, certificates, and forwarding letters
- Unicode Hindi to basic Kruti Dev conversion and basic Kruti Dev to Unicode conversion
- Hindi TXT export and Hindi PDF export with bundled Devanagari font
- PDF merge, split/extract, optimize, organize, rotate, crop, watermark, page numbers, typed signature, image-to-PDF, and text-to-PDF

## Advanced Tools

Some iLovePDF-style tools need a real local processing engine before they can be reliable:

- PDF to Word, Excel, PowerPoint, and JPG
- Word, Excel, and PowerPoint to PDF with exact formatting
- OCR, redaction, compare, repair, password protect/unlock, forms, translate, and AI summary

The app shows these clearly as backend-required instead of pretending they are complete.

## Run On This PC

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Build For Sharing

```bash
npm run build
```

Send the project folder or the `dist` folder to another PC. If sending the full project, the other PC should run:

```bash
npm install
npm run dev
```

If sending only `dist`, serve it with any static server from the project root:

```bash
npx serve dist
```
