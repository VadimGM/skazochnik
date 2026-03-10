import { useState, useEffect } from "react";
import StoryViewer from "@/components/StoryViewer";
import StoryLoading from "@/components/StoryLoading";
import { Stars } from "lucide-react";
import { useRoute } from "wouter";
import heroBg from "@/assets/images/hero-bg.png";

export default function StoryPage() {
  const [, params] = useRoute("/story/:id");
  const [storyData, setStoryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;

    const fetchStory = async () => {
      try {
        const res = await fetch(`/api/stories/${params.id}`);
        if (!res.ok) throw new Error("Story not found");
        const data = await res.json();
        if (data.status === "generating") {
          setTimeout(fetchStory, 3000);
          return;
        }
        setStoryData(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchStory();
  }, [params?.id]);

  const handleReset = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[600px] -z-10 opacity-30 pointer-events-none" 
           style={{ backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center', maskImage: 'linear-gradient(to bottom, black, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)' }} />
      
      <header className="py-6 px-6 lg:px-12 flex justify-between items-center z-10">
        <a href="/" className="flex items-center gap-3 cursor-pointer group">
          <div className="bg-white/80 backdrop-blur-md p-2.5 rounded-2xl text-primary shadow-[0_4px_20px_-5px_rgba(160,120,220,0.3)] group-hover:scale-110 transition-transform">
            <Stars size={24} className="fill-primary/20" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
            Сказочник
          </h1>
        </a>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 pb-20 z-10">
        {loading && <StoryLoading />}
        
        {error && (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground mb-4">{error}</p>
            <a href="/" className="text-primary underline">Создать свою сказку</a>
          </div>
        )}

        {!loading && !error && storyData && (
          <StoryViewer onReset={handleReset} formData={{}} storyData={storyData} />
        )}
      </main>
    </div>
  );
}
