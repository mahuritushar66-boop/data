import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

type Course = {
  id: string;
  title: string;
  description: string;
  highlights: string[];
  platform: string;
  platformLabel: string;
  courseUrl: string;
  imageUrl?: string;
  price?: string;
  featured?: boolean;
  order?: number;
};

const Courses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Default Udemy course (fallback if no courses in DB)
  const DEFAULT_COURSE: Course = {
    id: "default",
    title: "Full-Stack Data Science with GenAI",
    description: "Build end-to-end ML systems, integrate generative AI, and master deployment with a single practical course.",
    highlights: [
      "Full-stack data science curriculum with GenAI projects",
      "Hands-on labs covering Python, SQL, ML, MLOps, and deployment",
      "Interview preparation vault with real questions",
      "Lifetime Udemy access + completion certificate",
    ],
    platform: "Udemy",
    platformLabel: "Udemy · Lifetime access",
    courseUrl: "https://www.udemy.com/course/full-stack-data-science-with-genai/?referralCode=91337FF58EE03DE3A53D",
    featured: true,
  };

  useEffect(() => {
    const q = query(collection(db, "courses"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title,
            description: data.description,
            highlights: data.highlights || [],
            platform: data.platform,
            platformLabel: data.platformLabel,
            courseUrl: data.courseUrl,
            imageUrl: data.imageUrl,
            price: data.price,
            featured: Boolean(data.featured),
            order: data.order ?? 999,
          } as Course;
        });
        items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        setCourses(items.length > 0 ? items : [DEFAULT_COURSE]);
        setLoading(false);
      },
      (error) => {
        console.error("Courses error:", error);
        setCourses([DEFAULT_COURSE]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen py-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 max-w-5xl space-y-10">
        <div className="text-center animate-fade-up space-y-4">
          <h1 className="text-5xl font-bold">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Courses</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Learn with our comprehensive data science programs.
          </p>
        </div>

        <div className="space-y-8">
          {courses.map((course) => (
            <GlassCard key={course.id} className="p-8 space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                {course.imageUrl && (
                  <div className="md:w-1/3 flex-shrink-0">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-48 md:h-full object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {course.featured && (
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          Featured
                        </Badge>
                      )}
                      {course.platform && (
                        <Badge variant="outline">{course.platform}</Badge>
                      )}
                      {course.price && (
                        <Badge variant="secondary">{course.price}</Badge>
                      )}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold leading-snug">
                      {course.title}
                    </h2>
                    <p className="text-muted-foreground text-lg">
                      {course.description}
                    </p>
                  </div>

                  {course.highlights.length > 0 && (
                    <div className="grid gap-3">
                      {course.highlights.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm text-foreground/90">
                          <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between pt-4 border-t border-border">
                    <div>
                      {course.platformLabel && (
                        <>
                          <p className="text-sm uppercase tracking-wide text-muted-foreground">Hosted on</p>
                          <p className="text-lg font-semibold">{course.platformLabel}</p>
                        </>
                      )}
                    </div>
                    <Button
                      size="lg"
                      className="bg-gradient-primary hover:shadow-glow-primary gap-2"
                      asChild
                    >
                      <a href={course.courseUrl} target="_blank" rel="noreferrer">
                        View Course
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {courses.length === 1 && courses[0].id === "default" && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <p>More courses coming soon!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
