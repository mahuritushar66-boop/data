import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Briefcase, LineChart, Users, Lightbulb, Code, Brain, BookOpen, TrendingUp, Database, BarChart3, Zap, Target, ExternalLink, CheckCircle2, Clock, Wrench, UserCheck, Star } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type Service = {
  id: string;
  icon: string;
  serviceCategory?: string;
  title: string;
  price: string;
  description: string;
  features: string[];
  deliverables?: string[];
  timeline?: string;
  tools?: string;
  idealFor?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  badge?: string;
  rating?: number;
  testimonials?: string;
  faq?: string;
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
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
              serviceCategory: data.serviceCategory,
              title: data.title || "Untitled Service",
              price: data.price || "",
              description: data.description || "",
              features: Array.isArray(data.features) ? data.features : [],
              deliverables: Array.isArray(data.deliverables) ? data.deliverables : [],
              timeline: data.timeline,
              tools: data.tools,
              idealFor: data.idealFor,
              ctaLabel: data.ctaLabel || "Get Started",
              ctaUrl: data.ctaUrl,
              badge: data.badge,
              rating: data.rating || 5,
              testimonials: data.testimonials,
              faq: data.faq,
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
              const rating = service.rating || 5;
              const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
              
              return (
                <GlassCard key={service.id} className="flex flex-col h-full">
                  {/* Icon */}
                  <div className="inline-flex p-4 bg-gradient-primary rounded-full mb-4 w-fit">
                    <Icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
                  
                  {/* Key Highlights (Features) */}
                  <div className="mb-4 flex-grow">
                    <h4 className="text-sm font-semibold mb-2 text-primary">Key Highlights:</h4>
                    <ul className="space-y-1.5">
                      {service.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-0.5">•</span>
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Price */}
                  {service.price && (
                    <div className="mb-3">
                      <p className="text-lg font-semibold text-primary">{service.price}</p>
                    </div>
                  )}
                  
                  {/* Badge */}
                  {service.badge && (
                    <div className="mb-3">
                      <Badge variant="outline" className="text-xs">
                        ⭐ {service.badge}
                      </Badge>
                    </div>
                  )}
                  
                  {/* Rating */}
                  <div className="mb-4 text-sm text-muted-foreground">
                    <span className="text-yellow-500">{stars}</span>
                    <span className="ml-2">({rating}/5)</span>
                  </div>
                  
                  {/* Buttons */}
                  <div className="border-t border-border pt-4 space-y-2">
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
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedService(service);
                        setIsDetailOpen(true);
                      }}
                    >
                      View Details
                    </Button>
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

      {/* Service Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              {selectedService && (() => {
                const Icon = iconMap[selectedService.icon] || Briefcase;
                return (
                  <div className="inline-flex p-2 bg-gradient-primary rounded-lg">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                );
              })()}
              {selectedService?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedService && (
            <div className="space-y-6">
              {/* Service Category */}
              {selectedService.serviceCategory && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {selectedService.serviceCategory}
                  </Badge>
                </div>
              )}

              {/* Description */}
              {selectedService.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{selectedService.description}</p>
                </div>
              )}

              {/* Price */}
              {selectedService.price && (
                <div>
                  <h3 className="font-semibold mb-2">Pricing</h3>
                  <p className="text-lg font-semibold text-primary">{selectedService.price}</p>
                </div>
              )}

              {/* Rating */}
              {selectedService.rating && (
                <div>
                  <h3 className="font-semibold mb-2">Rating</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < selectedService.rating!
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-muted-foreground">({selectedService.rating}/5)</span>
                  </div>
                </div>
              )}

              {/* Features */}
              {selectedService.features && selectedService.features.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Features & Capabilities
                  </h3>
                  <ul className="space-y-2">
                    {selectedService.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Deliverables */}
              {selectedService.deliverables && selectedService.deliverables.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Deliverables
                  </h3>
                  <ul className="space-y-2">
                    {selectedService.deliverables.map((deliverable, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-muted-foreground">{deliverable}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timeline */}
              {selectedService.timeline && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Timeline / Duration
                  </h3>
                  <p className="text-muted-foreground">{selectedService.timeline}</p>
                </div>
              )}

              {/* Tools / Tech Stack */}
              {selectedService.tools && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    Tools & Technology
                  </h3>
                  <p className="text-muted-foreground">{selectedService.tools}</p>
                </div>
              )}

              {/* Ideal For */}
              {selectedService.idealFor && (
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" />
                    Ideal For
                  </h3>
                  <p className="text-muted-foreground">{selectedService.idealFor}</p>
                </div>
              )}

              {/* Badge */}
              {selectedService.badge && (
                <div>
                  <Badge variant="outline" className="text-sm">
                    ⭐ {selectedService.badge}
                  </Badge>
                </div>
              )}

              {/* Testimonials */}
              {selectedService.testimonials && (
                <div>
                  <h3 className="font-semibold mb-2">Testimonials</h3>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-muted-foreground whitespace-pre-line italic">
                      "{selectedService.testimonials}"
                    </p>
                  </div>
                </div>
              )}

              {/* FAQ */}
              {selectedService.faq && (
                <div>
                  <h3 className="font-semibold mb-2">Frequently Asked Questions</h3>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <p className="text-muted-foreground whitespace-pre-line">{selectedService.faq}</p>
                  </div>
                </div>
              )}

              {/* CTA Button */}
              {selectedService.ctaUrl && (
                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  <Button
                    asChild
                    className="bg-gradient-primary hover:shadow-glow-primary"
                    size="lg"
                  >
                    <a href={selectedService.ctaUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {selectedService.ctaLabel || "Get Started"}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;