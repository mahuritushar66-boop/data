import { useEffect, useMemo, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Layers, Code2, BookOpen, Target, TrendingUp, ArrowRight, Zap, Database, Brain, Box, Flame } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

type InterviewQuestion = {
  id: string;
  title?: string;
  question: string;
  tier: "free" | "paid";
  questionTitle?: string;
  difficulty?: "easy" | "medium" | "hard";
  company?: string;
  questionOfTheWeek?: boolean;
};

type ModuleSummary = {
  title: string;
  total: number;
  freeCount: number;
  premiumCount: number;
};

const DEFAULT_TITLE = "General";

const InterviewPrep = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const q = query(collection(db, "interviewQuestions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setQuestions(
          snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              title: data.title,
              question: data.question,
              tier: data.tier ?? "free",
              questionTitle: data.questionTitle,
              difficulty: data.difficulty,
              company: data.company,
              questionOfTheWeek: data.questionOfTheWeek ?? false,
            } as InterviewQuestion;
          }),
        );
        setLoading(false);
      },
      (error) => {
        console.error("Firebase error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        toast({
          title: "Unable to load question modules",
          description: error.message || "Please check your Firebase security rules allow public read access.",
          variant: "destructive",
        });
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [toast]);

  const moduleSummaries = useMemo<ModuleSummary[]>(() => {
    const map = new Map<string, ModuleSummary>();
    questions.forEach((q) => {
      const title = q.title?.trim() || DEFAULT_TITLE;
      if (!map.has(title)) {
        map.set(title, { title, total: 0, freeCount: 0, premiumCount: 0 });
      }
      const summary = map.get(title)!;
      summary.total += 1;
      if (q.tier === "free") summary.freeCount += 1;
      else summary.premiumCount += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [questions]);

  const handleOpenModule = (title: string) => {
    const slug = encodeURIComponent(title);
    navigate(`/interview-prep/module/${slug}`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4">
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight animate-fade-up">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Interview Preparation
              </span>
              <br />
              <span className="text-foreground">Hub</span>
            </h1>


            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 pt-8">
              <div className="flex items-center gap-2 animate-fade-up group" style={{ animationDelay: "0.2s" }}>
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                  <Target className="h-5 w-5 text-primary group-hover:animate-pulse" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">{questions.length}+</p>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Questions</p>
                </div>
              </div>
              <div className="flex items-center gap-2 animate-fade-up group" style={{ animationDelay: "0.3s" }}>
                <div className="p-2 rounded-lg bg-secondary/10 border border-secondary/20 group-hover:bg-secondary/20 group-hover:scale-110 transition-all">
                  <Layers className="h-5 w-5 text-secondary group-hover:animate-pulse" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">{moduleSummaries.length}</p>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Modules</p>
                </div>
              </div>
              <div className="flex items-center gap-2 animate-fade-up group" style={{ animationDelay: "0.4s" }}>
                <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 group-hover:bg-accent/20 group-hover:scale-110 transition-all">
                  <Zap className="h-5 w-5 text-accent group-hover:animate-pulse" />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">100%</p>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Free Access</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Question of the Week Section */}
      {(() => {
        const questionOfTheWeek = questions.find(q => q.questionOfTheWeek);
        if (questionOfTheWeek) {
          const moduleSlug = encodeURIComponent(questionOfTheWeek.title || DEFAULT_TITLE);
          return (
            <section className="py-8 px-4">
              <div className="container mx-auto max-w-6xl">
                <GlassCard className="p-6 border-2 border-green-500/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30 relative">
                        <Box className="h-8 w-8 text-green-500" />
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          ?
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-2xl md:text-3xl font-bold text-green-500">
                            Question of the week
                          </h2>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl md:text-2xl font-bold">
                            {questionOfTheWeek.questionTitle || "Untitled Question"}
                          </h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            {questionOfTheWeek.difficulty && (
                              <Badge 
                                variant="outline" 
                                className={`${
                                  questionOfTheWeek.difficulty === "easy" 
                                    ? "border-green-500/50 text-green-500 bg-green-500/10" 
                                    : questionOfTheWeek.difficulty === "medium"
                                    ? "border-yellow-500/50 text-yellow-500 bg-yellow-500/10"
                                    : "border-red-500/50 text-red-500 bg-red-500/10"
                                }`}
                              >
                                {questionOfTheWeek.difficulty.charAt(0).toUpperCase() + questionOfTheWeek.difficulty.slice(1)}
                              </Badge>
                            )}
                            <Badge variant="outline" className="gap-1.5 border-orange-500/50 text-orange-500 bg-orange-500/10">
                              <Flame className="h-3 w-3" />
                              75
                            </Badge>
                          </div>
                          <p className="text-muted-foreground line-clamp-2">
                            {questionOfTheWeek.question.substring(0, 150)}
                            {questionOfTheWeek.question.length > 150 ? "..." : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate(`/interview-prep/module/${moduleSlug}`)}
                      className="bg-green-500 hover:bg-green-600 text-white gap-2 px-6"
                      size="lg"
                    >
                      Solve
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </GlassCard>
              </div>
            </section>
          );
        }
        return null;
      })()}

      {/* Modules Section */}
      <section className="py-12">
        <div className="container mx-auto px-4 space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-4">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                <p className="text-sm text-muted-foreground">Loading modules…</p>
              </div>
            </div>
          ) : moduleSummaries.length === 0 ? (
            <GlassCard className="text-center py-16">
              <div className="max-w-md mx-auto space-y-4">
                <div className="inline-flex p-4 rounded-full bg-muted/50">
                  <Layers className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold">No question modules yet</h3>
                <p className="text-muted-foreground">
                  As soon as the first question is published, you&apos;ll see it here. Check back soon!
                </p>
              </div>
            </GlassCard>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {moduleSummaries.map((module, index) => {
                // Get icon based on module title
                const getModuleIcon = (title: string) => {
                  const titleLower = title.toLowerCase();
                  if (titleLower.includes("sql") || titleLower.includes("database")) return Database;
                  if (titleLower.includes("python")) return Code2;
                  if (titleLower.includes("javascript") || titleLower.includes("js")) return Code2;
                  if (titleLower.includes("machine learning") || titleLower.includes("ml")) return Brain;
                  return BookOpen;
                };
                const ModuleIcon = getModuleIcon(module.title);

                return (
                  <GlassCard
                    key={module.title}
                    className="group p-6 space-y-4 cursor-pointer hover:border-primary/60 hover:shadow-glow-primary transition-all duration-300 relative overflow-hidden hover-lift animate-fade-up shine-effect"
                    onClick={() => handleOpenModule(module.title)}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Decorative gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity duration-300" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-xl bg-gradient-primary group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-glow-primary transition-all duration-300">
                            <ModuleIcon className="h-6 w-6 text-primary-foreground group-hover:animate-pulse" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold group-hover:text-primary transition-colors gradient-text-primary group-hover:gradient-text-primary">
                              {module.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs group-hover:border-primary/50 transition-colors">
                                {module.freeCount} Free
                              </Badge>
                              {module.premiumCount > 0 && (
                                <Badge variant="secondary" className="text-xs group-hover:bg-secondary/80 transition-colors">
                                  {module.premiumCount} Premium
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-lg font-bold px-3 py-1 group-hover:scale-110 transition-transform">
                          {module.total}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          {module.total} {module.total === 1 ? "question" : "questions"}
                        </span>
                        <div className="flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                          <span className="text-sm">Explore</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform group-hover:animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default InterviewPrep;