import { useState, useCallback } from "react";
import StoryForm from "@/components/StoryForm";
import StoryLoading from "@/components/StoryLoading";
import StoryViewer from "@/components/StoryViewer";
import { Sparkles, Stars } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import heroBg from "@/assets/images/hero-bg.png";

export type StoryState = "idle" | "loading" | "complete";

export default function Home() {
  const [storyState, setStoryState] = useState<StoryState>("idle");
  const [formData, setFormData] = useState<any>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [storyData, setStoryData] = useState<any>(null);
  const [progress, setProgress] = useState<string>("");
  const { toast } = useToast();

  const pollStory = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/stories/${id}`);
      if (!res.ok) throw new Error("Failed to fetch story");
      const data = await res.json();

      if (data.status === "complete") {
        setStoryData(data);
        setStoryState("complete");
        setProgress("");
      } else if (data.status === "error") {
        toast({
          title: "Ошибка",
          description: "Не удалось создать сказку. Попробуйте ещё раз.",
          variant: "destructive",
        });
        setStoryState("idle");
        setProgress("");
      } else {
        if (data.progress) setProgress(data.progress);
        setTimeout(() => pollStory(id), 3000);
      }
    } catch {
      setTimeout(() => pollStory(id), 5000);
    }
  }, [toast]);

  const handleGenerate = async (data: any) => {
    setFormData(data);
    setStoryState("loading");

    try {
      const formPayload = new FormData();
      formPayload.append("childName", data.childName);
      formPayload.append("gender", data.gender);
      formPayload.append("age", String(data.age));
      formPayload.append("theme", data.theme);
      formPayload.append("companion", data.companion || "");
      formPayload.append("lessons", JSON.stringify(data.lesson));
      if (data.customMoral) formPayload.append("customMoral", data.customMoral);
      if (data.photo instanceof File) {
        formPayload.append("photo", data.photo);
      }

      const res = await fetch("/api/stories", {
        method: "POST",
        body: formPayload,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Server error");
      }

      const { id } = await res.json();
      setStoryId(id);
      pollStory(id);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить запрос",
        variant: "destructive",
      });
      setStoryState("idle");
    }
  };

  const handleRegenerate = async () => {
    if (!storyId) return;
    setStoryState("loading");
    setStoryData(null);

    try {
      const res = await fetch(`/api/stories/${storyId}/regenerate`, { method: "POST" });
      if (!res.ok) throw new Error("Regeneration failed");
      pollStory(storyId);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось перегенерировать сказку",
        variant: "destructive",
      });
      setStoryState("complete");
    }
  };

  const handleReset = () => {
    setStoryState("idle");
    setFormData(null);
    setStoryId(null);
    setStoryData(null);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[600px] -z-10 opacity-30 pointer-events-none"
           style={{ backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center', maskImage: 'linear-gradient(to bottom, black, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)' }} />

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
                Создайте <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent-foreground to-primary">волшебную сказку</span>
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground/90 leading-relaxed max-w-2xl mx-auto font-light">
                Загрузите фото, выберите атмосферу, и магия ИИ за минуту создаст уникальную историю, где ваш ребенок — главный герой сказочных приключений.
              </p>
            </div>

            <StoryForm onSubmit={handleGenerate} />
          </div>
        )}

        {storyState === "loading" && (
          <StoryLoading progress={progress} />
        )}

        {storyState === "complete" && storyData && (
          <StoryViewer
            onReset={handleReset}
            onRegenerate={handleRegenerate}
            formData={formData}
            storyData={storyData}
          />
        )}
      </main>
    </div>
  );
}
