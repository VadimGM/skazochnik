import { useState } from "react";
import { ChevronLeft, ChevronRight, Share2, Download, RotateCcw, ImageIcon, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface StoryPage {
  text: string;
  imageUrl: string;
  title?: string;
}

interface StoryViewerProps {
  onReset: () => void;
  formData: any;
  storyData: {
    id: string;
    title: string;
    pages: StoryPage[];
    childName: string;
  };
}

export default function StoryViewer({ onReset, formData, storyData }: StoryViewerProps) {
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
        <Button onClick={onReset} className="mt-6 rounded-2xl">Новая сказка</Button>
      </div>
    );
  }

  const currentContent = pages[currentPage];
  const childName = storyData.childName || formData?.childName || "Герой";
  const formattedText = currentContent.text.replace(/\{name\}/g, childName);

  const handleShare = async () => {
    const url = `${window.location.origin}/story/${storyData.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Ссылка скопирована!", description: "Поделитесь ссылкой с друзьями и близкими." });
    } catch {
      toast({ title: "Ссылка", description: url });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
      
      <div className="w-full glass-panel rounded-[2rem] overflow-hidden book-shadow flex flex-col lg:flex-row relative group min-h-[600px] xl:min-h-[700px]">
        
        <div 
          onClick={prevPage}
          data-testid="nav-prev-desktop"
          className={cn(
            "absolute left-0 top-0 w-1/6 h-full z-20 cursor-pointer hidden lg:flex items-center justify-start px-6 opacity-0 hover:opacity-100 transition-all duration-300",
            currentPage === 0 ? "hidden" : ""
          )}
        >
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-full text-primary shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-110 transition-transform">
            <ChevronLeft size={36} />
          </div>
        </div>

        <div 
          onClick={nextPage}
          data-testid="nav-next-desktop"
          className={cn(
            "absolute right-0 top-0 w-1/6 h-full z-20 cursor-pointer hidden lg:flex items-center justify-end px-6 opacity-0 hover:opacity-100 transition-all duration-300",
            currentPage === pages.length - 1 ? "hidden" : ""
          )}
        >
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-full text-primary shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-110 transition-transform">
            <ChevronRight size={36} />
          </div>
        </div>

        <div className="w-full lg:w-1/2 h-[400px] lg:h-auto relative overflow-hidden bg-muted/30 flex-shrink-0">
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
          
          {formData?.photo && currentPage === 0 && (
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl text-xs font-semibold text-primary flex items-center gap-2 shadow-lg animate-in fade-in zoom-in delay-500 duration-500">
              <ImageIcon size={14} />
              Персонализированная сказка
            </div>
          )}

          <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-black/10 to-transparent pointer-events-none hidden lg:block mix-blend-multiply"></div>
        </div>

        <div className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col bg-white/50 relative">
          
          {currentContent.title && (
            <div className="mb-10 text-center animate-in fade-in slide-in-from-top-4" key={`title-${currentPage}`}>
              <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm tracking-widest uppercase mb-4">
                {storyData.title}
              </div>
              <h2 data-testid="text-story-title" className="text-4xl lg:text-5xl font-black font-serif text-foreground leading-tight">
                {currentContent.title}
              </h2>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto">
            <p 
              key={`text-${currentPage}`}
              data-testid={`text-page-${currentPage}`}
              className="text-lg lg:text-2xl font-serif leading-relaxed lg:leading-[1.8] text-foreground/80 animate-in fade-in slide-in-from-right-8 duration-700
                         first-letter:text-7xl first-letter:font-black first-letter:text-primary first-letter:mr-3 first-letter:float-left first-letter:mt-2 first-letter:leading-none"
            >
              {formattedText}
            </p>
          </div>

          <div className="mt-16 flex items-center justify-center gap-2">
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
      </div>

      <div className="flex lg:hidden items-center justify-center gap-6 w-full mt-8">
        <Button variant="outline" size="icon" onClick={prevPage} disabled={currentPage === 0} data-testid="nav-prev-mobile" className="rounded-full w-14 h-14 bg-white/50 backdrop-blur border-white">
          <ChevronLeft size={24} />
        </Button>
        <span className="text-sm font-bold text-muted-foreground font-serif tracking-widest">{currentPage + 1} / {pages.length}</span>
        <Button variant="outline" size="icon" onClick={nextPage} disabled={currentPage === pages.length - 1} data-testid="nav-next-mobile" className="rounded-full w-14 h-14 bg-white/50 backdrop-blur border-white">
          <ChevronRight size={24} />
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 w-full">
        <div className="flex gap-4 w-full sm:w-auto">
          <Button data-testid="button-share" onClick={handleShare} className="flex-1 sm:flex-none rounded-2xl h-14 px-6 bg-white border-2 border-white shadow-sm hover:border-primary/30 hover:bg-white/80 text-foreground font-semibold text-base transition-all">
            <Share2 className="mr-2 h-5 w-5 text-primary" />
            Поделиться
          </Button>
        </div>
        <Button data-testid="button-new-story" onClick={onReset} className="w-full sm:w-auto clay-button rounded-2xl h-14 px-8 bg-primary hover:bg-primary/90 text-white shadow-md transition-all font-bold text-base">
          <RotateCcw className="mr-2 h-5 w-5" />
          Новая сказка
        </Button>
      </div>

    </div>
  );
}
