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

function getImageDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    if (buffer[0] === 0x89 && buffer[1] === 0x50) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      let offset = 2;
      while (offset < buffer.length - 1) {
        if (buffer[offset] !== 0xFF) break;
        const marker = buffer[offset + 1];
        if (marker === 0xC0 || marker === 0xC2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        const segLen = buffer.readUInt16BE(offset + 2);
        offset += 2 + segLen;
      }
    }
  } catch {}
  return null;
}

function fitImage(
  imgW: number, imgH: number,
  maxW: number, maxH: number,
): { w: number; h: number; x: number; y: number } {
  const ratio = Math.min(maxW / imgW, maxH / imgH);
  const w = imgW * ratio;
  const h = imgH * ratio;
  const x = (maxW - w) / 2;
  const y = 0;
  return { w, h, x, y };
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; format: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const base64 = buffer.toString("base64");
    const contentType = res.headers.get("content-type") || "";
    let format = "PNG";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) format = "JPEG";
    else if (contentType.includes("webp")) format = "WEBP";
    const dims = getImageDimensions(buffer);
    const width = dims?.width || 1024;
    const height = dims?.height || 1024;
    return { data: base64, format, width, height };
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

    let imgData: { data: string; format: string; width: number; height: number } | null = null;
    if (page.imageUrl) {
      imgData = await fetchImageAsBase64(page.imageUrl);
    }

    if (page.type === "cover") {
      const coverImgMaxW = PAGE_W;
      const coverImgMaxH = PAGE_H * 0.55;
      let imageEndY = 25;
      if (imgData) {
        const fit = fitImage(imgData.width, imgData.height, coverImgMaxW, coverImgMaxH);
        doc.addImage(
          `data:image/${imgData.format.toLowerCase()};base64,${imgData.data}`,
          imgData.format,
          fit.x, 25, fit.w, fit.h, undefined, "FAST",
        );
        imageEndY = 25 + fit.h;
      }
      const titleStartY = imageEndY + 12;
      doc.setFontSize(28);
      doc.setTextColor(90, 50, 140);
      const coverTitle = page.title || title || "";
      const titleLines = wrapText(doc, coverTitle, CONTENT_W, 28);
      let titleY = titleStartY;
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
      doc.setDrawColor(180, 140, 200);
      doc.setLineWidth(0.3);
      
      doc.line(MARGIN, PAGE_H / 2 - 50, PAGE_W - MARGIN, PAGE_H / 2 - 50);
      doc.line(MARGIN, PAGE_H / 2 + 50, PAGE_W - MARGIN, PAGE_H / 2 + 50);
      
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
      
      doc.setFontSize(11);
      doc.setTextColor(120, 100, 140);
      doc.text("GVM-aistudio", PAGE_W / 2, PAGE_H - 20, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(150, 130, 160);
      doc.text("Logo & brand identity design", PAGE_W / 2, PAGE_H - 15, { align: "center" });
    } else {
      const imgTopMargin = 25;
      const imgBottomMargin = 10;
      const imgMaxW = PAGE_W - MARGIN * 2;
      const imgMaxH = PAGE_H * 0.65;
      
      if (imgData) {
        const fit = fitImage(imgData.width, imgData.height, imgMaxW, imgMaxH);
        const imgX = MARGIN + (imgMaxW - fit.w) / 2;
        const imgY = imgTopMargin;
        doc.addImage(
          `data:image/${imgData.format.toLowerCase()};base64,${imgData.data}`,
          imgData.format,
          imgX, imgY, fit.w, fit.h, undefined, "FAST",
        );
      }
      
      const textStartY = imgTopMargin + imgMaxH + imgBottomMargin;
      const textMaxH = PAGE_H - textStartY - MARGIN;
      
      doc.setFont("Roboto", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(50, 50, 50);
      const textLines = wrapText(doc, text, CONTENT_W, 11);
      let lineY = textStartY;
      for (const line of textLines) {
        if (lineY > PAGE_H - MARGIN - 2) break;
        doc.text(line, MARGIN, lineY);
        lineY += 5.5;
      }
    }
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
