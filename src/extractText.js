// Reads the text out of an uploaded JD in the browser, so only plain text is
// sent to the server. PDF and Word readers load only when such a file is
// chosen, keeping the page itself light.

const ext = name => (name.split(".").pop() || "").toLowerCase();

const readAs = (file, how) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = e => resolve(e.target.result);
  reader.onerror = () => reject(reader.error);
  reader[how](file);
});

async function pdfText(file) {
  const pdfjs = await import("pdfjs-dist/build/pdf.min.mjs");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const data = new Uint8Array(await readAs(file, "readAsArrayBuffer"));
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Rebuild lines: pdf.js marks line ends with hasEOL.
    pages.push(content.items.map(it => it.str + (it.hasEOL ? "\n" : "")).join(""));
  }
  await doc.destroy();
  return pages.join("\n\n");
}

async function docxText(file) {
  const mammoth = (await import("mammoth/mammoth.browser.js")).default;
  const { value } = await mammoth.extractRawText({ arrayBuffer: await readAs(file, "readAsArrayBuffer") });
  return value;
}

// Crude RTF to text: drop control words and groups, keep the words.
function rtfText(raw) {
  return raw
    .replace(/\\par[d]?/g, "\n")
    .replace(/\{\\\*[^{}]*\}/g, "")
    .replace(/\\'[0-9a-f]{2}/gi, "")
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export class UnreadableFileError extends Error {}

// Returns the file's text, or throws UnreadableFileError with a message the
// person can act on.
export async function extractText(file) {
  const type = ext(file.name);
  let text;
  try {
    if (type === "pdf") text = await pdfText(file);
    else if (type === "docx") text = await docxText(file);
    else if (type === "doc") throw new UnreadableFileError(`${file.name}: older .doc files can't be read. Save it as .docx or PDF and upload again.`);
    else if (type === "rtf") text = rtfText(await readAs(file, "readAsText"));
    else text = await readAs(file, "readAsText");
  } catch (err) {
    if (err instanceof UnreadableFileError) throw err;
    throw new UnreadableFileError(`${file.name} couldn't be read. Try saving it as PDF or .docx and uploading again.`);
  }
  text = String(text || "").replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
  if (text.length < 40) {
    throw new UnreadableFileError(`${file.name} has almost no readable text. If it's a scanned image, upload the original Word or PDF file instead.`);
  }
  return text;
}

// A role title from a file name: "Head_of_Retail.pdf" → "Head of Retail".
export function titleFromFileName(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/_{3}/g, " / ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}
