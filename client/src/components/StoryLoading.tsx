import { useEffect, useState } from "react";
import { Sparkles, Stars, Image as ImageIcon, BookOpen, Palette, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StoryLoading() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState("");

  const messages = [
    { text: "Анализируем фотографию героя", icon: ImageIcon },
    { text: "Придумываем увлекательный сюжет", icon: BookOpen },
    { text: "Пишем волшебную сказку", icon: Wand2 },
    { text: "Рисуем сказочные иллюстрации", icon: Palette },
    { text: "Создаём волшебный мир", icon: Stars },
    { text: "Добавляем последние штрихи магии", icon: Sparkles },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [messages.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = messages[messageIndex].icon;

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-2xl mx-auto glass-panel rounded-[3rem] p-12">

      <div className="relative mb-16 mt-8 flex items-center justify-center">
        <div className="absolute inset-0 bg-primary/20 blur-[50px] rounded-full w-48 h-48 animate-pulse" />
        <div className="absolute inset-0 bg-accent/30 blur-[40px] rounded-full w-32 h-32 animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10">
          <div className="w-24 h-24 bg-white/80 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-xl animate-bounce" style={{ animationDuration: '2s' }}>
            <CurrentIcon className="text-primary w-12 h-12" key={messageIndex} />
          </div>
        </div>

        <div className="absolute top-[-20px] left-[-20px] text-accent animate-[spin_4s_linear_infinite] origin-[80px_80px]">
          <Sparkles size={20} className="animate-pulse" />
        </div>
        <div className="absolute bottom-[-20px] right-[-20px] text-primary animate-[spin_3s_linear_infinite_reverse] origin-[-60px_-60px]">
          <Sparkles size={24} className="animate-pulse" />
        </div>
      </div>

      <div className="h-20 flex flex-col items-center justify-center w-full relative">
        {messages.map((msg, i) => (
          <h3
            key={i}
            className={cn(
              "text-2xl md:text-3xl font-serif font-bold text-foreground text-center absolute transition-all duration-700",
              i === messageIndex ? "opacity-100 transform-none" : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            {msg.text}{i === messageIndex ? dots : ""}
          </h3>
        ))}
      </div>

      <div className="w-full max-w-md mt-10">
        <div className="h-2 bg-white/50 backdrop-blur-sm rounded-full overflow-hidden border border-white/80 shadow-inner">
          <div className="h-full bg-gradient-to-r from-primary via-accent-foreground to-primary rounded-full animate-loading-bar" style={{ backgroundSize: '200% 100%' }} />
        </div>
      </div>

      <p className="mt-6 text-muted-foreground text-sm text-center max-w-md leading-relaxed">
        Генерация сказки с иллюстрациями занимает 1–3 минуты. Пожалуйста, не закрывайте страницу.
      </p>
    </div>
  );
}
