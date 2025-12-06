import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Code, Github, FileText, Database } from "lucide-react";
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
  const [selectedStudy, setSelectedStudy] = useState<CaseStudy | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
                    <Button 
                      className="w-full bg-gradient-primary gap-2" 
                      size="sm"
                      onClick={() => {
                        setSelectedStudy(study);
                        setIsDetailOpen(true);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Case Study
                    </Button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Case Study Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              {selectedStudy?.coverEmoji && <span className="text-3xl">{selectedStudy.coverEmoji}</span>}
              {selectedStudy?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedStudy && (
            <div className="space-y-6">
              {/* Industry Tags */}
              {selectedStudy.industry && (
                <div className="flex flex-wrap gap-2">
                  {selectedStudy.industry.split("|").map((part, idx) => (
                    <Badge key={idx} variant="outline">
                      {part.trim()}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Description */}
              {selectedStudy.description && (
                <div>
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <p className="text-muted-foreground">{selectedStudy.description}</p>
                </div>
              )}

              {/* Problem Statement */}
              {selectedStudy.problemStatement && (
                <div>
                  <h3 className="font-semibold mb-2">Problem Statement</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{selectedStudy.problemStatement}</p>
                </div>
              )}

              {/* Overview */}
              {selectedStudy.overview && (
                <div>
                  <h3 className="font-semibold mb-2">Overview</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{selectedStudy.overview}</p>
                </div>
              )}

              {/* Techniques */}
              {selectedStudy.techniques && selectedStudy.techniques.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Techniques Used</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudy.techniques.map((tech, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Outcomes */}
              {selectedStudy.outcomes && selectedStudy.outcomes.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Key Outcomes</h3>
                  <ul className="space-y-2">
                    {selectedStudy.outcomes.map((outcome, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-muted-foreground">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tech Stack */}
              {selectedStudy.techStackIcons && (
                <div>
                  <h3 className="font-semibold mb-2">Tech Stack</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudy.techStackIcons.split(",").map((tech, idx) => (
                      <Badge key={idx} variant="outline">
                        {tech.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Difficulty & Time */}
              {(selectedStudy.difficultyLevel || selectedStudy.timeToBuild) && (
                <div className="flex gap-4 text-sm">
                  {selectedStudy.difficultyLevel && (
                    <div>
                      <span className="font-semibold">Difficulty: </span>
                      <span className="text-muted-foreground">{selectedStudy.difficultyLevel}</span>
                    </div>
                  )}
                  {selectedStudy.timeToBuild && (
                    <div>
                      <span className="font-semibold">Time to Build: </span>
                      <span className="text-muted-foreground">{selectedStudy.timeToBuild}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Badge */}
              {selectedStudy.badge && (
                <div>
                  <Badge variant="outline" className="text-sm">
                    ⭐ {selectedStudy.badge}
                  </Badge>
                </div>
              )}

              {/* Links */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                {selectedStudy.demoUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedStudy.demoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Demo
                    </a>
                  </Button>
                )}
                {selectedStudy.githubUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedStudy.githubUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-2" />
                      GitHub
                    </a>
                  </Button>
                )}
                {selectedStudy.notebookUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedStudy.notebookUrl} target="_blank" rel="noopener noreferrer">
                      <Code className="h-4 w-4 mr-2" />
                      Notebook
                    </a>
                  </Button>
                )}
                {selectedStudy.datasetUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedStudy.datasetUrl} target="_blank" rel="noopener noreferrer">
                      <Database className="h-4 w-4 mr-2" />
                      Dataset
                    </a>
                  </Button>
                )}
                {selectedStudy.pdfUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedStudy.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4 mr-2" />
                      PDF Report
                    </a>
                  </Button>
                )}
                {selectedStudy.viewUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedStudy.viewUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Full Analysis
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseStudies;