import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const Courses = () => {
  const UDEMY_LINK =
    "https://www.udemy.com/course/full-stack-data-science-with-genai/?referralCode=91337FF58EE03DE3A53D";

  const highlights = [
    "Full-stack data science curriculum with GenAI projects",
    "Hands-on labs covering Python, SQL, ML, MLOps, and deployment",
    "Interview preparation vault with real questions",
    "Lifetime Udemy access + completion certificate",
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 max-w-4xl space-y-10">
        <div className="text-center animate-fade-up space-y-4">
          <h1 className="text-5xl font-bold">
            <span className="bg-gradient-primary bg-clip-text text-transparent">Courses</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Learn with our flagship Full-Stack Data Science with GenAI program hosted on Udemy.
          </p>
        </div>

        <GlassCard className="p-8 space-y-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-primary font-semibold">Featured program</p>
            <h2 className="text-3xl font-bold leading-snug">
              Full-Stack Data Science with GenAI &nbsp;
              <span className="text-primary">(Udemy)</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Build end-to-end ML systems, integrate generative AI, and master deployment with a single practical course.
            </p>
          </div>

          <div className="grid gap-3">
            {highlights.map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm text-foreground/90">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="bg-background/50 border border-dashed border-border rounded-xl p-4 text-sm text-muted-foreground">
            This course currently houses all Bytes of Data premium lessons, notebooks, templates, and interview prep
            resources. New cohorts and live mentor sessions are announced inside the course community.
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">Hosted on</p>
              <p className="text-lg font-semibold">Udemy · Lifetime access</p>
            </div>
            <Button
              size="lg"
              className="bg-gradient-primary hover:shadow-glow-primary"
              asChild
            >
              <a href={UDEMY_LINK} target="_blank" rel="noreferrer">
                View course on Udemy
              </a>
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Courses;