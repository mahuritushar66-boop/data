import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Award, Briefcase, GraduationCap, Target } from "lucide-react";

const About = () => {
  const timeline = [
    { year: "2024", title: "Senior Data Scientist", company: "Tech Corp", desc: "Leading ML initiatives" },
    { year: "2022", title: "Data Scientist", company: "Analytics Inc", desc: "Built predictive models" },
    { year: "2020", title: "Data Analyst", company: "DataCo", desc: "Started data science journey" },
    { year: "2019", title: "Graduate", company: "University", desc: "Computer Science degree" },
  ];

  const skills = [
    "Python", "SQL", "Machine Learning", "Deep Learning", "NLP",
    "Data Visualization", "Statistical Analysis", "Big Data", "Cloud Computing"
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-up">
          <div className="w-32 h-32 bg-gradient-primary rounded-full mx-auto mb-6 flex items-center justify-center text-6xl">
            👨‍💻
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Tushar
            </span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Data Scientist | Mentor | Educator
          </p>
        </div>

        {/* Story */}
        <div className="max-w-4xl mx-auto mb-16">
          <GlassCard>
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Target className="h-8 w-8 text-primary" />
              My Story
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                I'm Tushar, a passionate data scientist with over 5 years of experience in turning complex data into actionable insights. My journey in data science began during my computer science degree, where I discovered the power of machine learning to solve real-world problems.
              </p>
              <p>
                Throughout my career, I've worked with leading tech companies, building predictive models, developing AI solutions, and leading data-driven initiatives that have generated millions in value. But what truly drives me is helping others succeed in this exciting field.
              </p>
              <p>
                Through bytes_of_data, I combine my industry experience with my passion for teaching to help aspiring data scientists achieve their career goals. Whether it's through mentorship, courses, or practical projects, I'm committed to making data science education accessible and effective.
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Skills */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Technical Skills
            </span>
          </h2>
          <div className="flex flex-wrap gap-3 justify-center max-w-4xl mx-auto">
            {skills.map((skill, index) => (
              <Badge key={index} className="text-base px-4 py-2 bg-gradient-primary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        {/* Experience Timeline */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Experience Timeline
            </span>
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {timeline.map((item, index) => (
              <GlassCard key={index} className="relative">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center font-bold">
                      {item.year}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                    <p className="text-primary mb-2">{item.company}</p>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="grid md:grid-cols-3 gap-6">
          <GlassCard className="text-center">
            <Award className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-bold mb-2">500+</h3>
            <p className="text-muted-foreground">Students Mentored</p>
          </GlassCard>
          <GlassCard className="text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-bold mb-2">50+</h3>
            <p className="text-muted-foreground">Projects Completed</p>
          </GlassCard>
          <GlassCard className="text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-bold mb-2">10+</h3>
            <p className="text-muted-foreground">Courses Created</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default About;