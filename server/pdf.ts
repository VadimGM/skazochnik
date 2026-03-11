import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import type { StoryPage } from "@shared/schema";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

let fontBase64: string | null = null;

function loadFont(): string {
  if (fontBase64) return fontBase64;
  const fontPath = path.join(process.cwd(), "server", "assets", "Roboto-Regular.ttf");
  const buffer = fs.readFileSync(fontPath);
  fontBase64 = buffer.toString("base64");
  return fontBase64;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string[] {
  doc.setFontSize(fontSize);
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = doc.getTextWidth(testLine);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; format: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = res.headers.get("content-type") || "";
    let format = "PNG";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) format = "JPEG";
    else if (contentType.includes("webp")) format = "WEBP";
    return { data: base64, format };
  } catch {
    return null;
  }
}

export async function generateStoryPdf(
  title: string,
  pages: StoryPage[],
  childName: string,
): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const font = loadFont();
  doc.addFileToVFS("Roboto-Regular.ttf", font);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.setFont("Roboto", "normal");

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const text = page.text.replace(/\{name\}/g, childName);

    if (i > 0) doc.addPage();
    doc.setFont("Roboto", "normal");

    let imgData: { data: string; format: string } | null = null;
    if (page.imageUrl) {
      imgData = await fetchImageAsBase64(page.imageUrl);
    }

    if (page.type === "cover") {
      if (imgData) {
        const imgH = PAGE_H - 60;
        doc.addImage(
          `data:image/${imgData.format.toLowerCase()};base64,${imgData.data}`,
          imgData.format,
          0, 0, PAGE_W, imgH, undefined, "FAST",
        );
      }
      doc.setFontSize(28);
      doc.setTextColor(90, 50, 140);
      const coverTitle = page.title || title || "";
      const titleLines = wrapText(doc, coverTitle, CONTENT_W, 28);
      let titleY = imgData ? PAGE_H - 50 : PAGE_H / 2 - 20;
      for (const line of titleLines) {
        doc.text(line, PAGE_W / 2, titleY, { align: "center" });
        titleY += 12;
      }
      doc.setFontSize(14);
      doc.setTextColor(130, 100, 160);
      const subtitleLines = wrapText(doc, text, CONTENT_W, 14);
      let subY = titleY + 5;
      for (const line of subtitleLines) {
        doc.text(line, PAGE_W / 2, subY, { align: "center" });
        subY += 7;
      }
    } else if (page.type === "end") {
      const endY = PAGE_H / 2 - 20;
      doc.setFontSize(36);
      doc.setTextColor(90, 50, 140);
      doc.text("Конец", PAGE_W / 2, endY, { align: "center" });
      const afterText = text.replace(/^Конец\.?\s*/, "");
      if (afterText) {
        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        const endLines = wrapText(doc, afterText, CONTENT_W, 14);
        let lineY = endY + 15;
        for (const line of endLines) {
          doc.text(line, PAGE_W / 2, lineY, { align: "center" });
          lineY += 7;
        }
      }
    } else {
      let textStartY = MARGIN;
      if (imgData) {
        const imgDisplayH = PAGE_H * 0.5;
        doc.addImage(
          `data:image/${imgData.format.toLowerCase()};base64,${imgData.data}`,
          imgData.format,
          0, 0, PAGE_W, imgDisplayH, undefined, "FAST",
        );
        textStartY = imgDisplayH + 10;
      }
      doc.setFontSize(13);
      doc.setTextColor(50, 50, 50);
      const textLines = wrapText(doc, text, CONTENT_W, 13);
      let lineY = textStartY;
      for (const line of textLines) {
        if (lineY > PAGE_H - MARGIN) break;
        doc.text(line, MARGIN, lineY);
        lineY += 7;
      }
    }
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
