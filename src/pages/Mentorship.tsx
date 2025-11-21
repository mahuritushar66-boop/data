import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  Brain,
  MapPin,
  CheckSquare,
  Monitor,
  FileCheck,
  Lightbulb,
  Briefcase,
  RefreshCw,
  Rocket,
  ArrowRight,
  ArrowDown,
} from "lucide-react";

const Mentorship = () => {
  const journeySteps = [
    {
      number: 1,
      icon: Calendar,
      title: "Schedule a Free Discovery Call",
      description: "Understand the student's current level, background, and goals.",
      arrowDirection: "right" as const,
    },
    {
      number: 2,
      icon: Users,
      title: "Choose How You Want to Learn",
      description: "Decide between guided learning, project-based track, or career track.",
      arrowDirection: "right" as const,
    },
    {
      number: 3,
      icon: Brain,
      title: "Identify Your Domain of Interest",
      description: "Pick a domain like ML, Analytics, GenAI, NLP, or BI.",
      arrowDirection: "down" as const,
    },
    {
      number: 4,
      icon: MapPin,
      title: "Get Your Personalized Roadmap",
      description: "Receive a customized step-by-step learning plan with milestones.",
      arrowDirection: "right" as const,
    },
    {
      number: 5,
      icon: CheckSquare,
      title: "Review & Refine the Plan",
      description: "Review the roadmap, suggest changes, and finalize the plan.",
      arrowDirection: "right" as const,
    },
    {
      number: 6,
      icon: Monitor,
      title: "Hands-On Live Classes",
      description: "Practical coding sessions to build real projects twice a week.",
      arrowDirection: "down" as const,
    },
    {
      number: 7,
      icon: FileCheck,
      title: "Weekly Assignments & Feedback",
      description: "Structured weekly tasks reviewed and evaluated consistently.",
      arrowDirection: "right" as const,
    },
    {
      number: 8,
      icon: Lightbulb,
      title: "Weekly Doubt Solving",
      description: "Dedicated sessions to clear doubts and track your monthly progress.",
      arrowDirection: "right" as const,
    },
    {
      number: 9,
      icon: Briefcase,
      title: "Portfolio & Interview Prep",
      description: "Build portfolio projects, prepare CV/LinkedIn, and practice interviews.",
      arrowDirection: "down" as const,
    },
    {
      number: 10,
      icon: RefreshCw,
      title: "Continuous Support After Completion",
      description: "Ongoing guidance, updates, and help even after program completion.",
      arrowDirection: "right" as const,
    },
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Your 1:1 Personalized Mentorship Journey
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            A proven 10-step process designed by Tushar Mahuri to transform you into a job-ready Data Scientist.
          </p>
        </div>

        {/* Journey Flowchart */}
        <div className="mb-16">
          {/* Row 1: Steps 1-3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {journeySteps.slice(0, 3).map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative">
                  <GlassCard className="relative p-6 h-full">
                    <div className="absolute -top-3 -left-3 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
                      {step.number}
                    </div>
                    <div className="mt-4 mb-4">
                      <div className="inline-flex p-3 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </GlassCard>
                  {step.arrowDirection === "right" && index < 2 && (
                    <div className="hidden md:flex absolute top-1/2 -right-3 z-10 text-primary">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                  )}
                  {step.arrowDirection === "down" && (
                    <div className="flex justify-center mt-6 mb-6 md:mb-0 text-primary">
                      <ArrowDown className="h-6 w-6" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Row 2: Steps 4-6 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {journeySteps.slice(3, 6).map((step, index) => {
              const Icon = step.icon;
              const actualIndex = index + 3;
              return (
                <div key={step.number} className="relative">
                  <GlassCard className="relative p-6 h-full">
                    <div className="absolute -top-3 -left-3 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
                      {step.number}
                    </div>
                    <div className="mt-4 mb-4">
                      <div className="inline-flex p-3 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </GlassCard>
                  {step.arrowDirection === "right" && actualIndex < 5 && (
                    <div className="hidden md:flex absolute top-1/2 -right-3 z-10 text-primary">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                  )}
                  {step.arrowDirection === "down" && (
                    <div className="flex justify-center mt-6 mb-6 md:mb-0 text-primary">
                      <ArrowDown className="h-6 w-6" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Row 3: Steps 7-9 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {journeySteps.slice(6, 9).map((step, index) => {
              const Icon = step.icon;
              const actualIndex = index + 6;
              return (
                <div key={step.number} className="relative">
                  <GlassCard className="relative p-6 h-full">
                    <div className="absolute -top-3 -left-3 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
                      {step.number}
                    </div>
                    <div className="mt-4 mb-4">
                      <div className="inline-flex p-3 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </GlassCard>
                  {step.arrowDirection === "right" && actualIndex < 8 && (
                    <div className="hidden md:flex absolute top-1/2 -right-3 z-10 text-primary">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                  )}
                  {step.arrowDirection === "down" && (
                    <div className="flex justify-center mt-6 mb-6 md:mb-0 text-primary">
                      <ArrowDown className="h-6 w-6" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Row 4: Step 10 and Outcome */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 10 */}
            <div className="relative">
              <GlassCard className="relative p-6 h-full">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg">
                  10
                </div>
                <div className="mt-4 mb-4">
                  <div className="inline-flex p-3 bg-primary/10 rounded-lg">
                    <RefreshCw className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">{journeySteps[9].title}</h3>
                <p className="text-sm text-muted-foreground">{journeySteps[9].description}</p>
              </GlassCard>
              <div className="hidden md:flex absolute top-1/2 -right-3 z-10 text-primary">
                <ArrowRight className="h-6 w-6" />
              </div>
            </div>

            {/* Outcome */}
            <GlassCard className="relative p-8 bg-gradient-primary text-primary-foreground h-full flex flex-col items-center justify-center text-center">
              <div className="mb-4">
                <div className="inline-flex p-4 bg-primary-foreground/20 rounded-full">
                  <Rocket className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Your Outcome</h2>
              <p className="text-lg font-semibold">Become a job-ready, confident Data Scientist.</p>
            </GlassCard>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Button
            size="lg"
            className="bg-gradient-accent hover:shadow-glow-secondary text-lg px-8 py-6"
            onClick={() => window.open("https://topmate.io/tushar_mahuri/1086703", "_blank")}
          >
            <Calendar className="mr-2 h-5 w-5" />
            Book Your Free Discovery Call
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • 30-minute call • Personalized guidance
          </p>
        </div>
      </div>
    </div>
  );
};

export default Mentorship;
