import * as pdfjsLib from 'pdfjs-dist';

// Configure worker using unpkg CDN (serves exact npm package versions)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/**
 * Extracts text from a PDF file and converts it to Markdown.
 * @param file - The PDF file to process
 * @returns Promise resolving to { title, content } where content is Markdown
 */
export async function extractPdfToMarkdown(
  file: File
): Promise<{ title: string; content: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const title = file.name.replace(/\.pdf$/i, '');
  const paragraphs: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    let lastY: number | null = null;
    let currentLine = '';

    for (const item of textContent.items) {
      const textItem = item as TextItem;
      if (!textItem.str) continue;

      const y = textItem.transform[5];

      // If Y position changed significantly, it's a new line
      if (lastY !== null && Math.abs(y - lastY) > 5) {
        if (currentLine.trim()) {
          paragraphs.push(currentLine.trim());
        }
        currentLine = textItem.str;
      } else {
        // Same line, append with space if needed
        if (currentLine && !currentLine.endsWith(' ') && !textItem.str.startsWith(' ')) {
          currentLine += ' ';
        }
        currentLine += textItem.str;
      }
      lastY = y;
    }

    // Push remaining line
    if (currentLine.trim()) {
      paragraphs.push(currentLine.trim());
    }

    // Add page separator for multi-page PDFs
    if (pageNum < pdf.numPages) {
      paragraphs.push('');
      paragraphs.push('---');
      paragraphs.push('');
    }
  }

  // Join paragraphs with double newlines for Markdown formatting
  const content = paragraphs.join('\n\n');

  return { title, content };
}
