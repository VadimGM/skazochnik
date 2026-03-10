import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Wand2, Baby, Star, Compass, Ship, Castle, Home as HomeIcon, UploadCloud, X, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

import themeForest from "@/assets/images/theme-forest.png";
import themeSpace from "@/assets/images/theme-space.png";
import themeUnderwater from "@/assets/images/theme-underwater.png";
import themeCastle from "@/assets/images/theme-castle.png";
import themeVillage from "@/assets/images/theme-village.png";

const formSchema = z.object({
  childName: z.string().min(2, "Имя должно быть не короче 2 букв").max(30, "Имя слишком длинное"),
  gender: z.enum(["boy", "girl"]),
  age: z.number().min(2).max(12),
  theme: z.string().min(1, "Выберите атмосферу сказки"),
  customTheme: z.string().optional(),
  companion: z.string().optional(),
  lesson: z.array(z.string()).min(1, "Выберите хотя бы один урок"),
  photo: z.any().optional(), // In a real app this would be a File or URL
});

const THEMES = [
  { id: "forest", label: "Волшебный лес", image: themeForest, icon: Compass },
  { id: "space", label: "Космос", image: themeSpace, icon: Star },
  { id: "underwater", label: "Подводный мир", image: themeUnderwater, icon: Ship },
  { id: "castle", label: "Замок", image: themeCastle, icon: Castle },
  { id: "village", label: "Уютная деревня", image: themeVillage, icon: HomeIcon },
];

const LESSONS = [
  { id: "kindness", label: "Доброта", emoji: "❤️" },
  { id: "courage", label: "Смелость", emoji: "🦁" },
  { id: "friendship", label: "Дружба", emoji: "🤝" },
  { id: "honesty", label: "Честность", emoji: "✨" },
  { id: "curiosity", label: "Любопытство", emoji: "🔍" },
];

interface StoryFormProps {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
}

