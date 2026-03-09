import { useState } from "react";
import { ChevronLeft, ChevronRight, Share2, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import page1Img from "@/assets/images/story-page-1.png";
import page2Img from "@/assets/images/story-page-2.png";
import page3Img from "@/assets/images/story-page-3.png";

const MOCK_STORY = [
  {
    title: "Тайна Волшебного Леса",
    text: "Жил-был на свете отважный мальчик по имени Максим. Он очень любил исследовать мир вокруг. Однажды, гуляя за деревней, он нашел тропинку, которая вела в самую чащу Волшебного Леса. Деревья там шептались друг с другом, а солнечные лучи танцевали на мшистых камнях. Максим не испугался, а смело шагнул вперед.",
    image: page1Img
  },
  {
    text: "Вскоре на поляне он встретил говорящего лисенка Рыжика. Рыжик выглядел грустным. 'Я потерял свою любимую светящуюся шишку', — вздохнул лисенок. 'Не волнуйся, мы найдем ее вместе!' — ответил Максим, ведь он знал, что настоящая дружба познается в беде. Они отправились на поиски вглубь леса.",
    image: page2Img
  },
  {
    text: "Пройдя через густые заросли папоротника, они обнаружили небольшую пещеру. Внутри, освещая каменные стены мягким золотистым светом, лежал сундук. А рядом светилась та самая шишка! Лисенок так обрадовался, что обнял Максима. В этот день Максим понял, что делать добро — это самое большое волшебство на свете.",
    image: page3Img
  }
];

interface StoryViewerProps {
  onReset: () => void;
}

export default function StoryViewer({ onReset }: StoryViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const nextPage = () => {
    if (currentPage < MOCK_STORY.length - 1) setCurrentPage(p => p + 1);
  };

  const prevPage = () => {
    if (currentPage > 0) setCurrentPage(p => p - 1);
  };

  const currentContent = MOCK_STORY[currentPage];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
      
      {/* Book Container */}
      <div className="w-full bg-card rounded-xl overflow-hidden book-shadow flex flex-col md:flex-row relative group min-h-[600px]">
        
        {/* Navigation Overlays for Desktop */}
        <div 
          onClick={prevPage}
          className={cn(
            "absolute left-0 top-0 w-1/6 h-full z-20 cursor-pointer hidden md:flex items-center justify-start px-4 opacity-0 hover:opacity-100 transition-opacity",
            currentPage === 0 ? "hidden" : ""
          )}
        >
          <div className="bg-background/80 backdrop-blur p-3 rounded-full text-foreground shadow-lg">
            <ChevronLeft size={32} />
          </div>
        </div>

        <div 
          onClick={nextPage}
          className={cn(
            "absolute right-0 top-0 w-1/6 h-full z-20 cursor-pointer hidden md:flex items-center justify-end px-4 opacity-0 hover:opacity-100 transition-opacity",
            currentPage === MOCK_STORY.length - 1 ? "hidden" : ""
          )}
        >
          <div className="bg-background/80 backdrop-blur p-3 rounded-full text-foreground shadow-lg">
            <ChevronRight size={32} />
          </div>
        </div>

        {/* Left Side: Illustration */}
        <div className="w-full md:w-1/2 h-[300px] md:h-auto relative overflow-hidden bg-muted flex-shrink-0">
          <img 
            src={currentContent.image} 
            alt="Иллюстрация" 
            className="w-full h-full object-cover transition-all duration-700 animate-in fade-in zoom-in-95"
            key={`img-${currentPage}`}
          />
          {/* Page fold effect */}
          <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-black/20 to-transparent pointer-events-none hidden md:block"></div>
        </div>

        {/* Right Side: Text */}
        <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col bg-card relative">
          {/* Subtle paper texture over text side */}
          <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-multiply" 
               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")` }}>
          </div>

          {currentContent.title && (
            <h2 className="text-3xl md:text-4xl font-black font-serif text-primary mb-8 text-center" key={`title-${currentPage}`}>
              {currentContent.title}
            </h2>
          )}

          <div className="flex-1 flex flex-col justify-center">
            <p 
              key={`text-${currentPage}`}
              className="text-lg md:text-xl font-serif leading-relaxed text-foreground/90 animate-in fade-in slide-in-from-right-4 duration-500 first-letter:text-5xl first-letter:font-bold first-letter:text-primary first-letter:mr-1 first-letter:float-left"
            >
              {currentContent.text}
            </p>
          </div>

          {/* Page indicator */}
          <div className="mt-12 text-center text-sm font-medium text-muted-foreground">
            — {currentPage + 1} —
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="flex md:hidden items-center justify-between w-full mt-6 px-4">
        <Button variant="outline" size="icon" onClick={prevPage} disabled={currentPage === 0} className="rounded-full">
          <ChevronLeft />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">{currentPage + 1} из {MOCK_STORY.length}</span>
        <Button variant="outline" size="icon" onClick={nextPage} disabled={currentPage === MOCK_STORY.length - 1} className="rounded-full">
          <ChevronRight />
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-8 md:mt-12">
        <Button variant="outline" className="rounded-full h-12 px-6 bg-card border-border hover:bg-secondary transition-colors text-foreground">
          <Download className="mr-2 h-5 w-5" />
          Скачать PDF
        </Button>
        <Button variant="outline" className="rounded-full h-12 px-6 bg-card border-border hover:bg-secondary transition-colors text-foreground">
          <Share2 className="mr-2 h-5 w-5" />
          Поделиться
        </Button>
        <Button onClick={onReset} className="rounded-full h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-colors">
          <RotateCcw className="mr-2 h-5 w-5" />
          Создать новую
        </Button>
      </div>

    </div>
  );
}
