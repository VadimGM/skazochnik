import { useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Share2, Download, RotateCcw, ImageIcon, BookOpen, Sparkles, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import robotoFontUrl from "@/assets/fonts/Roboto-Regular.ttf";

interface StoryPage {
  type: "cover" | "content" | "end";
  text: string;
  imageUrl: string;
  title?: string;
}

interface StoryViewerProps {
  onReset: () => void;
  onRegenerate?: () => void;
  formData: any;
  storyData: {
    id: string;
    title: string;
    pages: StoryPage[];
    childName: string;
  };
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadFontAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function wrapText(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string[] {
  doc.setFontSize(fontSize);
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (doc.getTextWidth(test) > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function StoryViewer({ onReset, onRegenerate, formData, storyData }: StoryViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const { toast } = useToast();

  const pages = storyData.pages || [];

  const nextPage = () => {
    if (currentPage < pages.length - 1) setCurrentPage(p => p + 1);
  };

  const prevPage = () => {
    if (currentPage > 0) setCurrentPage(p => p - 1);
  };

  if (pages.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center py-20">
        <BookOpen size={64} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">Сказка пуста. Попробуйте создать новую.</p>
        <Button onClick={onReset} className="mt-6 rounded-2xl" data-testid="button-new-story-empty">Новая сказка</Button>
      </div>
    );
  }

  const currentContent = pages[currentPage];
  const childName = storyData.childName || formData?.childName || "Герой";
  const formattedText = currentContent.text.replace(/\{name\}/g, childName);
  const isCover = currentContent.type === "cover";
  const isEnd = currentContent.type === "end";
  const isLastPage = currentPage === pages.length - 1;

  const handleShare = async () => {
    const url = `${window.location.origin}/story/${storyData.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Ссылка скопирована!", description: "Поделитесь ссылкой с друзьями и близкими." });
    } catch {
      toast({ title: "Ссылка", description: url });
    }
  };

  const handleRegenerate = async () => {
    if (onRegenerate) {
      onRegenerate();
      return;
    }
    try {
      const res = await fetch(`/api/stories/${storyData.id}/regenerate`, { method: "POST" });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      toast({ title: "Ошибка", description: "Не удалось перегенерировать сказку", variant: "destructive" });
    }
  };

  const handleDownloadPDF = useCallback(async () => {
    if (pdfLoading || pages.length === 0) return;
    setPdfLoading(true);
    toast({ title: "Создаём PDF...", description: "Загружаем иллюстрации, подождите немного." });

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 210;
      const pageH = 297;
      const margin = 15;
      const contentW = pageW - margin * 2;

      const fontBase64 = await loadFontAsBase64(robotoFontUrl);
      doc.addFileToVFS("Roboto-Regular.ttf", fontBase64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.setFont("Roboto", "normal");

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const text = page.text.replace(/\{name\}/g, childName);

        if (i > 0) doc.addPage();
        doc.setFont("Roboto", "normal");

        let imgDataUrl: string | null = null;
        if (page.imageUrl) {
          imgDataUrl = await loadImageAsDataUrl(page.imageUrl);
        }

        if (page.type === "cover") {
          if (imgDataUrl) {
            const imgH = pageH - 60;
            doc.addImage(imgDataUrl, "PNG", 0, 0, pageW, imgH, undefined, "FAST");
          }
          doc.setFontSize(28);
          doc.setTextColor(90, 50, 140);
          const title = page.title || storyData.title || "";
          const titleLines = wrapText(doc, title, contentW, 28);
          let titleY = imgDataUrl ? pageH - 50 : pageH / 2 - 20;
          for (const line of titleLines) {
            doc.text(line, pageW / 2, titleY, { align: "center" });
            titleY += 12;
          }
          doc.setFontSize(14);
          doc.setTextColor(130, 100, 160);
          const subtitleLines = wrapText(doc, text, contentW, 14);
          let subY = titleY + 5;
          for (const line of subtitleLines) {
            doc.text(line, pageW / 2, subY, { align: "center" });
            subY += 7;
          }
        } else if (page.type === "end") {
          const endY = pageH / 2 - 20;
          doc.setFontSize(36);
          doc.setTextColor(90, 50, 140);
          doc.text("Конец", pageW / 2, endY, { align: "center" });
          const afterText = text.replace(/^Конец\.?\s*/, "");
          if (afterText) {
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            const endLines = wrapText(doc, afterText, contentW, 14);
            let lineY = endY + 15;
            for (const line of endLines) {
              doc.text(line, pageW / 2, lineY, { align: "center" });
              lineY += 7;
            }
          }
        } else {
          let textStartY = margin;
          if (imgDataUrl) {
            const imgDisplayH = pageH * 0.5;
            doc.addImage(imgDataUrl, "PNG", 0, 0, pageW, imgDisplayH, undefined, "FAST");
            textStartY = imgDisplayH + 10;
          }
          doc.setFontSize(13);
          doc.setTextColor(50, 50, 50);
          const textLines = wrapText(doc, text, contentW, 13);
          let lineY = textStartY;
          for (const line of textLines) {
            if (lineY > pageH - margin) break;
            doc.text(line, margin, lineY);
            lineY += 7;
          }
        }
      }

      const filename = `${storyData.title || "Сказка"}.pdf`;
      doc.save(filename);
      toast({ title: "PDF готов!", description: "Файл скачан на ваше устройство." });
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast({ title: "Ошибка", description: "Не удалось создать PDF", variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  }, [pages, childName, storyData, pdfLoading, toast]);

  if (isCover) {
    return (
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
        <div className="w-full glass-panel rounded-[2rem] overflow-hidden book-shadow relative flex flex-col">
          <div className="relative w-full">
            {currentContent.imageUrl ? (
              <img
                src={currentContent.imageUrl}
                alt="Обложка"
                data-testid="img-cover"
                className="w-full h-auto object-contain"
              />
            ) : (
              <div className="w-full aspect-[3/4] bg-gradient-to-br from-primary/20 via-primary/5 to-accent/10" />
            )}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 z-10 p-8 md:p-12 text-center">
              <div className="mb-4">
                <Sparkles size={32} className="text-white/80 animate-pulse mx-auto" />
              </div>
              <h2 data-testid="text-story-title" className="text-3xl md:text-5xl lg:text-6xl font-black font-serif text-white leading-tight mb-3 drop-shadow-2xl">
                {currentContent.title || storyData.title}
              </h2>
              <p className="text-lg md:text-xl text-white/90 font-serif italic drop-shadow-lg">
                {formattedText}
              </p>
            </div>
          </div>

          {pages.length > 1 && (
            <div
              onClick={nextPage}
              data-testid="nav-next-cover"
              className="absolute right-0 top-0 w-1/4 h-full z-20 cursor-pointer flex items-center justify-end px-8 opacity-0 hover:opacity-100 transition-all duration-300"
            >
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-full text-primary shadow-lg hover:scale-110 transition-transform">
                <ChevronRight size={36} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          {pages.map((_, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentPage(idx)}
              className={cn(
                "h-2 rounded-full transition-all duration-300 cursor-pointer",
                idx === currentPage ? "w-8 bg-primary" : "w-2 bg-primary/20 hover:bg-primary/40"
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center animate-in fade-in duration-500">

      <div className="w-full glass-panel rounded-[2rem] overflow-hidden book-shadow flex flex-col lg:flex-row relative group min-h-[600px] xl:min-h-[700px]">

        {currentPage > 0 && (
          <div
            onClick={prevPage}
            data-testid="nav-prev-desktop"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 cursor-pointer hidden lg:flex opacity-0 hover:opacity-100 transition-all duration-300"
          >
            <div className="bg-white/80 backdrop-blur-md p-3 rounded-full text-primary shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-110 transition-transform">
              <ChevronLeft size={28} />
            </div>
          </div>
        )}

        {!isLastPage && (
          <div
            onClick={nextPage}
            data-testid="nav-next-desktop"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 cursor-pointer hidden lg:flex opacity-0 hover:opacity-100 transition-all duration-300"
          >
            <div className="bg-white/80 backdrop-blur-md p-3 rounded-full text-primary shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-110 transition-transform">
              <ChevronRight size={28} />
            </div>
          </div>
        )}

        {isEnd ? (
          <div className="w-full flex flex-col items-center justify-center p-12 md:p-20 min-h-[600px] relative bg-gradient-to-br from-white via-primary/5 to-white">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
              <svg viewBox="0 0 400 400" className="w-[80%] h-[80%] text-primary">
                <defs>
                  <pattern id="vignette-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="20" cy="20" r="1.5" fill="currentColor" />
                    <path d="M0 20 Q10 10 20 0 Q30 10 40 20 Q30 30 20 40 Q10 30 0 20Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="400" height="400" fill="url(#vignette-pattern)" />
              </svg>
            </div>

            <div className="relative z-10 text-center max-w-2xl">
              <div className="mb-6 flex justify-center">
                <svg viewBox="0 0 120 20" className="w-32 text-primary/30">
                  <path d="M0 10 Q15 0 30 10 Q45 20 60 10 Q75 0 90 10 Q105 20 120 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>

              <Sparkles className="mx-auto mb-4 text-primary/40" size={32} />

              <h2 className="text-5xl md:text-7xl font-black font-serif text-foreground mb-8" data-testid="text-end">
                Конец
              </h2>
              <p className="text-xl md:text-2xl font-serif text-foreground/70 italic leading-relaxed">
                {formattedText.replace(/^Конец\.?\s*/, "")}
              </p>

              <div className="mt-6 flex justify-center">
                <svg viewBox="0 0 120 20" className="w-32 text-primary/30">
                  <path d="M0 10 Q15 0 30 10 Q45 20 60 10 Q75 0 90 10 Q105 20 120 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>

              <div className="mt-16 flex flex-wrap items-center justify-center gap-4">
                <Button data-testid="button-download-pdf" onClick={handleDownloadPDF} disabled={pdfLoading} className="rounded-2xl h-14 px-6 bg-white border-2 border-white shadow-sm hover:border-primary/30 hover:bg-white/80 text-foreground font-semibold text-base transition-all">
                  {pdfLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 text-primary animate-spin" />
                  ) : (
                    <Download className="mr-2 h-5 w-5 text-primary" />
                  )}
                  {pdfLoading ? "Создаём PDF..." : "Скачать в PDF"}
                </Button>
                <Button data-testid="button-share" onClick={handleShare} className="rounded-2xl h-14 px-6 bg-white border-2 border-white shadow-sm hover:border-primary/30 hover:bg-white/80 text-foreground font-semibold text-base transition-all">
                  <Share2 className="mr-2 h-5 w-5 text-primary" />
                  Поделиться
                </Button>
                <Button data-testid="button-regenerate" onClick={handleRegenerate} className="rounded-2xl h-14 px-6 bg-white border-2 border-white shadow-sm hover:border-primary/30 hover:bg-white/80 text-foreground font-semibold text-base transition-all">
                  <RotateCcw className="mr-2 h-5 w-5 text-primary" />
                  Перегенерировать
                </Button>
                <Button data-testid="button-new-story" onClick={onReset} className="rounded-2xl h-14 px-8 bg-primary hover:bg-primary/90 text-white shadow-md transition-all font-bold text-base">
                  <Plus className="mr-2 h-5 w-5" />
                  Новая сказка
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full lg:w-[55%] h-[400px] lg:h-auto relative overflow-hidden bg-muted/30 flex-shrink-0">
              {currentContent.imageUrl ? (
                <img
                  src={currentContent.imageUrl}
                  alt="Иллюстрация"
                  data-testid={`img-page-${currentPage}`}
                  className="w-full h-full object-cover transition-all duration-[1.5s] ease-out animate-in fade-in zoom-in-[0.98]"
                  key={`img-${currentPage}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                  <ImageIcon size={64} className="text-primary/20" />
                </div>
              )}
              <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-black/10 to-transparent pointer-events-none hidden lg:block mix-blend-multiply" />
            </div>

            <div className="w-full lg:w-[45%] p-8 md:p-12 lg:p-14 flex flex-col bg-white/50 relative">
              <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto">
                <p
                  key={`text-${currentPage}`}
                  data-testid={`text-page-${currentPage}`}
                  className="text-lg lg:text-xl font-serif leading-relaxed lg:leading-[1.9] text-foreground/80 animate-in fade-in slide-in-from-right-8 duration-700
                             first-letter:text-6xl first-letter:font-black first-letter:text-primary first-letter:mr-3 first-letter:float-left first-letter:mt-1 first-letter:leading-none"
                >
                  {formattedText}
                </p>
              </div>

              <div className="mt-12 flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-serif">{currentPage + 1} / {pages.length}</span>
                <div className="flex items-center gap-2">
                  {pages.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => setCurrentPage(idx)}
                      className={cn(
                        "h-2 rounded-full transition-all duration-300 cursor-pointer",
                        idx === currentPage ? "w-6 bg-primary" : "w-2 bg-primary/20 hover:bg-primary/40"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex lg:hidden items-center justify-center gap-6 w-full mt-8">
        <Button variant="outline" size="icon" onClick={prevPage} disabled={currentPage === 0} data-testid="nav-prev-mobile" className="rounded-full w-14 h-14 bg-white/50 backdrop-blur border-white">
          <ChevronLeft size={24} />
        </Button>
        <span className="text-sm font-bold text-muted-foreground font-serif tracking-widest">{currentPage + 1} / {pages.length}</span>
        <Button variant="outline" size="icon" onClick={nextPage} disabled={isLastPage} data-testid="nav-next-mobile" className="rounded-full w-14 h-14 bg-white/50 backdrop-blur border-white">
          <ChevronRight size={24} />
        </Button>
      </div>
    </div>
  );
}
