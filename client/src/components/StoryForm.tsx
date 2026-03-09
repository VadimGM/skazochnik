import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Baby, Star, Compass, Ship, Castle, Home as HomeIcon } from "lucide-react";
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
});

const THEMES = [
  { id: "forest", label: "Волшебный лес", image: themeForest, icon: Compass },
  { id: "space", label: "Космос", image: themeSpace, icon: Star },
  { id: "underwater", label: "Подводный мир", image: themeUnderwater, icon: Ship },
  { id: "castle", label: "Замок", image: themeCastle, icon: Castle },
  { id: "village", label: "Уютная деревня", image: themeVillage, icon: HomeIcon },
];

const LESSONS = [
  { id: "kindness", label: "Доброта" },
  { id: "courage", label: "Смелость" },
  { id: "friendship", label: "Дружба" },
  { id: "honesty", label: "Честность" },
  { id: "patience", label: "Терпение" },
  { id: "curiosity", label: "Любознательность" },
];

interface StoryFormProps {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
}

export default function StoryForm({ onSubmit }: StoryFormProps) {
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
    // Prevent emptying the array
    if (current.size === 0) current.add("kindness");
    form.setValue("lesson", Array.from(current));
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full bg-card rounded-3xl p-8 book-shadow relative">
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[100px] rounded-tr-3xl -z-0"></div>
      
      <div className="space-y-8 relative z-10">
        
        {/* Row 1: Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Label className="text-lg font-serif">Как зовут главного героя?</Label>
            <div className="relative">
              <Baby className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input 
                {...form.register("childName")} 
                placeholder="Имя ребенка" 
                className="pl-10 h-12 text-lg rounded-xl border-border bg-background focus-visible:ring-primary/50"
              />
            </div>
            {form.formState.errors.childName && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.childName.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-serif">Пол ребенка</Label>
            <div className="flex gap-4">
              <div 
                className={cn(
                  "flex-1 h-12 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all font-medium",
                  form.watch("gender") === "boy" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 text-muted-foreground"
                )}
                onClick={() => form.setValue("gender", "boy")}
              >
                Мальчик
              </div>
              <div 
                className={cn(
                  "flex-1 h-12 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all font-medium",
                  form.watch("gender") === "girl" ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 text-muted-foreground"
                )}
                onClick={() => form.setValue("gender", "girl")}
              >
                Девочка
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Age */}
        <div className="space-y-6 bg-background/50 p-6 rounded-2xl border border-border/50">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-serif">Возраст: <span className="text-primary font-bold text-xl">{age}</span> лет</Label>
            <span className="text-sm text-muted-foreground italic">Определяет сложность текста</span>
          </div>
          <Slider 
            value={[age]} 
            min={2} max={12} step={1} 
            onValueChange={([val]) => form.setValue("age", val)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>2 года</span>
            <span>12 лет</span>
          </div>
        </div>

        {/* Row 3: Themes */}
        <div className="space-y-4">
          <Label className="text-lg font-serif">Выберите атмосферу сказки</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {THEMES.map(theme => (
              <div 
                key={theme.id}
                onClick={() => form.setValue("theme", theme.id)}
                className={cn(
                  "group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-4 transition-all duration-300",
                  selectedTheme === theme.id ? "border-primary shadow-lg shadow-primary/20 scale-[1.02]" : "border-transparent hover:border-primary/30"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
                <img src={theme.image} alt={theme.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute bottom-3 left-0 w-full text-center z-20 px-2">
                  <p className="text-white font-medium text-sm drop-shadow-md leading-tight">{theme.label}</p>
                </div>
                {selectedTheme === theme.id && (
                  <div className="absolute top-2 right-2 z-20 bg-primary text-white rounded-full p-1 shadow-sm">
                    <Wand2 size={14} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Row 4: Optional details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Label className="text-lg font-serif">Чему научит сказка?</Label>
            <div className="flex flex-wrap gap-2">
              {LESSONS.map(lesson => {
                const isSelected = selectedLessons.includes(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    onClick={() => toggleLesson(lesson.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all border",
                      isSelected 
                        ? "bg-secondary text-secondary-foreground border-secondary/50" 
                        : "bg-background border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {lesson.label}
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="space-y-4">
            <Label className="text-lg font-serif">Имя друга или питомца <span className="text-muted-foreground text-sm font-sans font-normal">(необязательно)</span></Label>
            <Input 
              {...form.register("companion")} 
              placeholder="Например: пес Шарик, лисенок Рыжик..." 
              className="h-12 rounded-xl border-border bg-background focus-visible:ring-primary/50"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-6 flex justify-center">
          <Button 
            type="submit" 
            size="lg" 
            className="h-16 px-12 text-lg rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <Wand2 className="mr-2 h-6 w-6" />
            Создать сказку
          </Button>
        </div>

      </div>
    </form>
  );
}
