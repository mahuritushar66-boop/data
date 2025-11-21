import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

type ProjectResource = {
  id: string;
  title: string;
  description: string;
  category: string;
  techStack: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  badge?: string;
  coverEmoji?: string;
};

const Projects = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setProjects(
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || "Untitled Project",
              description: data.description || "",
              category: data.category || "Project",
              techStack: Array.isArray(data.techStack)
                ? data.techStack
                : typeof data.techStack === "string"
                ? data.techStack.split(",").map((item: string) => item.trim())
                : [],
              ctaLabel: data.ctaLabel,
              ctaUrl: data.ctaUrl,
              badge: data.badge,
              coverEmoji: data.coverEmoji,
            } as ProjectResource;
          }),
        );
        setLoading(false);
      },
      (error) => {
        console.error(error);
        toast({
          title: "Unable to load projects",
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
      <div className="container mx-auto px-4 space-y-12 max-w-4xl">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Projects & Resources</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Browse curated open projects, templates, and resources contributed by the Bytes of Data team.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading projects…</p>
        ) : projects.length === 0 ? (
          <GlassCard className="text-center py-12 bg-gradient-subtle">
            <h2 className="text-2xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground">New resources will appear here as soon as they are published.</p>
          </GlassCard>
        ) : (
          <div className="space-y-6">
            {projects.map((project) => (
              <GlassCard key={project.id} className="flex flex-col gap-4 hover:border-primary/50">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary/80">{project.category}</Badge>
                  {project.badge && <Badge variant="secondary">{project.badge}</Badge>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{project.coverEmoji || "📦"}</div>
                  <div>
                    <h3 className="text-2xl font-bold">{project.title}</h3>
                    <p className="text-muted-foreground">{project.description}</p>
                  </div>
                </div>
                {project.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {project.techStack.map((tech) => (
                      <Badge key={tech} variant="outline">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                )}
                {project.ctaUrl && (
                  <div>
                    <Button asChild className="bg-gradient-primary">
                      <a href={project.ctaUrl} target="_blank" rel="noreferrer">
                        {project.ctaLabel || "Open Resource"}
                      </a>
                    </Button>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;