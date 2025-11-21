import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GlassCard from "@/components/GlassCard";
import { ArrowLeft, FileText, Loader2, Sparkles, Eye } from "lucide-react";
import CompanyLogo from "@/components/CompanyLogo";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

type HintQuestion = {
  id: string;
  question: string;
  questionTitle?: string;
  title?: string;
  company?: string;
  difficulty?: "easy" | "medium" | "hard";
  hint?: string;
  expectedOutput?: string;
};

const QuestionHint = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [question, setQuestion] = useState<HintQuestion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!questionId) {
      toast({
        title: "Question not found",
        description: "Invalid hint URL.",
        variant: "destructive",
      });
      navigate("/interview-prep");
      return;
    }

    const ref = doc(db, "interviewQuestions", questionId);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setQuestion({
            id: snapshot.id,
            question: data.question,
            questionTitle: data.questionTitle,
            title: data.title,
            company: data.company,
            difficulty: data.difficulty,
            hint: data.hint,
            expectedOutput: data.expectedOutput,
          });
        } else {
          toast({
            title: "Question not found",
            description: "This question may have been removed.",
            variant: "destructive",
          });
          navigate("/interview-prep");
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error loading hint:", error);
        toast({
          title: "Unable to load hint",
          description: error.message || "Please try again later.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [questionId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading hint…</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 lg:px-8 max-w-4xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`/interview-prep/question/${question.id}`)}
          >
            <FileText className="h-4 w-4" />
            View Full Question
          </Button>
        </div>

        <GlassCard className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {question.company && (
                <Badge variant="secondary" className="gap-1.5">
                  <CompanyLogo companyName={question.company} className="h-3.5 w-3.5" />
                  {question.company}
                </Badge>
              )}
              {question.difficulty && (
                <Badge
                  variant="outline"
                  className={
                    question.difficulty === "easy"
                      ? "border-green-500/60 text-green-500"
                      : question.difficulty === "medium"
                      ? "border-yellow-500/60 text-yellow-500"
                      : "border-red-500/60 text-red-500"
                  }
                >
                  {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-primary font-semibold">Hint Center</p>
              <h1 className="text-3xl font-bold mt-2">{question.questionTitle || "Interview Question Hint"}</h1>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Question Recap
              </h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {question.question}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                Hint
              </h2>
              {question.hint ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {question.hint}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  No hint has been added for this question yet.
                </div>
              )}
            </div>

            {question.expectedOutput && (
              <div>
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-green-500">
                  <Eye className="h-4 w-4" />
                  Expected Output
                </h2>
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5">
                  <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                    {question.expectedOutput}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default QuestionHint;


