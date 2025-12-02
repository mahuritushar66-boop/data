import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Home,
  Code2,
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, getDocs, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import PdfViewer from "@/components/PdfViewer";
import CompanyLogo from "@/components/CompanyLogo";

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
  const { currentUser } = useAuth();
  
  const [question, setQuestion] = useState<TheoryQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [nextQuestionId, setNextQuestionId] = useState<string | null>(null);
  const [prevQuestionId, setPrevQuestionId] = useState<string | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);

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
    setTimerStarted(false);
    setTimeRemaining(null);
  }, [questionId]);

  // Timer logic
  useEffect(() => {
    if (!question || !timerStarted || timeRemaining === null) return;

    if (timeRemaining <= 0) {
      toast({
        title: "Time's Up!",
        description: "The timer has reached zero.",
        variant: "destructive",
      });
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [question, timerStarted, timeRemaining, toast]);

  // Get initial time based on difficulty
  const getTimeForDifficulty = (difficulty?: string) => {
    switch (difficulty) {
      case "easy": return 5 * 60; // 5 minutes
      case "medium": return 8 * 60; // 8 minutes
      case "hard": return 10 * 60; // 10 minutes
      default: return 8 * 60; // Default to 8 minutes
    }
  };

  // Start timer function
  const startTimer = () => {
    if (question && !timerStarted) {
      const initialTime = getTimeForDifficulty(question.difficulty);
      setTimeRemaining(initialTime);
      setTimerStarted(true);
      toast({
        title: "Timer Started",
        description: `You have ${formatTime(initialTime)} to complete this question.`,
      });
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if question is completed
  useEffect(() => {
    if (!currentUser || !questionId) {
      setIsCompleted(false);
      return;
    }

    const submissionRef = doc(db, "userQuestionSubmissions", `${currentUser.uid}_theory_${questionId}`);
    const unsubscribe = onSnapshot(
      submissionRef,
      (snapshot) => {
        if (snapshot.exists() && snapshot.data().status === "completed") {
          setIsCompleted(true);
        } else {
          setIsCompleted(false);
        }
      },
      (error) => {
        console.error("Error checking completion:", error);
      }
    );

    return unsubscribe;
  }, [currentUser, questionId]);

  // Mark question as completed (can be triggered manually or automatically)
  const markAsCompleted = async () => {
    if (!currentUser || !questionId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to mark questions as completed.",
        variant: "destructive",
      });
      return;
    }

    try {
      const submissionRef = doc(db, "userQuestionSubmissions", `${currentUser.uid}_theory_${questionId}`);
      const submissionSnap = await getDoc(submissionRef);

      if (submissionSnap.exists() && submissionSnap.data().status === "completed") {
        toast({
          title: "Already completed",
          description: "This question is already marked as completed.",
        });
        return;
      }

      if (submissionSnap.exists()) {
        await updateDoc(submissionRef, {
          status: "completed",
          completedAt: serverTimestamp(),
        });
      } else {
        await setDoc(submissionRef, {
          userId: currentUser.uid,
          questionId: questionId,
          status: "completed",
          completedAt: serverTimestamp(),
        });
      }

      setIsCompleted(true);
      toast({
        title: "Question completed!",
        description: "Great job! This question has been marked as completed.",
      });
    } catch (error: any) {
      console.error("Error marking as completed:", error);
      toast({
        title: "Error",
        description: "Failed to mark question as completed.",
        variant: "destructive",
      });
    }
  };

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


  return (
    <div className="min-h-screen pb-20 pt-16">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="px-4 lg:px-6 pt-0 pb-2 bg-background">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl lg:text-3xl font-bold">
            {question.questionTitle || question.module}
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/interview-prep/module/${encodeURIComponent(question.module)}`);
              }}
              className="flex items-center gap-2 border-primary/50 bg-transparent hover:bg-transparent hover:border-primary/50 text-foreground hover:text-foreground cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to module
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (nextQuestionId) {
                  navigate(`/theory-question/${nextQuestionId}`);
                } else {
                  toast({
                    title: "No Next Question",
                    description: "This is the last question in this module.",
                    variant: "default",
                  });
                }
              }}
              className="flex items-center gap-2 border-primary/50 bg-transparent hover:bg-transparent hover:border-primary/50 text-foreground hover:text-foreground cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
              Next Question
            </Button>

              {/* Difficulty Badge */}
              {question.difficulty && (
                <Badge
                  variant="outline"
                  className={`gap-1.5 px-3 py-1 text-sm font-medium ${
                    question.difficulty === "easy"
                      ? "border-green-500/60 text-green-400 bg-green-500/15"
                      : question.difficulty === "medium"
                      ? "border-yellow-500/60 text-yellow-400 bg-yellow-500/15"
                      : "border-red-500/60 text-red-400 bg-red-500/15"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current" />
                  {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                </Badge>
              )}

              {/* Language Badge */}
              <Badge variant="outline" className="gap-2 px-3 py-1.5 border-border/50">
                <Code2 className="h-3.5 w-3.5" />
                <span className="font-medium">THEORY</span>
              </Badge>

              {/* Company Badge */}
              {question.company && (
                <Badge 
                  variant="secondary" 
                  className="gap-1.5 px-3 py-1 text-sm font-medium bg-muted text-foreground border-border/50 hover:bg-muted"
                >
                  <CompanyLogo companyName={question.company} size={14} className="flex-shrink-0" />
                  {question.company}
                </Badge>
              )}

            {/* Timer */}
            {!timerStarted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={startTimer}
                className="gap-1.5 px-3 py-1 text-sm font-medium border-blue-500/60 text-blue-400 bg-blue-500/15 hover:bg-blue-500/15 hover:border-blue-500/60"
              >
                <Clock className="h-3.5 w-3.5" />
                Start Timer ({formatTime(getTimeForDifficulty(question.difficulty))})
              </Button>
            ) : timeRemaining !== null ? (
              <Badge
                variant="outline"
                className={`gap-1.5 px-3 py-1 text-sm font-medium font-mono ${
                  timeRemaining <= 60
                    ? "border-red-500/60 text-red-400 bg-red-500/15"
                    : timeRemaining <= 180
                    ? "border-yellow-500/60 text-yellow-400 bg-yellow-500/15"
                    : "border-blue-500/60 text-blue-400 bg-blue-500/15"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {formatTime(timeRemaining)}
              </Badge>
            ) : null}
            {isCompleted && (
              <Badge 
                variant="default" 
                className="gap-1.5 px-3 py-1 text-sm font-medium bg-green-500/20 text-green-400 border-green-500/50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Completed
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Split Layout */}
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side: Question and Images */}
          <div className="space-y-6">
            {/* Question Section */}
            <div className="space-y-6">
              {/* Question Text */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Question</span>
                </div>
                <div className="text-lg md:text-xl leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {question.question}
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

              {/* Mark as Completed Button */}
              {!isCompleted && currentUser && (
                <div className="pt-4 border-t border-border/50">
                  <Button
                    onClick={markAsCompleted}
                    className="gap-2 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark as Completed
                  </Button>
                </div>
              )}
            </div>

            {/* Images Section */}
            {hasImages && (
              <div className="space-y-5">
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
              </div>
            )}
          </div>

          {/* Right Side: PDF Viewer */}
          {hasPdf && (
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="flex flex-col h-[calc(100vh-180px)] min-h-[700px] max-h-[900px]">
                <div className="flex items-center gap-3 flex-shrink-0 mb-5">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <FileText className="h-5 w-5 text-red-500" />
                  </div>
                  <h2 className="text-xl font-semibold">Document</h2>
                </div>
                
                <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                  <PdfViewer 
                    url={question.pdfUrl!} 
                    title={`${question.module} Question Document`}
                    height="calc(100vh - 350px)"
                  />
                </div>
              </div>
            </div>
          )}

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
