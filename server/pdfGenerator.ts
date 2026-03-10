import PDFDocument from "pdfkit";
import path from "path";
import { log } from "./index";

const FONT_REGULAR = path.join(process.cwd(), "server/fonts/DejaVuSerif.ttf");
const FONT_BOLD = path.join(process.cwd(), "server/fonts/DejaVuSerif-Bold.ttf");

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface StoryPage {
  type: string;
  text: string;
  imageUrl: string;
  title?: string;
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    log(`[PDF] Ошибка загрузки изображения: ${err.message}`, "pdf");
    return null;
  }
}

export async function generateStoryPDF(
  pages: StoryPage[],
  title: string,
  childName: string
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        bufferPages: true,
      });

      doc.registerFont("Serif", FONT_REGULAR);
      doc.registerFont("SerifBold", FONT_BOLD);

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const text = page.text.replace(/\{name\}/g, childName);

        if (i > 0) doc.addPage({ size: "A4", margin: 0 });

        let imgBuffer: Buffer | null = null;
        if (page.imageUrl) {
          imgBuffer = await fetchImageBuffer(page.imageUrl);
        }

        if (page.type === "cover") {
          renderCover(doc, page, text, title, imgBuffer);
        } else if (page.type === "end") {
          renderEnd(doc, text, imgBuffer);
        } else {
          renderContent(doc, text, imgBuffer);
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function renderCover(
  doc: PDFKit.PDFDocument,
  page: StoryPage,
  text: string,
  title: string,
  imgBuffer: Buffer | null
) {
  if (imgBuffer) {
    try {
      doc.image(imgBuffer, 0, 0, { width: PAGE_W, height: PAGE_H * 0.75 });
    } catch {}
  }

  doc.save();
  doc.rect(0, PAGE_H * 0.65, PAGE_W, PAGE_H * 0.35).fill("#ffffff");
  doc.restore();

  const displayTitle = page.title || title || "";
  doc.font("SerifBold").fontSize(32).fillColor("#5a328c");
  const titleY = PAGE_H - 120;
  doc.text(displayTitle, MARGIN, titleY, {
    width: CONTENT_W,
    align: "center",
    lineGap: 6,
  });

  doc.font("Serif").fontSize(14).fillColor("#826aa0");
  doc.text(text, MARGIN, titleY + 50, {
    width: CONTENT_W,
    align: "center",
  });
}

function renderEnd(
  doc: PDFKit.PDFDocument,
  text: string,
  imgBuffer: Buffer | null
) {
  if (imgBuffer) {
    try {
      doc.image(imgBuffer, 0, 0, { width: PAGE_W, height: PAGE_H * 0.55 });
    } catch {}
  }

  doc.save();
  doc.rect(0, PAGE_H * 0.50, PAGE_W, PAGE_H * 0.50).fill("#ffffff");
  doc.restore();

  const endY = imgBuffer ? PAGE_H * 0.55 : PAGE_H * 0.35;

  doc.font("SerifBold").fontSize(42).fillColor("#5a328c");
  doc.text("\u041A\u043E\u043D\u0435\u0446", MARGIN, endY, {
    width: CONTENT_W,
    align: "center",
  });

  const afterText = text.replace(/^Конец\.?\s*/, "");
  if (afterText) {
    doc.font("Serif").fontSize(16).fillColor("#666666");
    doc.text(afterText, MARGIN + 30, endY + 60, {
      width: CONTENT_W - 60,
      align: "center",
      lineGap: 6,
    });
  }
}

function renderContent(
  doc: PDFKit.PDFDocument,
  text: string,
  imgBuffer: Buffer | null
) {
  let textStartY = MARGIN;

  if (imgBuffer) {
    const imgH = PAGE_H * 0.52;
    try {
      doc.image(imgBuffer, 0, 0, { width: PAGE_W, height: imgH });
    } catch {}
    textStartY = imgH + 15;
  }

  doc.save();
  doc.rect(0, textStartY - 5, PAGE_W, PAGE_H - textStartY + 5).fill("#ffffff");
  doc.restore();

  doc.font("Serif").fontSize(14).fillColor("#333333");
  doc.text(text, MARGIN + 10, textStartY + 10, {
    width: CONTENT_W - 20,
    align: "left",
    lineGap: 8,
  });
}
