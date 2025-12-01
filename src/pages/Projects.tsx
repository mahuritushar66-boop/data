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
  imageUrls?: string[];
  pdfUrls?: string[];
  driveLinks?: string[];
  // Legacy fields
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
              // Handle both new array fields and legacy single fields
              const images = project.imageUrls?.length ? project.imageUrls : (project.imageUrl ? [project.imageUrl] : []);
              const pdfs = project.pdfUrls || [];
              const links = project.driveLinks?.length ? project.driveLinks : (project.driveLink ? [project.driveLink] : []);
              
              return (
                <GlassCard 
                  key={project.id} 
                  className="flex flex-col overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-lg group"
                >
                  {/* Project Image */}
                  {images.length > 0 ? (
                    <div className="aspect-video w-full overflow-hidden bg-muted/30 relative">
                      <img 
                        src={images[0]} 
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {images.length > 1 && (
                        <Badge className="absolute top-2 right-2 bg-black/50 text-white">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          {images.length}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <FolderOpen className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  
                  {/* Project Content */}
                  <div className="flex flex-col flex-1 p-5">
                    <h3 className="text-xl font-bold mb-2 line-clamp-2">{project.title}</h3>
                    <p className="text-muted-foreground text-sm flex-1 line-clamp-3 mb-4">
                      {project.description}
                    </p>
                    
                    {/* Resource badges */}
                    {(pdfs.length > 0 || images.length > 1) && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {pdfs.length > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <FileText className="h-3 w-3" />
                            {pdfs.length} PDF{pdfs.length > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Download Buttons */}
                    <div className="space-y-2">
                      {links.map((link, idx) => (
                        <Button 
                          key={idx}
                          asChild 
                          className={`w-full gap-2 ${idx === 0 ? 'bg-gradient-primary hover:shadow-glow-primary' : 'bg-secondary hover:bg-secondary/80'}`}
                          variant={idx === 0 ? "default" : "secondary"}
                        >
                          <a href={link} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                            {links.length > 1 ? `Download ${idx + 1}` : "Download"}
                          </a>
                        </Button>
                      ))}
                      
                      {/* PDF Links */}
                      {pdfs.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pdfs.map((pdf, idx) => (
                            <Button 
                              key={idx}
                              asChild 
                              variant="outline"
                              size="sm"
                              className="gap-1"
                            >
                              <a href={pdf} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-3 w-3" />
                                PDF {pdfs.length > 1 ? idx + 1 : ""}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
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
