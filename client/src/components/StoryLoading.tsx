import { useEffect, useState } from "react";
import { Sparkles, BookOpen } from "lucide-react";

export default function StoryLoading() {
  const [dots, setDots] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  
  const messages = [
    "Открываем старинную книгу...",
    "Придумываем волшебных персонажей...",
    "Рисуем сказочные леса...",
    "Пишем добрые слова...",
    "Добавляем немного магии...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center animate-in fade-in duration-500 min-h-[400px]">
      
      {/* Animated Book Icon */}
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
        <div className="relative text-primary z-10 page-turn-animation">
          <BookOpen size={100} strokeWidth={1} />
        </div>
        
        {/* Floating sparkles */}
        <div className="absolute -top-4 -right-4 text-accent-foreground animate-bounce" style={{ animationDelay: '0ms' }}>
          <Sparkles size={24} />
        </div>
        <div className="absolute top-1/2 -left-8 text-primary animate-bounce" style={{ animationDelay: '500ms' }}>
          <Sparkles size={16} />
        </div>
        <div className="absolute -bottom-4 right-0 text-secondary-foreground animate-bounce" style={{ animationDelay: '1000ms' }}>
          <Sparkles size={20} />
        </div>
      </div>

      {/* Loading Text */}
      <div className="h-16 flex flex-col items-center">
        <h3 className="text-2xl font-serif font-bold text-foreground text-center mb-2 transition-opacity duration-500">
          {messages[messageIndex]}
        </h3>
        <p className="text-muted-foreground font-medium flex items-center justify-center min-w-[200px]">
          Пожалуйста, подождите
          <span className="w-6 text-left inline-block">{dots}</span>
        </p>
      </div>

      {/* Progress bar mock */}
      <div className="w-64 h-2 bg-muted rounded-full mt-8 overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-[progress_4s_ease-in-out_forwards] w-full origin-left scale-x-0"></div>
      </div>

    </div>
  );
}
