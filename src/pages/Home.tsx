import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/GlassCard";
import {
  Brain,
  Users,
  Code,
  BookOpen,
  TrendingUp,
  Download,
  Sparkles,
  Award,
  Target,
  ArrowRight,
  Quote,
  Linkedin,
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

type Testimonial = {
  id: string;
  name: string;
  role?: string;
  company?: string;
  message: string;
  highlight?: string;
  avatarUrl?: string;
  linkedinUrl?: string;
};

const Home = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);

  const services = [
    {
      icon: Brain,
      title: "Interview Prep",
      description: "Master SQL, Python, ML & Statistics with 200+ curated questions",
      link: "/interview-prep",
    },
    {
      icon: Users,
      title: "1:1 Mentorship",
      description: "Personalized guidance from industry experts",
      link: "/mentorship",
    },
    {
      icon: Code,
      title: "Freelance Services",
      description: "Professional data science solutions for your business",
      link: "/services",
    },
    {
      icon: BookOpen,
      title: "Courses",
      description: "Comprehensive learning paths from beginner to advanced",
      link: "/courses",
    },
    {
      icon: TrendingUp,
      title: "Case Studies",
      description: "Real-world projects with detailed analysis",
      link: "/case-studies",
    },
    {
      icon: Download,
      title: "Free Resources",
      description: "Datasets, cheat sheets, and templates",
      link: "/projects",
    },
  ];

  const stats = [
    { number: "500+", label: "Students Mentored" },
    { number: "200+", label: "Interview Questions" },
    { number: "50+", label: "Case Studies" },
    { number: "10+", label: "Courses" },
  ];

  useEffect(() => {
    const testimonialsQuery = query(collection(db, "testimonials"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      testimonialsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name,
            role: data.role,
            company: data.company,
            message: data.message,
            highlight: data.highlight,
            avatarUrl: data.avatarUrl,
            linkedinUrl: data.linkedinUrl,
          } as Testimonial;
        });
        setTestimonials(items);
        setTestimonialsLoading(false);
      },
      () => {
        setTestimonialsLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-up">
            <div className="inline-block">
              <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm text-primary animate-glow">
                <Sparkles className="h-4 w-4" />
                Welcome to bytes_of_data
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Tushar
              </span>
              <br />
              <span className="text-foreground">Data Scientist</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Master data science through expert mentorship, comprehensive courses, and real-world projects
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/interview-prep">
                <Button 
                  size="lg" 
                  className="bg-gradient-primary hover:shadow-glow-primary text-lg px-8 relative overflow-hidden group animate-fade-up"
                  style={{ animationDelay: "0.2s" }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Interview Prep
                    <Sparkles className="h-4 w-4 group-hover:animate-spin" />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Button>
              </Link>
              <Link to="/mentorship">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-primary text-primary hover:bg-primary/10 text-lg px-8 hover-scale hover-glow animate-fade-up"
                  style={{ animationDelay: "0.3s" }}
                >
                  Book Free Call
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
              {stats.map((stat, index) => (
                <GlassCard 
                  key={index} 
                  className="text-center hover-scale animate-scale-in" 
                  hover={true}
                  style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                >
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-pulse-glow">
                    {stat.number}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 group-hover:text-foreground transition-colors">{stat.label}</div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute top-1/4 left-10 w-20 h-20 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </section>

      {/* Services Grid */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Services</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to excel in your data science journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <Link 
                  key={index} 
                  to={service.link}
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <GlassCard className="h-full group cursor-pointer shine-effect">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-gradient-primary rounded-lg group-hover:shadow-glow-primary transition-all group-hover:scale-110 group-hover:rotate-3">
                        <Icon className="h-6 w-6 text-primary-foreground group-hover:animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors gradient-text-primary group-hover:gradient-text-primary">
                          {service.title}
                        </h3>
                        <p className="text-muted-foreground group-hover:text-foreground/80 transition-colors">{service.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all opacity-0 group-hover:opacity-100" />
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {!testimonialsLoading && testimonials.length > 0 && (
        <section className="py-20 bg-gradient-subtle relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 animate-fade-in">
              <p className="text-sm uppercase tracking-[0.4em] text-primary font-semibold mb-3">Testimonials</p>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">What Learners Say</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Real stories from professionals who used BytesOfData to advance their careers.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.slice(0, 6).map((testimonial, index) => (
                <GlassCard
                  key={testimonial.id}
                  className="p-6 h-full flex flex-col space-y-4 animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Quote className="h-8 w-8 text-primary" />
                  <p className="text-lg text-foreground leading-relaxed flex-1">
                    “{testimonial.message}”
                  </p>
                  {testimonial.highlight && (
                    <p className="text-sm font-semibold text-primary">{testimonial.highlight}</p>
                  )}
                  <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                    {testimonial.avatarUrl ? (
                      <img
                        src={testimonial.avatarUrl}
                        alt={`${testimonial.name} avatar`}
                        className="h-12 w-12 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        {testimonial.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{testimonial.name}</p>
                        {testimonial.linkedinUrl && (
                          <a
                            href={testimonial.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 transition-colors"
                            aria-label={`${testimonial.name}'s LinkedIn profile`}
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[testimonial.role, testimonial.company].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <GlassCard className="text-center py-16 bg-gradient-subtle">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 bg-accent/20 rounded-full px-4 py-2 text-accent">
                <Award className="h-5 w-5" />
                <span className="font-semibold">Limited Time Offer</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold">
                Get <span className="bg-gradient-accent bg-clip-text text-transparent">100 Questions</span> Free
              </h2>
              <p className="text-xl text-muted-foreground">
                Start your interview preparation journey with our curated collection of data science questions
              </p>
              <div className="flex flex-wrap gap-4 justify-center pt-4">
                <Link to="/interview-prep">
                  <Button size="lg" className="bg-gradient-accent hover:shadow-glow-secondary">
                    Access Free Questions
                  </Button>
                </Link>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why <span className="bg-gradient-primary bg-clip-text text-transparent">Choose Us</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "Industry-Relevant",
                description: "Content designed based on real interview experiences from top companies",
              },
              {
                icon: Users,
                title: "Expert Mentorship",
                description: "Learn from experienced professionals working in leading tech companies",
              },
              {
                icon: TrendingUp,
                title: "Proven Results",
                description: "500+ students successfully placed in top data science roles",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <GlassCard key={index} className="text-center">
                  <div className="inline-flex p-4 bg-gradient-primary rounded-full mb-4">
                    <Icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;