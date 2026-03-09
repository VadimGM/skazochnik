import { useState } from "react";
import StoryForm from "@/components/StoryForm";
import StoryLoading from "@/components/StoryLoading";
import StoryViewer from "@/components/StoryViewer";
import heroBg from "@/assets/images/hero-bg.png";
import { Sparkles, BookOpen } from "lucide-react";

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
    }, 4000);
  };

  const handleReset = () => {
    setStoryState("idle");
    setFormData(null);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-[600px] -z-10 opacity-30 pointer-events-none" 
           style={{ backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center', maskImage: 'linear-gradient(to bottom, black, transparent)' }} />
      
      <header className="py-6 px-6 lg:px-12 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <BookOpen size={24} />
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Сказочник</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 pb-20 z-10">
        {storyState === "idle" && (
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-10 space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary/80 text-sm font-medium mb-2">
                <Sparkles size={16} />
                Волшебство ждет
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground/90 leading-tight">
                Подарите ребенку <br/> <span className="text-primary italic">уникальную</span> сказку
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Введите имя ребенка, выберите атмосферу, и искусственный интеллект за минуту создаст чудесную иллюстрированную историю.
              </p>
            </div>

            <StoryForm onSubmit={handleGenerate} />
          </div>
        )}

        {storyState === "loading" && (
          <StoryLoading />
        )}

        {storyState === "complete" && (
          <StoryViewer onReset={handleReset} />
        )}
      </main>
    </div>
  );
}
