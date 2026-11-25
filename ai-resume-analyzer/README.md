# Resume Lens

Resume Lens is a JECRC University student prototype. It reads a text-based PDF, DOCX, or TXT résumé and gives an estimated applicant tracking system (ATS) score, skill coverage, and prioritized suggestions. Try the fictional sample to demonstrate it without collecting anyone's résumé.

[Open the public demo](https://stranger4uu.github.io/Projects/ai-resume-analyzer/demo/)

## Run on your computer

Use Node.js 24 or later.

```sh
npm ci
npm test
npm run dev
```

Open the URL printed by Vite for browser-only mode. To present the local HTTP backend, stop Vite and run:

```sh
npm run build
npm start
```

Open http://127.0.0.1:4174. This version serves the same built UI and sends extracted text to the loopback API. The file itself is read in the browser. Both modes use the same scoring module. The server binds to the local device and doesn't persist requests.

## Walkthrough

1. Select or drop a PDF, DOCX, or UTF-8 TXT file up to 5 MB. PDFs must have selectable text and at most 25 pages.
2. Use General review, choose a role, or paste up to 6,000 characters of job description.
3. Analyze the résumé and open the scoring explanation. Review keyword coverage and the suggested next edits.
4. For a role-based review, the AI evidence panel looks for related résumé bullets. The first model download requires internet access. The score and suggestions are available while the model loads and if it cannot load.

The built-in rubric estimates résumé readiness from extracted text and a limited skill dictionary. It cannot check how a particular employer's ATS will parse the file. Visual layout checks, OCR, accounts, and stored history are outside this prototype.

## Local HTTP API

- `GET /api/health` returns `{"status":"ok"}`.
- `POST /api/analyze` accepts JSON with `text` (20–50,000 characters), an optional `role` (`frontend`, `data`, `design`, or `accounting`), and an optional `job` (up to 6,000 characters). A non-empty job description takes precedence. The response contains `score`, `checks`, `detected`, `matched`, `missing`, `tips`, and the text snippets used by the local model.

## Hosting and removal

GitHub Pages serves the checked-in `demo/` build using the repository's existing publishing source. Rebuild after app changes, then commit and publish the updated `demo/` files. When the presentation is over, remove only `ai-resume-analyzer/demo/` from the publishing branch to take the URL down. The source can still be run locally with the commands above.

The public build downloads app assets and a pinned [quantized MiniLM model](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/751bff37182d3f1213fa05d7196b954e230abad9) and runs inference in the browser. Résumé text and job descriptions are never included in those requests. Keep real résumés and academic submission files out of the public repository.
