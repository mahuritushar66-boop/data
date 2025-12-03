import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Code } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

type CaseStudy = {
  id: string;
  title: string;
  description: string; // 1-line summary
  industry: string;
  problemStatement?: string;
  overview?: string;
  techniques: string[];
  outcomes: string[];
  datasetUrl?: string;
  notebookUrl?: string;
  demoUrl?: string;
  githubUrl?: string;
  pdfUrl?: string;
  viewUrl?: string;
  coverEmoji?: string;
  timeToBuild?: string;
  difficultyLevel?: string;
  techStackIcons?: string;
  badge?: string;
};

const CaseStudies = () => {
  const { toast } = useToast();
  const [studies, setStudies] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "caseStudies"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setStudies(
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || "Untitled Study",
              description: data.description || "",
              industry: data.industry || "General",
              problemStatement: data.problemStatement,
              overview: data.overview,
              techniques: Array.isArray(data.techniques)
                ? data.techniques
                : typeof data.techniques === "string"
                ? data.techniques.split(",").map((item: string) => item.trim())
                : [],
              outcomes: Array.isArray(data.outcomes)
                ? data.outcomes
                : typeof data.outcomes === "string"
                ? data.outcomes.split("\n").map((item: string) => item.trim())
                : [],
              datasetUrl: data.datasetUrl,
              notebookUrl: data.notebookUrl,
              demoUrl: data.demoUrl,
              githubUrl: data.githubUrl,
              pdfUrl: data.pdfUrl,
              viewUrl: data.viewUrl,
              coverEmoji: data.coverEmoji,
              timeToBuild: data.timeToBuild,
              difficultyLevel: data.difficultyLevel,
              techStackIcons: data.techStackIcons,
              badge: data.badge,
            } as CaseStudy;
          }),
        );
        setLoading(false);
      },
      (error) => {
        console.error(error);
        toast({
          title: "Unable to load case studies",
          description: "Please try again later.",
          variant: "destructive",
        });
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [toast]);

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-up space-y-4">
          <h1 className="text-5xl font-bold">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Case Studies</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Real-world data science projects with detailed analysis, code, and downloadable resources
          </p>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading case studies…</p>
        ) : studies.length === 0 ? (
          <GlassCard className="text-center py-12 bg-gradient-subtle">
            <h2 className="text-2xl font-semibold mb-2">No case studies yet</h2>
            <p className="text-muted-foreground">Check back soon for new updates.</p>
          </GlassCard>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studies.map((study) => {
              const techStack = study.techStackIcons 
                ? study.techStackIcons.split(",").map((item: string) => item.trim())
                : [];
              const firstOutcome = study.outcomes && study.outcomes.length > 0 ? study.outcomes[0] : "";
              const industryParts = study.industry.split("|").map((item: string) => item.trim());
              
              return (
                <GlassCard key={study.id} className="flex flex-col hover:border-primary/50 transition-all">
                  {/* Cover Emoji */}
                  <div className="text-4xl mb-3">{study.coverEmoji || "📊"}</div>
                  
                  {/* Title */}
                  <h3 className="text-xl font-bold mb-2 line-clamp-2">{study.title}</h3>
                  
                  {/* Industry Tag */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {industryParts.map((part, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {part}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* 1-Line Summary */}
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{study.description}</p>
                  
                  {/* Key Outcome Highlight */}
                  {firstOutcome && (
                    <div className="mb-3">
                      <Badge variant="secondary" className="text-xs font-semibold bg-primary/20 text-primary">
                        {firstOutcome}
                      </Badge>
                    </div>
                  )}
                  
                  {/* Difficulty + Time */}
                  {(study.difficultyLevel || study.timeToBuild) && (
                    <div className="mb-3 text-xs text-muted-foreground">
                      {study.difficultyLevel && study.timeToBuild 
                        ? `${study.difficultyLevel} • ${study.timeToBuild}`
                        : study.difficultyLevel || study.timeToBuild}
                    </div>
                  )}
                  
                  {/* Tech Stack Icons */}
                  {techStack.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1 text-xs">
                      {techStack.map((tech, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Badge */}
                  {study.badge && (
                    <div className="mb-3">
                      <Badge variant="outline" className="text-xs">
                        ⭐ {study.badge}
                      </Badge>
                    </div>
                  )}
                  
                  {/* View Case Study Button */}
                  <div className="mt-auto pt-3">
                    {study.viewUrl ? (
                      <Button asChild className="w-full bg-gradient-primary gap-2" size="sm">
                        <a href={study.viewUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          View Case Study
                        </a>
                      </Button>
                    ) : (
                      <Button className="w-full bg-gradient-primary gap-2" size="sm" disabled>
                        <ExternalLink className="h-4 w-4" />
                        View Case Study
                      </Button>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseStudies;