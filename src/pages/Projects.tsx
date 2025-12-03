import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FolderOpen, FileText, Image as ImageIcon, ExternalLink } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

type ProjectResource = {
  id: string;
  title: string;
  description: string;
  techStackIcons?: string;
  mainCategory?: string;
  keyFeature?: string;
  demoUrl?: string;
  githubUrl?: string;
  thumbnailEmoji?: string;
  difficultyLevel?: string;
  timeToBuild?: string;
  // Legacy fields
  imageUrls?: string[];
  pdfUrls?: string[];
  driveLinks?: string[];
  imageUrl?: string;
  driveLink?: string;
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
              techStackIcons: data.techStackIcons,
              mainCategory: data.mainCategory,
              keyFeature: data.keyFeature,
              demoUrl: data.demoUrl,
              githubUrl: data.githubUrl,
              thumbnailEmoji: data.thumbnailEmoji,
              difficultyLevel: data.difficultyLevel,
              timeToBuild: data.timeToBuild,
              imageUrls: data.imageUrls || [],
              pdfUrls: data.pdfUrls || [],
              driveLinks: data.driveLinks || [],
              // Legacy fallbacks
              imageUrl: data.imageUrl,
              driveLink: data.driveLink || data.ctaUrl || "",
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
      <div className="container mx-auto px-4 space-y-12 max-w-5xl">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Projects & Resources</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Download curated projects, templates, and resources contributed by the Bytes of Data team.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading projects…</p>
          </div>
        ) : projects.length === 0 ? (
          <GlassCard className="text-center py-12 bg-gradient-subtle">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground">New resources will appear here as soon as they are published.</p>
          </GlassCard>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const techStack = project.techStackIcons 
                ? project.techStackIcons.split(",").map((item: string) => item.trim())
                : [];
              const primaryUrl = project.demoUrl || project.githubUrl || (project.driveLinks?.[0] || project.driveLink);
              
              return (
                <GlassCard 
                  key={project.id} 
                  className="flex flex-col overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
                >
                  {/* Thumbnail / Emoji */}
                  <div className="text-4xl mb-3">{project.thumbnailEmoji || "💡"}</div>
                  
                  {/* Title */}
                  <h3 className="text-xl font-bold mb-2 line-clamp-2">{project.title}</h3>
                  
                  {/* Short Description */}
                  <p className="text-muted-foreground text-sm flex-1 line-clamp-2 mb-3">
                    {project.description}
                  </p>
                  
                  {/* Key Feature */}
                  {project.keyFeature && (
                    <div className="mb-3">
                      <Badge variant="secondary" className="text-xs font-semibold bg-primary/20 text-primary">
                        {project.keyFeature}
                      </Badge>
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
                  
                  {/* Difficulty + Time */}
                  {(project.difficultyLevel || project.timeToBuild) && (
                    <div className="mb-3 text-xs text-muted-foreground">
                      {project.difficultyLevel && project.timeToBuild 
                        ? `${project.difficultyLevel} • ${project.timeToBuild}`
                        : project.difficultyLevel || project.timeToBuild}
                    </div>
                  )}
                  
                  {/* Button */}
                  <div className="mt-auto pt-3">
                    {primaryUrl ? (
                      <Button 
                        asChild 
                        className="w-full bg-gradient-primary gap-2" 
                        size="sm"
                      >
                        <a href={primaryUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          {project.demoUrl ? "Open Demo" : project.githubUrl ? "View on GitHub" : "View Project"}
                        </a>
                      </Button>
                    ) : (
                      <Button 
                        className="w-full bg-gradient-primary gap-2" 
                        size="sm"
                        disabled
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Project
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

export default Projects;
