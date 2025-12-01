import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Lightbulb, FileText, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import PdfViewer from "@/components/PdfViewer";

type TheoryQuestion = {
  id: string;
  module: string;
  question: string;
  hint?: string;
  imageUrls?: string[];
  pdfUrl?: string;
  createdAt?: Date;
};

const TheoryQuestionDetail = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [question, setQuestion] = useState<TheoryQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextQuestionId, setNextQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!questionId) {
      navigate("/interview-prep");
      return;
    }

    const fetchQuestion = async () => {
      try {
        const docRef = doc(db, "theoryQuestions", questionId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          toast({
            title: "Question not found",
            description: "This theory question doesn't exist.",
            variant: "destructive",
          });
          navigate("/interview-prep");
          return;
        }

        const data = docSnap.data();
        setQuestion({
          id: docSnap.id,
          module: data.module,
          question: data.question,
          hint: data.hint,
          imageUrls: data.imageUrls || [],
          pdfUrl: data.pdfUrl,
          createdAt: data.createdAt?.toDate?.(),
        });

        // Fetch next question in the same module
        const questionsQuery = query(
          collection(db, "theoryQuestions"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(questionsQuery);
        const moduleQuestions = snapshot.docs
          .filter((d) => d.data().module === data.module)
          .map((d) => d.id);
        
        const currentIndex = moduleQuestions.indexOf(questionId);
        if (currentIndex !== -1 && currentIndex < moduleQuestions.length - 1) {
          setNextQuestionId(moduleQuestions[currentIndex + 1]);
        }
      } catch (error: any) {
        console.error("Error fetching question:", error);
        toast({
          title: "Error",
          description: "Failed to load the question.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [questionId, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  const hasImages = question.imageUrls && question.imageUrls.length > 0;
  const hasPdf = Boolean(question.pdfUrl);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {question.module}
            </Badge>
            {nextQuestionId && (
              <Button 
                variant="outline" 
                onClick={() => navigate(`/theory-question/${nextQuestionId}`)}
              >
                Next Question
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Question */}
        <GlassCard className="p-6 space-y-6">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Question</h1>
            <div className="text-lg leading-relaxed whitespace-pre-wrap">
              {question.question}
            </div>
          </div>

          {/* Hint Section */}
          {question.hint && (
            <div className="border-t border-border pt-4">
              <Button
                variant="outline"
                onClick={() => setShowHint(!showHint)}
                className="gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                {showHint ? "Hide Hint" : "Show Hint"}
              </Button>
              
              {showHint && (
                <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                  <p className="text-sm leading-relaxed">{question.hint}</p>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Images Section */}
        {hasImages && (
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Images</h2>
              <Badge variant="outline">{question.imageUrls!.length}</Badge>
            </div>

            {question.imageUrls!.length === 1 ? (
              <img
                src={question.imageUrls![0]}
                alt="Question image"
                className="w-full rounded-lg max-h-[600px] object-contain"
              />
            ) : (
              <div className="space-y-4">
                {/* Main Image */}
                <div className="relative">
                  <img
                    src={question.imageUrls![currentImageIndex]}
                    alt={`Image ${currentImageIndex + 1}`}
                    className="w-full rounded-lg max-h-[500px] object-contain"
                  />
                  
                  {/* Navigation Buttons */}
                  <div className="absolute inset-y-0 left-0 flex items-center">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => setCurrentImageIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentImageIndex === 0}
                      className="ml-2 opacity-80"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                  </div>
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => setCurrentImageIndex((prev) => 
                        Math.min(question.imageUrls!.length - 1, prev + 1)
                      )}
                      disabled={currentImageIndex === question.imageUrls!.length - 1}
                      className="mr-2 opacity-80"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </div>
                </div>

                {/* Thumbnails */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {question.imageUrls!.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentImageIndex
                          ? "border-primary"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* PDF Section */}
        {hasPdf && (
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Document</h2>
            </div>
            
            <PdfViewer url={question.pdfUrl!} title={`${question.module} Question Document`} />
          </GlassCard>
        )}

      </div>
    </div>
  );
};

export default TheoryQuestionDetail;

