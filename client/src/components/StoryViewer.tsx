import { useState } from "react";
import { ChevronLeft, ChevronRight, Share2, Download, RotateCcw, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import page1Img from "@/assets/images/story-page-1.png";
import page2Img from "@/assets/images/story-page-2.png";
import page3Img from "@/assets/images/story-page-3.png";

const MOCK_STORY = [
  {
    title: "Тайна Волшебного Леса",
    text: "Жил-был на свете отважный ребенок по имени {name}. {name} очень любил исследовать мир вокруг. Однажды, гуляя за деревней, {name} нашел тропинку, которая вела в самую чащу Волшебного Леса. Деревья там шептались друг с другом, а солнечные лучи танцевали на мшистых камнях. {name} не испугался, а смело шагнул вперед.",
    image: page1Img
  },
  {
    text: "Вскоре на поляне появился говорящий лисенок Рыжик. Рыжик выглядел грустным. 'Я потерял свою любимую светящуюся шишку', — вздохнул лисенок. 'Не волнуйся, мы найдем ее вместе!' — ответил {name}, ведь настоящая дружба познается в беде. Они отправились на поиски вглубь леса.",
    image: page2Img
  },
  {
    text: "Пройдя через густые заросли папоротника, они обнаружили небольшую пещеру. Внутри, освещая каменные стены мягким золотистым светом, лежал сундук. А рядом светилась та самая шишка! Лисенок так обрадовался, что обнял своего спасителя. В этот день {name} понял, что делать добро — это самое большое волшебство на свете.",
    image: page3Img
  }
];

interface StoryViewerProps {
  onReset: () => void;
  formData: any;
}

export default function StoryViewer({ onReset, formData }: StoryViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const nextPage = () => {
    if (currentPage < MOCK_STORY.length - 1) setCurrentPage(p => p + 1);
  };

  const prevPage = () => {
    if (currentPage > 0) setCurrentPage(p => p - 1);
  };

  const currentContent = MOCK_STORY[currentPage];
  const childName = formData?.childName || "Максим";
  
  // Replace placeholder {name} with actual name
  const formattedText = currentContent.text.replace(/{name}/g, childName);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
      
      {/* Main Book Container */}
      <div className="w-full glass-panel rounded-[2rem] overflow-hidden book-shadow flex flex-col lg:flex-row relative group min-h-[600px] xl:min-h-[700px]">
        
        {/* Navigation Overlays for Desktop */}
        <div 
          onClick={prevPage}
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
          className={cn(
            "absolute right-0 top-0 w-1/6 h-full z-20 cursor-pointer hidden lg:flex items-center justify-end px-6 opacity-0 hover:opacity-100 transition-all duration-300",
            currentPage === MOCK_STORY.length - 1 ? "hidden" : ""
          )}
        >
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-full text-primary shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-110 transition-transform">
            <ChevronRight size={36} />
          </div>
        </div>

        {/* Left Side: Illustration */}
        <div className="w-full lg:w-1/2 h-[400px] lg:h-auto relative overflow-hidden bg-muted/30 flex-shrink-0">
          <img 
            src={currentContent.image} 
            alt="Иллюстрация" 
            className="w-full h-full object-cover transition-all duration-[1.5s] ease-out animate-in fade-in zoom-in-[0.98]"
            key={`img-${currentPage}`}
          />
          
          {/* Mock indication of photo mapping */}
          {formData?.photo && currentPage === 0 && (
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl text-xs font-semibold text-primary flex items-center gap-2 shadow-lg animate-in fade-in zoom-in delay-500 duration-500">
              <ImageIcon size={14} />
              Лицо создано по фото
            </div>
          )}

          {/* Book fold shadow gradient */}
          <div className="absolute top-0 right-0 w-12 h-full bg-gradient-to-l from-black/10 to-transparent pointer-events-none hidden lg:block mix-blend-multiply"></div>
        </div>

        {/* Right Side: Text */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col bg-white/50 relative">
          
          {currentContent.title && (
            <div className="mb-10 text-center animate-in fade-in slide-in-from-top-4" key={`title-${currentPage}`}>
              <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm tracking-widest uppercase mb-4">
                Глава 1
              </div>
              <h2 className="text-4xl lg:text-5xl font-black font-serif text-foreground leading-tight">
                {currentContent.title}
              </h2>
            </div>
          )}

          <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto">
            <p 
              key={`text-${currentPage}`}
              className="text-lg lg:text-2xl font-serif leading-relaxed lg:leading-[1.8] text-foreground/80 animate-in fade-in slide-in-from-right-8 duration-700
                         first-letter:text-7xl first-letter:font-black first-letter:text-primary first-letter:mr-3 first-letter:float-left first-letter:mt-2 first-letter:leading-none"
            >
              {formattedText}
            </p>
          </div>

          {/* Page indicator */}
          <div className="mt-16 flex items-center justify-center gap-2">
            {MOCK_STORY.map((_, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  idx === currentPage ? "w-8 bg-primary" : "w-2 bg-primary/20"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="flex lg:hidden items-center justify-center gap-6 w-full mt-8">
        <Button variant="outline" size="icon" onClick={prevPage} disabled={currentPage === 0} className="rounded-full w-14 h-14 bg-white/50 backdrop-blur border-white">
          <ChevronLeft size={24} />
        </Button>
        <span className="text-sm font-bold text-muted-foreground font-serif tracking-widest">{currentPage + 1} / {MOCK_STORY.length}</span>
        <Button variant="outline" size="icon" onClick={nextPage} disabled={currentPage === MOCK_STORY.length - 1} className="rounded-full w-14 h-14 bg-white/50 backdrop-blur border-white">
          <ChevronRight size={24} />
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 w-full">
        <div className="flex gap-4 w-full sm:w-auto">
          <Button className="flex-1 sm:flex-none rounded-2xl h-14 px-6 bg-white border-2 border-white shadow-sm hover:border-primary/30 hover:bg-white/80 text-foreground font-semibold text-base transition-all">
            <Download className="mr-2 h-5 w-5 text-primary" />
            PDF
          </Button>
          <Button className="flex-1 sm:flex-none rounded-2xl h-14 px-6 bg-white border-2 border-white shadow-sm hover:border-primary/30 hover:bg-white/80 text-foreground font-semibold text-base transition-all">
            <Share2 className="mr-2 h-5 w-5 text-primary" />
            Поделиться
          </Button>
        </div>
        <Button onClick={onReset} className="w-full sm:w-auto clay-button rounded-2xl h-14 px-8 bg-primary hover:bg-primary/90 text-white shadow-md transition-all font-bold text-base">
          <RotateCcw className="mr-2 h-5 w-5" />
          Новая сказка
        </Button>
      </div>

    </div>
  );
}