// Browser-side .txt and selectable-text PDF parsing. PDF files are not uploaded.
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function extractResumeText(file) {
  if (!file) throw new Error("Choose a resume file first.");
  if (file.size > MAX_FILE_SIZE) throw new Error("Resume file must be 5 MB or smaller.");

  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) return file.text();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    const text = pages.join("\n").trim();
    if (!text) throw new Error("No selectable text found. Scanned PDFs need OCR, which is not included.");
    return text;
  }

  throw new Error("Unsupported file. Upload a .txt or text-based .pdf resume.");
}
