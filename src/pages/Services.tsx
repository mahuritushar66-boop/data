import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Briefcase, LineChart, Users, Lightbulb, Code, Brain, BookOpen, TrendingUp, Database, BarChart3, Zap, Target } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type Service = {
  id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  price: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

// Icon mapping
const iconMap: Record<string, any> = {
  Briefcase,
  LineChart,
  Users,
  Lightbulb,
  Code,
  Brain,
  BookOpen,
  TrendingUp,
  Database,
  BarChart3,
  Zap,
  Target,
};

const Services = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "services"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setServices(
          snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              icon: data.icon || "Briefcase",
              title: data.title || "Untitled Service",
              description: data.description || "",
              features: Array.isArray(data.features) ? data.features : [],
              price: data.price || "",
              ctaLabel: data.ctaLabel || "Get Started",
              ctaUrl: data.ctaUrl,
            } as Service;
          }),
        );
        setLoading(false);
      },
      (error) => {
        console.error(error);
        toast({
          title: "Unable to load services",
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
        {/* Header */}
        <div className="text-center mb-16 animate-fade-up">
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Professional Services
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Transform your business with data-driven solutions and expert consulting
          </p>
        </div>

        {/* Services Grid */}
        {loading ? (
          <p className="text-center text-muted-foreground">Loading services…</p>
        ) : services.length === 0 ? (
          <GlassCard className="text-center py-12 bg-gradient-subtle">
            <h2 className="text-2xl font-semibold mb-2">No services available</h2>
            <p className="text-muted-foreground">Services will appear here once added.</p>
          </GlassCard>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {services.map((service) => {
              const Icon = iconMap[service.icon] || Briefcase;
              return (
                <GlassCard key={service.id} className="flex flex-col h-full">
                  <div className="inline-flex p-4 bg-gradient-primary rounded-full mb-4 w-fit">
                    <Icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                  <p className="text-muted-foreground mb-6">{service.description}</p>
                  <ul className="space-y-2 mb-6 flex-grow">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">✓</span>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-border pt-4">
                    {service.price && (
                      <p className="text-lg font-semibold text-primary mb-4">{service.price}</p>
                    )}
                    {service.ctaUrl ? (
                      <Button
                        asChild
                        className="w-full bg-gradient-primary hover:shadow-glow-primary"
                      >
                        <a href={service.ctaUrl} target="_blank" rel="noopener noreferrer">
                          {service.ctaLabel || "Get Started"}
                        </a>
                      </Button>
                    ) : (
                      <Button className="w-full bg-gradient-primary hover:shadow-glow-primary">
                        {service.ctaLabel || "Get Started"}
                      </Button>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Process */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Our Process
            </span>
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Discovery", desc: "Understanding your needs and goals" },
              { step: "02", title: "Planning", desc: "Creating a detailed project roadmap" },
              { step: "03", title: "Execution", desc: "Implementing the solution" },
              { step: "04", title: "Delivery", desc: "Ensuring successful deployment" },
            ].map((item, index) => (
              <GlassCard key={index} className="text-center">
                <div className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
                  {item.step}
                </div>
                <h4 className="text-xl font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* CTA */}
        <GlassCard className="text-center py-12 bg-gradient-subtle">
          <Lightbulb className="h-16 w-16 mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Business?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Let's discuss how data science can drive growth and innovation for your organization
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-accent hover:shadow-glow-secondary"
              onClick={() => window.open("https://topmate.io/tushar_mahuri/1086703", "_blank")}
            >
              Schedule Consultation
            </Button>
            <Button size="lg" variant="outline" className="border-primary text-primary" asChild>
              <Link to="/case-studies">View Case Studies</Link>
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Services;