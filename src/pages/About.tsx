import { useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Award, Briefcase, GraduationCap, Target, Users, Code, Brain, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

type AboutContent = {
  name: string;
  title: string;
  avatarUrl?: string;
  story: string;
  skills: string[];
  timeline: {
    year: string;
    startYear?: string;
    endYear?: string;
    title: string;
    company: string;
    desc: string;
    experienceDetails?: string[]; // Bullet points for experience details
  }[];
  achievements: {
    icon: string;
    value: string;
    label: string;
  }[];
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Award,
  Briefcase,
  GraduationCap,
  Users,
  Code,
  Brain,
  Target,
};

const defaultContent: AboutContent = {
  name: "Tushar",
  title: "Data Scientist | Mentor | Educator",
  story: `I'm Tushar, a passionate data scientist with over 5 years of experience in turning complex data into actionable insights. My journey in data science began during my computer science degree, where I discovered the power of machine learning to solve real-world problems.

Throughout my career, I've worked with leading tech companies, building predictive models, developing AI solutions, and leading data-driven initiatives that have generated millions in value. But what truly drives me is helping others succeed in this exciting field.

Through bytes_of_data, I combine my industry experience with my passion for teaching to help aspiring data scientists achieve their career goals. Whether it's through mentorship, courses, or practical projects, I'm committed to making data science education accessible and effective.`,
  skills: [
    "Python", "SQL", "Machine Learning", "Deep Learning", "NLP",
    "Data Visualization", "Statistical Analysis", "Big Data", "Cloud Computing"
  ],
  timeline: [
    { year: "2024", startYear: "2024", endYear: "present", title: "Senior Data Scientist", company: "Tech Corp", desc: "Leading ML initiatives", experienceDetails: ["Leading ML initiatives", "Building predictive models", "Mentoring team members"] },
    { year: "2022", startYear: "2022", endYear: "2024", title: "Data Scientist", company: "Analytics Inc", desc: "Built predictive models", experienceDetails: ["Built predictive models", "Developed ML pipelines", "Collaborated with cross-functional teams"] },
    { year: "2020", startYear: "2020", endYear: "2022", title: "Data Analyst", company: "DataCo", desc: "Started data science journey", experienceDetails: ["Started data science journey", "Performed data analysis", "Created dashboards"] },
    { year: "2019", startYear: "2019", endYear: "2020", title: "Graduate", company: "University", desc: "Computer Science degree", experienceDetails: ["Computer Science degree", "Specialized in Machine Learning", "Graduated with honors"] },
  ],
  achievements: [
    { icon: "Award", value: "500+", label: "Students Mentored" },
    { icon: "Briefcase", value: "50+", label: "Projects Completed" },
    { icon: "GraduationCap", value: "10+", label: "Courses Created" },
  ],
};

const About = () => {
  const [content, setContent] = useState<AboutContent>(defaultContent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "siteContent", "about"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setContent({
            name: data.name || defaultContent.name,
            title: data.title || defaultContent.title,
            avatarUrl: data.avatarUrl,
            story: data.story || defaultContent.story,
            skills: data.skills?.length > 0 ? data.skills : defaultContent.skills,
            timeline: data.timeline?.length > 0 ? data.timeline.map((item: any) => ({
              ...item,
              startYear: item.startYear || item.year,
              endYear: item.endYear || (item.year ? undefined : "present"),
              experienceDetails: item.experienceDetails || [],
            })) : defaultContent.timeline,
            achievements: data.achievements?.length > 0 ? data.achievements : defaultContent.achievements,
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error("About content error:", error);
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
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-up">
          {content.avatarUrl ? (
            <img
              src={content.avatarUrl}
              alt={content.name}
              className="w-32 h-32 rounded-full mx-auto mb-6 object-cover border-4 border-primary/30"
            />
          ) : (
            <div className="w-32 h-32 bg-gradient-primary rounded-full mx-auto mb-6 flex items-center justify-center text-6xl">
              👨‍💻
            </div>
          )}
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              {content.name}
            </span>
          </h1>
          <p className="text-xl text-muted-foreground">
            {content.title}
          </p>
        </div>

        {/* Story */}
        <div className="max-w-4xl mx-auto mb-16">
          <GlassCard>
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Target className="h-8 w-8 text-primary" />
              My Story
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed whitespace-pre-line">
              {content.story}
            </div>
          </GlassCard>
        </div>

        {/* Skills */}
        {content.skills.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Technical Skills
              </span>
            </h2>
            <div className="flex flex-wrap gap-3 justify-center max-w-4xl mx-auto">
              {content.skills.map((skill, index) => (
                <Badge key={index} className="text-base px-4 py-2 bg-gradient-primary">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Experience Timeline */}
        {content.timeline.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Experience Timeline
              </span>
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              {content.timeline.map((item, index) => {
                const timeDuration = item.startYear && item.endYear 
                  ? `${item.startYear} ${item.endYear === "present" ? "to present" : `to ${item.endYear}`}`
                  : item.year;
                return (
                  <GlassCard key={index} className="relative">
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center font-bold text-xs text-center px-2">
                          {timeDuration}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                        <p className="text-primary mb-2">{item.company}</p>
                        <p className="text-muted-foreground mb-3">{item.desc}</p>
                        {item.experienceDetails && item.experienceDetails.length > 0 && (
                          <ul className="space-y-1.5 mt-3">
                            {item.experienceDetails.map((detail, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="text-primary mt-1">•</span>
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Achievements */}
        {content.achievements.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {content.achievements.map((achievement, index) => {
              const IconComponent = iconMap[achievement.icon] || Award;
              return (
                <GlassCard key={index} className="text-center">
                  <IconComponent className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-2xl font-bold mb-2">{achievement.value}</h3>
                  <p className="text-muted-foreground">{achievement.label}</p>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default About;
