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
  description: string;
  industry: string;
  techniques: string[];
  outcomes: string[];
  datasetUrl?: string;
  notebookUrl?: string;
  pdfUrl?: string;
  viewUrl?: string;
  coverEmoji?: string;
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
              pdfUrl: data.pdfUrl,
              viewUrl: data.viewUrl,
              coverEmoji: data.coverEmoji,
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
          <div className="space-y-8">
            {studies.map((study) => (
              <GlassCard key={study.id} className="hover:border-primary/50">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge className="bg-primary">{study.industry}</Badge>
                      {study.techniques.map((tech) => (
                        <Badge key={tech} variant="outline">
                          {tech}
                        </Badge>
                      ))}
                    </div>

                    <h3 className="text-2xl font-bold mb-3">{study.title}</h3>
                    <p className="text-muted-foreground mb-4">{study.description}</p>

                    <div className="mb-4">
                      <h4 className="font-semibold mb-2 text-primary">Key outcomes</h4>
                      <ul className="space-y-1">
                        {study.outcomes.map((outcome, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="text-primary">✓</span>
                            {outcome}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {study.datasetUrl && (
                        <Button asChild size="sm" variant="outline" className="gap-2">
                          <a href={study.datasetUrl} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" />
                            Dataset
                          </a>
                        </Button>
                      )}
                      {study.notebookUrl && (
                        <Button asChild size="sm" variant="outline" className="gap-2">
                          <a href={study.notebookUrl} target="_blank" rel="noreferrer">
                            <Code className="h-4 w-4" />
                            Notebook
                          </a>
                        </Button>
                      )}
                      {study.pdfUrl && (
                        <Button asChild size="sm" variant="outline" className="gap-2">
                          <a href={study.pdfUrl} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" />
                            PDF report
                          </a>
                        </Button>
                      )}
                      {study.viewUrl && (
                        <Button asChild size="sm" className="bg-gradient-primary gap-2">
                          <a href={study.viewUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            View full analysis
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="lg:w-80 h-64 bg-gradient-subtle rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-2">{study.coverEmoji || "📊"}</div>
                      <p className="text-sm text-muted-foreground">Analysis Visualization</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseStudies;