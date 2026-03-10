import { useEffect, useState } from "react";
import { Sparkles, Stars, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StoryLoading() {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  
  const messages = [
    "Анализируем фотографию...",
    "Рисуем главного героя...",
    "Придумываем увлекательный сюжет...",
    "Создаем волшебные иллюстрации...",
    "Добавляем последние штрихи магии...",
  ];

  useEffect(() => {
    const duration = 4500; // Mock 4.5s loading
    const interval = 50;
    const steps = duration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          return 100;
        }
        return p + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-2xl mx-auto glass-panel rounded-[3rem] p-12">
      
      {/* Animated Centerpiece */}
      <div className="relative mb-16 mt-8 flex items-center justify-center">
        {/* Glow rings */}
        <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full w-48 h-48 animate-pulse"></div>
        <div className="absolute inset-0 bg-accent/30 blur-[40px] rounded-full w-32 h-32 animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        {/* Core elements */}
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-20 h-20 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl animate-bounce" style={{ animationDuration: '2s' }}>
            <ImageIcon className="text-primary w-10 h-10" />
          </div>
          
          <div className="flex gap-2">
            {[1,2,3].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}></div>
            ))}
          </div>
          
          <div className="w-20 h-20 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.2s' }}>
            <Stars className="text-accent-foreground w-10 h-10" />
          </div>
        </div>

        {/* Orbiting sparkles */}
        <div className="absolute top-[-20px] left-[-20px] text-accent animate-[spin_4s_linear_infinite] origin-[80px_80px]">
          <Sparkles size={20} className="animate-pulse" />
        </div>
        <div className="absolute bottom-[-20px] right-[-20px] text-primary animate-[spin_3s_linear_infinite_reverse] origin-[-60px_-60px]">
          <Sparkles size={24} className="animate-pulse" />
        </div>
      </div>

      {/* Loading Text */}
      <div className="h-20 flex flex-col items-center justify-center w-full relative">
        {messages.map((msg, i) => (
          <h3 
            key={i}
            className={cn(
              "text-2xl md:text-3xl font-serif font-bold text-foreground text-center absolute transition-all duration-500",
              i === messageIndex ? "opacity-100 transform-none" : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            {msg}
          </h3>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md h-4 bg-white/50 backdrop-blur-sm rounded-full mt-8 overflow-hidden border border-white/80 shadow-inner relative">
        <div 
          className="h-full bg-gradient-to-r from-primary via-accent-foreground to-primary rounded-full transition-all duration-75 ease-linear relative"
          style={{ width: `${progress}%`, backgroundSize: '200% 100%', animation: 'gradientMove 2s linear infinite' }}
        >
          {/* Shimmer effect inside progress bar */}
          <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-[50%] animate-[shimmer_1.5s_infinite]"></div>
        </div>
      </div>
      
      <p className="mt-4 text-muted-foreground font-medium text-sm">
        {Math.round(progress)}%
      </p>

    </div>
  );
}