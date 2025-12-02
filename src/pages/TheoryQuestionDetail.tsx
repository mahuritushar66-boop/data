import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Lightbulb, 
  FileText, 
  ImageIcon, 
  ChevronLeft, 
  ChevronRight,
  Brain,
  Sparkles,
  Eye,
  EyeOff,
  Building2,
  X,
  ZoomIn,
  Home
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import PdfViewer from "@/components/PdfViewer";

type TheoryQuestion = {
  id: string;
  module: string;
  questionTitle?: string;
  question: string;
  hint?: string;
  imageUrls?: string[];
  pdfUrl?: string;
  company?: string;
  difficulty?: "easy" | "medium" | "hard";
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
  const [prevQuestionId, setPrevQuestionId] = useState<string | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
          questionTitle: data.questionTitle,
          question: data.question,
          hint: data.hint,
          imageUrls: data.imageUrls || [],
          pdfUrl: data.pdfUrl,
          company: data.company,
          difficulty: data.difficulty,
          createdAt: data.createdAt?.toDate?.(),
        });

        // Fetch all questions in the same module for navigation
        const questionsQuery = query(
          collection(db, "theoryQuestions"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(questionsQuery);
        const moduleQuestions = snapshot.docs
          .filter((d) => d.data().module === data.module)
          .map((d) => d.id);
        
        setTotalQuestions(moduleQuestions.length);
        const currentIndex = moduleQuestions.indexOf(questionId);
        setCurrentQuestionNumber(currentIndex + 1);
        
        if (currentIndex > 0) {
          setPrevQuestionId(moduleQuestions[currentIndex - 1]);
        } else {
          setPrevQuestionId(null);
        }
        
        if (currentIndex !== -1 && currentIndex < moduleQuestions.length - 1) {
          setNextQuestionId(moduleQuestions[currentIndex + 1]);
        } else {
          setNextQuestionId(null);
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

  // Reset states when question changes
  useEffect(() => {
    setShowHint(false);
    setCurrentImageIndex(0);
    setLightboxOpen(false);
  }, [questionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <Brain className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading puzzle...</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  const hasImages = question.imageUrls && question.imageUrls.length > 0;
  const hasPdf = Boolean(question.pdfUrl);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "easy": return "border-green-500/50 text-green-500 bg-green-500/10";
      case "medium": return "border-yellow-500/50 text-yellow-500 bg-yellow-500/10";
      case "hard": return "border-red-500/50 text-red-500 bg-red-500/10";
      default: return "border-muted-foreground/50 text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Top Navigation Bar */}
      <div className="sticky top-12 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(`/interview-prep/module/${encodeURIComponent(question.module)}`)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to {question.module}</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Question counter */}
              <Badge variant="outline" className="font-mono">
                {currentQuestionNumber} / {totalQuestions}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Header Card */}
        <GlassCard className="p-6 md:p-8 relative overflow-hidden">
          {/* Decorative corner accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-10 rounded-bl-[100px]" />
          
          <div className="relative space-y-6">
            {/* Module & Meta info */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-gradient-primary text-white border-0 gap-1.5 px-3 py-1">
                <Brain className="h-3.5 w-3.5" />
                {question.module}
              </Badge>
              
              {question.difficulty && (
                <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                  <span className="w-2 h-2 rounded-full bg-current mr-1.5" />
                  {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                </Badge>
              )}
              
              {question.company && (
                <Badge variant="secondary" className="gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {question.company}
                </Badge>
              )}
            </div>

            {/* Question Title & Text */}
            <div className="space-y-4">
              {question.questionTitle && (
                <h1 className="text-2xl md:text-3xl font-bold">
                  {question.questionTitle}
                </h1>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Question</span>
                </div>
                <div className="text-lg md:text-xl leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {question.question}
                </div>
              </div>
            </div>

            {/* Hint Section */}
            {question.hint && (
              <div className="pt-4 border-t border-border/50">
                <Button
                  variant={showHint ? "secondary" : "outline"}
                  onClick={() => setShowHint(!showHint)}
                  className="gap-2 transition-all duration-300"
                >
                  {showHint ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Hide Hint
                    </>
                  ) : (
                    <>
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Show Hint
                    </>
                  )}
                </Button>
                
                <div className={`overflow-hidden transition-all duration-500 ease-out ${
                  showHint ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0"
                }`}>
                  <div className="p-4 md:p-5 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-yellow-500/20">
                        <Lightbulb className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">Hint</p>
                        <p className="text-sm md:text-base leading-relaxed">{question.hint}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Images Section */}
        {hasImages && (
          <GlassCard className="p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Visual Reference</h2>
              </div>
              <Badge variant="outline">{question.imageUrls!.length} image{question.imageUrls!.length > 1 ? "s" : ""}</Badge>
            </div>

            {/* Main Image Display */}
            <div className="relative group">
              <div 
                className="relative rounded-xl overflow-hidden bg-muted/30 cursor-zoom-in"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={question.imageUrls![currentImageIndex]}
                  alt={`Visual ${currentImageIndex + 1}`}
                  className="w-full max-h-[500px] object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                />
                
                {/* Zoom indicator */}
                <div className="absolute bottom-4 right-4 p-2 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-5 w-5" />
                </div>
              </div>
              
              {/* Navigation arrows for multiple images */}
              {question.imageUrls!.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => Math.max(0, prev - 1));
                    }}
                    disabled={currentImageIndex === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex((prev) => Math.min(question.imageUrls!.length - 1, prev + 1));
                    }}
                    disabled={currentImageIndex === question.imageUrls!.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {question.imageUrls!.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {question.imageUrls!.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      idx === currentImageIndex
                        ? "border-primary ring-2 ring-primary/30 scale-105"
                        : "border-transparent opacity-60 hover:opacity-100 hover:border-muted-foreground/30"
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
            )}
          </GlassCard>
        )}

        {/* PDF Section */}
        {hasPdf && (
          <GlassCard className="p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <FileText className="h-5 w-5 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold">Document</h2>
            </div>
            
            <PdfViewer url={question.pdfUrl!} title={`${question.module} Question Document`} />
          </GlassCard>
        )}

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => prevQuestionId && navigate(`/theory-question/${prevQuestionId}`)}
            disabled={!prevQuestionId}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => navigate(`/interview-prep/module/${encodeURIComponent(question.module)}`)}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            All Questions
          </Button>
          
          <Button
            variant={nextQuestionId ? "default" : "outline"}
            onClick={() => nextQuestionId && navigate(`/theory-question/${nextQuestionId}`)}
            disabled={!nextQuestionId}
            className="gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && hasImages && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </Button>
          
          <img
            src={question.imageUrls![currentImageIndex]}
            alt={`Visual ${currentImageIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          {question.imageUrls!.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => Math.max(0, prev - 1));
                }}
                disabled={currentImageIndex === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex((prev) => Math.min(question.imageUrls!.length - 1, prev + 1));
                }}
                disabled={currentImageIndex === question.imageUrls!.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10"
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
              
              {/* Image counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 text-white text-sm">
                {currentImageIndex + 1} / {question.imageUrls!.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TheoryQuestionDetail;
