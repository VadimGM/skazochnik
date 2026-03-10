import { useState } from "react";
import StoryForm from "@/components/StoryForm";
import StoryLoading from "@/components/StoryLoading";
import StoryViewer from "@/components/StoryViewer";
import { Sparkles, Stars } from "lucide-react";

export type StoryState = "idle" | "loading" | "complete";

export default function Home() {
  const [storyState, setStoryState] = useState<StoryState>("idle");
  const [formData, setFormData] = useState<any>(null);

  const handleGenerate = (data: any) => {
    setFormData(data);
    setStoryState("loading");
    
    // Mock the API delay
    setTimeout(() => {
      setStoryState("complete");
    }, 4500);
  };

  const handleReset = () => {
    setStoryState("idle");
    setFormData(null);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden mesh-gradient-bg">
      {/* Decorative modern background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px] animate-pulse pointer-events-none mix-blend-multiply" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/40 rounded-full blur-[120px] animate-pulse pointer-events-none mix-blend-multiply" style={{ animationDuration: '10s' }} />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-accent/30 rounded-full blur-[80px] animate-pulse pointer-events-none mix-blend-multiply" style={{ animationDuration: '12s' }} />
      
      <header className="py-6 px-6 lg:px-12 flex justify-between items-center z-10">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={handleReset}>
          <div className="bg-white/80 backdrop-blur-md p-2.5 rounded-2xl text-primary shadow-[0_4px_20px_-5px_rgba(160,120,220,0.3)] group-hover:scale-110 transition-transform">
            <Stars size={24} className="fill-primary/20" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
            Сказочник
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 pb-20 z-10">
        {storyState === "idle" && (
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center mb-12 space-y-5 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full glass-panel text-primary font-semibold text-sm mb-2 shadow-sm border border-white/60">
                <Sparkles size={16} className="animate-pulse" />
                Магия ИИ для вашего ребенка
              </div>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                Подарите ребёнку <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent-foreground to-primary">волшебную сказку</span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground/90 leading-relaxed max-w-2xl mx-auto font-light">
                Загрузите фото, выберите атмосферу, и магия ИИ за минуту создаст уникальную историю, где ваш ребенок — главный герой сказочных приключений.
              </p>
            </div>

            <StoryForm onSubmit={handleGenerate} />
          </div>
        )}

        {storyState === "loading" && (
          <StoryLoading />
        )}

        {storyState === "complete" && (
          <StoryViewer onReset={handleReset} formData={formData} />
        )}
      </main>
    </div>
  );
}