export default function StoryForm({ onSubmit }: StoryFormProps) {
  const [dragActive, setDragActive] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      childName: "",
      gender: "boy",
      age: 5,
      theme: "forest",
      customTheme: "",
      companion: "",
      lesson: ["kindness"],
    },
  });

  const age = form.watch("age");
  const selectedTheme = form.watch("theme");
  const selectedLessons = form.watch("lesson");

  const toggleLesson = (id: string) => {
    const current = new Set(selectedLessons);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    if (current.size === 0) current.add("kindness");
    form.setValue("lesson", Array.from(current));
  };

  // Mock Photo Upload Handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
      form.setValue("photo", file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
      form.setValue("photo", file);
    }
  };

  const clearPhoto = () => {
    setPhotoPreview(null);
    form.setValue("photo", undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full glass-panel rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden">
      {/* Decorative gradient blur inside the card */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-[60px] pointer-events-none"></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-secondary/30 rounded-full blur-[60px] pointer-events-none"></div>
      
      <div className="space-y-10 relative z-10">
        
        {/* Row 1: Profile & Photo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Photo Upload Section */}
          <div className="col-span-1 lg:col-span-5 space-y-4">
            <div>
              <Label className="text-xl font-serif text-foreground">Фотография героя</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-3">ИИ нарисует ребенка в иллюстрациях сказки</p>
            </div>
            
            <div 
              className={cn(
                "relative aspect-square w-full max-w-[280px] mx-auto md:mx-0 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-all duration-300 overflow-hidden cursor-pointer",
                dragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/40 hover:bg-white/40",
                photoPreview ? "border-none p-0 shadow-xl" : "bg-white/30"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !photoPreview && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoUpload} 
                accept="image/*" 
                className="hidden" 
              />

              {photoPreview ? (
                <div className="relative w-full h-full group">
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <Button type="button" variant="destructive" size="icon" className="rounded-full" onClick={(e) => { e.stopPropagation(); clearPhoto(); }}>
                      <X size={20} />
                    </Button>
                  </div>
                  <div className="absolute top-3 right-3 bg-white text-primary px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    Загружено
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <UploadCloud size={30} />
                  </div>
                  <span className="font-semibold text-foreground/80">Загрузите фото</span>
                  <span className="text-xs">Перетащите или нажмите<br/>(до 5 МБ)</span>
                </div>
              )}
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="col-span-1 lg:col-span-7 space-y-8">
            <div className="space-y-3">
              <Label className="text-xl font-serif text-foreground">Как зовут героя?</Label>
              <div className="relative">
                <Baby className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={24} />
                <Input 
                  {...form.register("childName")} 
                  placeholder="Например: Алиса" 
                  className="pl-12 h-16 text-xl rounded-2xl border-white bg-white/50 shadow-sm focus-visible:ring-primary focus-visible:bg-white transition-all placeholder:text-muted-foreground/50"
                />
              </div>
              {form.formState.errors.childName && (
                <p className="text-sm text-destructive mt-1 font-medium">{form.formState.errors.childName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-lg font-serif">Пол</Label>
                <div className="flex gap-2 bg-white/40 p-1.5 rounded-2xl border border-white">
                  <div 
                    className={cn(
                      "flex-1 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all font-semibold text-sm",
                      form.watch("gender") === "boy" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => form.setValue("gender", "boy")}
                  >
                    Мальчик
                  </div>
                  <div 
                    className={cn(
                      "flex-1 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all font-semibold text-sm",
                      form.watch("gender") === "girl" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => form.setValue("gender", "girl")}
                  >
                    Девочка
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <Label className="text-lg font-serif">Возраст</Label>
                  <span className="text-xl font-bold text-primary">{age}</span>
                </div>
                <div className="bg-white/40 p-4 rounded-2xl border border-white h-14 flex items-center">
                  <Slider 
                    value={[age]} 
                    min={2} max={12} step={1} 
                    onValueChange={([val]) => form.setValue("age", val)}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent my-8"></div>

        {/* Row 2: Themes */}
        <div className="space-y-5">
          <Label className="text-2xl font-serif text-foreground">Где происходит действие?</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {THEMES.map(theme => (
              <div 
                key={theme.id}
                onClick={() => form.setValue("theme", theme.id)}
                className={cn(
                  "group relative aspect-[4/5] rounded-[2rem] overflow-hidden cursor-pointer transition-all duration-400 border-2",
                  selectedTheme === theme.id ? "border-primary shadow-[0_8px_30px_-5px_rgba(160,120,220,0.4)] scale-[1.03]" : "border-transparent hover:scale-[1.01] hover:shadow-lg"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent z-10 transition-opacity group-hover:opacity-90"></div>
                <img src={theme.image} alt={theme.label} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                
                <div className="absolute bottom-4 left-0 w-full text-center z-20 px-3">
                  <p className="text-white font-semibold text-sm md:text-base drop-shadow-md leading-tight">{theme.label}</p>
                </div>

                {selectedTheme === theme.id && (
                  <div className="absolute top-3 right-3 z-20 bg-primary text-white rounded-full p-2 shadow-lg animate-in zoom-in duration-300">
                    <CheckCircle2 size={16} strokeWidth={3} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Optional details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/30 rounded-[2rem] p-6 border border-white/50">
          <div className="space-y-4">
            <Label className="text-lg font-serif">Мораль сказки</Label>
            <div className="flex flex-wrap gap-2">
              {LESSONS.map(lesson => {
                const isSelected = selectedLessons.includes(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    onClick={() => toggleLesson(lesson.id)}
                    className={cn(
                      "px-4 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-all border flex items-center gap-1.5",
                      isSelected 
                        ? "bg-primary text-white border-primary shadow-md" 
                        : "bg-white/60 border-transparent text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-sm"
                    )}
                  >
                    <span>{lesson.emoji}</span>
                    {lesson.label}
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="space-y-4">
            <Label className="text-lg font-serif">Друг или питомец <span className="text-muted-foreground text-sm font-sans font-normal ml-1">(опционально)</span></Label>
            <Input 
              {...form.register("companion")} 
              placeholder="Например: корги Чарли..." 
              className="h-14 px-5 rounded-2xl border-white bg-white/60 shadow-sm focus-visible:ring-primary focus-visible:bg-white"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-center">
          <Button 
            type="submit" 
            className="clay-button h-16 md:h-20 px-10 md:px-16 text-lg md:text-xl rounded-full font-bold bg-primary hover:bg-primary/95 text-white w-full md:w-auto"
          >
            <Wand2 className="mr-3 h-6 w-6" />
            Создать волшебство
          </Button>
        </div>

      </div>
    </form>
  );
}