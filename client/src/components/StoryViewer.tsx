import { useState } from "react";
import { ChevronLeft, ChevronRight, Share2, Download, RotateCcw, ImageIcon, BookOpen, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

export default function StoryViewer({ onReset, onRegenerate, formData, storyData }: StoryViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
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
            className="absolute left-0 top-0 w-1/6 h-full z-20 cursor-pointer hidden lg:flex items-center justify-start px-6 opacity-0 hover:opacity-100 transition-all duration-300"
          >
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-full text-primary shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-110 transition-transform">
              <ChevronLeft size={36} />
            </div>
          </div>
        )}

        {!isLastPage && (
          <div
            onClick={nextPage}
            data-testid="nav-next-desktop"
            className="absolute right-0 top-0 w-1/6 h-full z-20 cursor-pointer hidden lg:flex items-center justify-end px-6 opacity-0 hover:opacity-100 transition-all duration-300"
          >
            <div className="bg-white/80 backdrop-blur-md p-4 rounded-full text-primary shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-110 transition-transform">
              <ChevronRight size={36} />
            </div>
          </div>
        )}

        {isEnd ? (
          <div className="w-full flex flex-col items-center justify-center p-12 md:p-20 min-h-[600px] relative">
            {currentContent.imageUrl && (
              <>
                <img
                  src={currentContent.imageUrl}
                  alt="Финал"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/50 to-white/30" />
              </>
            )}
            <div className="relative z-10 text-center max-w-2xl">
              <h2 className="text-5xl md:text-7xl font-black font-serif text-foreground mb-8" data-testid="text-end">
                Конец
              </h2>
              <p className="text-xl md:text-2xl font-serif text-foreground/70 italic leading-relaxed">
                {formattedText.replace(/^Конец\.?\s*/, "")}
              </p>

              <div className="mt-16 flex flex-wrap items-center justify-center gap-4">
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
