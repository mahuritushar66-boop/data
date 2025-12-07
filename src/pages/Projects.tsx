import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, FolderOpen, FileText, Image as ImageIcon, ExternalLink, Github, Code } from "lucide-react";
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
  const [selectedProject, setSelectedProject] = useState<ProjectResource | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
                    <Button 
                      className="w-full bg-gradient-primary gap-2" 
                      size="sm"
                      onClick={() => {
                        setSelectedProject(project);
                        setIsDetailOpen(true);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              {selectedProject?.thumbnailEmoji && <span className="text-3xl">{selectedProject.thumbnailEmoji}</span>}
              {selectedProject?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedProject && (
            <div className="space-y-6">
              {/* Main Category */}
              {selectedProject.mainCategory && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {selectedProject.mainCategory}
                  </Badge>
                </div>
              )}

              {/* Description */}
              {selectedProject.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{selectedProject.description}</p>
                </div>
              )}

              {/* Key Feature */}
              {selectedProject.keyFeature && (
                <div>
                  <h3 className="font-semibold mb-2">Key Feature</h3>
                  <Badge variant="secondary" className="text-sm font-semibold bg-primary/20 text-primary">
                    {selectedProject.keyFeature}
                  </Badge>
                </div>
              )}

              {/* Tech Stack */}
              {selectedProject.techStackIcons && (
                <div>
                  <h3 className="font-semibold mb-2">Tech Stack</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.techStackIcons.split(",").map((tech, idx) => (
                      <Badge key={idx} variant="outline">
                        {tech.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Difficulty & Time */}
              {(selectedProject.difficultyLevel || selectedProject.timeToBuild) && (
                <div className="flex gap-4 text-sm">
                  {selectedProject.difficultyLevel && (
                    <div>
                      <span className="font-semibold">Difficulty: </span>
                      <span className="text-muted-foreground">{selectedProject.difficultyLevel}</span>
                    </div>
                  )}
                  {selectedProject.timeToBuild && (
                    <div>
                      <span className="font-semibold">Time to Build: </span>
                      <span className="text-muted-foreground">{selectedProject.timeToBuild}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Images */}
              {(selectedProject.imageUrls && selectedProject.imageUrls.length > 0) || selectedProject.imageUrl ? (
                <div>
                  <h3 className="font-semibold mb-2">Images</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedProject.imageUrls?.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group"
                      >
                        <img
                          src={url}
                          alt={`${selectedProject.title} - Image ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </a>
                    ))}
                    {selectedProject.imageUrl && !selectedProject.imageUrls?.includes(selectedProject.imageUrl) && (
                      <a
                        href={selectedProject.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group"
                      >
                        <img
                          src={selectedProject.imageUrl}
                          alt={selectedProject.title}
                          className="w-full h-32 object-cover rounded-lg border hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              ) : null}

              {/* PDFs */}
              {selectedProject.pdfUrls && selectedProject.pdfUrls.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">PDF Documents</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.pdfUrls.map((url, idx) => (
                      <Button
                        key={idx}
                        asChild
                        variant="outline"
                        size="sm"
                      >
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4 mr-2" />
                          PDF {idx + 1}
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                {selectedProject.demoUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedProject.demoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Demo
                    </a>
                  </Button>
                )}
                {selectedProject.githubUrl && (
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedProject.githubUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-2" />
                      View on GitHub
                    </a>
                  </Button>
                )}
                {selectedProject.driveLinks && selectedProject.driveLinks.length > 0 && (
                  <>
                    {selectedProject.driveLinks.map((link, idx) => (
                      <Button
                        key={idx}
                        asChild
                        variant="outline"
                        size="sm"
                      >
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          {selectedProject.driveLinks!.length > 1 ? `Download ${idx + 1}` : "Download"}
                        </a>
                      </Button>
                    ))}
                  </>
                )}
                {selectedProject.driveLink && !selectedProject.driveLinks?.includes(selectedProject.driveLink) && (
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedProject.driveLink} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download
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

export default Projects;
