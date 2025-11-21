import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Loader2, Terminal, Code2, FileText, Lightbulb, Sparkles, Eye, Copy, Check } from "lucide-react";
import CompanyLogo from "@/components/CompanyLogo";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import CodeEditor from "@/components/CodeEditor";
import AuthModal from "@/components/AuthModal";

type InterviewQuestion = {
  id: string;
  question: string;
  answer: string;
  tier: "free" | "paid";
  createdAt?: Date;
  title?: string;
  questionTitle?: string;
  expectedOutput?: string;
  difficulty?: "easy" | "medium" | "hard";
  company?: string;
  hint?: string;
  sqlTableNames?: string;
};

// Solution component with copy button
const SolutionWithCopy = ({ solution }: { solution: string }) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(solution);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Solution copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-lg bg-muted/30 border border-border/50 p-4 relative group">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
      <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto pr-10">
        {solution}
      </pre>
    </div>
  );
};

// Helper function to detect language from module title
const detectLanguage = (moduleTitle: string): string => {
  const titleLower = moduleTitle.toLowerCase();
  if (titleLower.includes("python")) return "python";
  if (titleLower.includes("sql")) return "sql";
  if (titleLower.includes("javascript") || titleLower.includes("js")) return "javascript";
  if (titleLower.includes("typescript") || titleLower.includes("ts")) return "typescript";
  if (titleLower.includes("java")) return "java";
  if (titleLower.includes("c++") || titleLower.includes("cpp")) return "cpp";
  if (titleLower.includes("c#") || titleLower.includes("csharp")) return "csharp";
  if (titleLower.includes("go")) return "go";
  if (titleLower.includes("rust")) return "rust";
  return "python";
};

const sanitizeSqlIdentifier = (value: string, fallback: string) => {
  if (!value) return fallback;
  const cleaned = value
    .toString()
    .trim()
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_{2,}/g, "_");
  const withoutLeading = cleaned.replace(/^[^A-Za-z_]+/, "");
  return withoutLeading || fallback;
};

// Helper function to parse JSON and check if it's a table structure
const parseTableJSON = (text: string): { columns?: string[]; values?: any[][] } | null => {
  try {
    const parsed = JSON.parse(text.trim());
    if (
      parsed && 
      typeof parsed === 'object' && 
      !Array.isArray(parsed) &&
      Array.isArray(parsed.columns) && 
      Array.isArray(parsed.values) &&
      parsed.columns.length > 0
    ) {
      return parsed;
    }
  } catch (e) {
    // Not valid JSON or not table format
  }
  return null;
};

// Helper function to render question content with JSON table detection
const renderQuestionContent = (questionText: string) => {
  let tableCounter = 0;
  const resolveTableName = (data?: Record<string, any>) => {
    const raw =
      (typeof data?.tableName === "string" && data.tableName.trim()) ||
      (typeof data?.name === "string" && data.name.trim());
    const fallback = `dataset_${tableCounter + 1}`;
    const sqlName = sanitizeSqlIdentifier(raw || fallback, fallback);
    tableCounter += 1;
    return sqlName;
  };

  // First, try to parse the entire question as JSON
  const tableData = parseTableJSON(questionText);
  if (tableData) {
    const sqlName = resolveTableName(tableData);
    // Entire question is a JSON table
    return (
      <div className="rounded-md bg-background/60 border border-border/50 overflow-hidden">
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border/50 bg-muted/30 flex items-center gap-2">
          <span>SQL table:</span>
          <code className="px-2 py-0.5 rounded bg-background border border-border/50 font-semibold">{sqlName}</code>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border/50 bg-muted/30">
                {tableData.columns?.map((col, idx) => (
                  <th key={idx} className="px-5 py-3 text-left font-bold text-foreground">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.values?.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="px-5 py-3 text-foreground/90">
                      {String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Try to find JSON blocks within the text (handles multi-line JSON)
  const jsonBlockRegex = /\{[\s\S]*?"columns"[\s\S]*?"values"[\s\S]*?\}/g;
  const jsonBlocks: Array<{ start: number; end: number; data: { columns?: string[]; values?: any[][]; tableName?: string; name?: string } }> = [];
  let match;
  
  while ((match = jsonBlockRegex.exec(questionText)) !== null) {
    const jsonStr = match[0];
    const tableData = parseTableJSON(jsonStr);
    if (tableData) {
      jsonBlocks.push({
        start: match.index,
        end: match.index + jsonStr.length,
        data: tableData
      });
    }
  }

  // If we found JSON blocks, render with mixed content
  if (jsonBlocks.length > 0) {
    const parts: Array<{ type: 'text' | 'table'; content: string | { columns?: string[]; values?: any[][] } }> = [];
    let lastIndex = 0;

    jsonBlocks.forEach((block) => {
      // Add text before the JSON block
      if (block.start > lastIndex) {
        const textBefore = questionText.substring(lastIndex, block.start).trim();
        if (textBefore) {
          parts.push({ type: 'text', content: textBefore });
        }
      }
      // Add the JSON table
      parts.push({ type: 'table', content: block.data });
      lastIndex = block.end;
    });

    // Add remaining text after the last JSON block
    if (lastIndex < questionText.length) {
      const textAfter = questionText.substring(lastIndex).trim();
      if (textAfter) {
        parts.push({ type: 'text', content: textAfter });
      }
    }

    return (
      <div className="space-y-4">
        {parts.map((part, idx) => {
          if (part.type === 'table') {
            const tableData = part.content as { columns?: string[]; values?: any[][] };
            const sqlName = resolveTableName(tableData);
            return (
              <div key={idx} className="rounded-md bg-background/60 border border-border/50 overflow-hidden">
                <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border/50 bg-muted/30 flex items-center gap-2">
                  <span>SQL table:</span>
                  <code className="px-2 py-0.5 rounded bg-background border border-border/50 font-semibold">
                    {sqlName}
                  </code>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-border/50 bg-muted/30">
                        {tableData.columns?.map((col, colIdx) => (
                          <th key={colIdx} className="px-5 py-3 text-left font-bold text-foreground">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.values?.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="px-5 py-3 text-foreground/90">
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          } else {
            // Render text with line breaks
            return (
              <div key={idx} className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {(part.content as string).split('\n').map((line, lineIdx) => (
                  <p key={lineIdx} className="mb-2 last:mb-0">
                    {line || '\u00A0'}
                  </p>
                ))}
              </div>
            );
          }
        })}
      </div>
    );
  }

  // Otherwise, render as regular text with line breaks
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 space-y-3">
      {questionText.split('\n').map((line, idx) => (
        <p key={idx} className="mb-2 last:mb-0">
          {line || '\u00A0'}
        </p>
      ))}
    </div>
  );
};

const QuestionDetail = () => {
  const { questionId } = useParams<{ questionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, currentUser } = useAuth();
  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState("question");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [output, setOutput] = useState<{ columns: string[]; values: any[][] } | null>(null);
  const [textOutput, setTextOutput] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem("questionDetailLeftPanelWidth");
    return saved ? parseFloat(saved) : 50; // Default 50%
  });
  const [compilerHeight, setCompilerHeight] = useState(() => {
    const saved = localStorage.getItem("questionDetailCompilerHeight");
    return saved ? parseFloat(saved) : 75; // Default 75%
  });
  const [isResizingHorizontal, setIsResizingHorizontal] = useState(false);
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const updateIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    updateIsDesktop();
    window.addEventListener('resize', updateIsDesktop);
    return () => window.removeEventListener('resize', updateIsDesktop);
  }, []);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [questionId]);

  // Save panel widths to localStorage
  useEffect(() => {
    localStorage.setItem("questionDetailLeftPanelWidth", leftPanelWidth.toString());
  }, [leftPanelWidth]);

  useEffect(() => {
    localStorage.setItem("questionDetailCompilerHeight", compilerHeight.toString());
  }, [compilerHeight]);

  // Handle horizontal resizing (left/right panels)
  const handleMouseDownHorizontal = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingHorizontal(true);
  }, []);

  // Handle vertical resizing (compiler/output)
  const handleMouseDownVertical = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingVertical(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      if (isResizingHorizontal) {
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        const constrainedWidth = Math.max(30, Math.min(70, newLeftWidth));
        setLeftPanelWidth(constrainedWidth);
      }

      if (isResizingVertical) {
        const container = containerRef.current;
        const rightPanel = container.querySelector('[data-right-panel]') as HTMLElement;
        if (rightPanel) {
          const panelRect = rightPanel.getBoundingClientRect();
          const relativeY = e.clientY - panelRect.top;
          const newHeight = (relativeY / panelRect.height) * 100;
          const constrainedHeight = Math.max(20, Math.min(80, newHeight));
          setCompilerHeight(constrainedHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingHorizontal(false);
      setIsResizingVertical(false);
    };

    if (isResizingHorizontal || isResizingVertical) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizingHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingHorizontal, isResizingVertical]);


  // Fetch question
  useEffect(() => {
    if (!questionId) {
      toast({
        title: "Question not found",
        description: "Invalid question ID.",
        variant: "destructive",
      });
      navigate("/interview-prep");
      return;
    }

    const questionRef = doc(db, "interviewQuestions", questionId);
    const unsubscribe = onSnapshot(
      questionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setQuestion({
            id: snapshot.id,
            question: data.question,
            answer: data.answer,
            tier: data.tier ?? "free",
            createdAt: data.createdAt?.toDate?.(),
            title: data.title,
            questionTitle: data.questionTitle,
            expectedOutput: data.expectedOutput,
            difficulty: data.difficulty,
            company: data.company,
            hint: data.hint,
          } as InterviewQuestion);
        } else {
          toast({
            title: "Question not found",
            description: "The question you're looking for doesn't exist.",
            variant: "destructive",
          });
          navigate("/interview-prep");
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching question:", error);
        toast({
          title: "Unable to load question",
          description: error.message || "Please try again later.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [questionId, navigate, toast]);

  // Check if question is completed
  useEffect(() => {
    if (!currentUser || !questionId) {
      setIsCompleted(false);
      return;
    }

    const submissionRef = doc(db, "userQuestionSubmissions", `${currentUser.uid}_${questionId}`);
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

  const moduleTitle = question?.title || "General";
  const language = detectLanguage(moduleTitle);
  const canViewPaid = Boolean(profile?.isPaid);

  const handleShowSolution = () => {
    if (!currentUser) {
      setAuthMode("signup");
      setAuthModalOpen(true);
      return;
    }
    setActiveTab("solution");
  };

  if (loading) {
    return (
      <div className="min-h-screen py-20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading question…</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  // Check if user can view this question
  if (question.tier === "paid" && !canViewPaid) {
    return (
      <div className="min-h-screen py-20">
        <div className="container mx-auto px-4 lg:px-6 max-w-4xl">
          <div className="p-12 text-center border border-border rounded-lg bg-card">
            <div className="max-w-md mx-auto space-y-4">
              <div className="inline-flex p-4 rounded-full bg-muted/50">
                <Terminal className="h-12 w-12 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-semibold">Premium Question</h2>
              <p className="text-muted-foreground">
                This is a premium question. Upgrade your account to access it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-4 lg:px-6 py-4 bg-background">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl lg:text-3xl font-bold">
              {question.questionTitle || "Interview Question"}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
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
              <Badge variant="outline" className="gap-2 px-3 py-1.5 border-border/50">
                <Code2 className="h-3.5 w-3.5" />
                <span className="font-medium">{language.toUpperCase()}</span>
              </Badge>
            </div>
          </div>
          {question.company && (
            <div className="flex items-center gap-2 mb-4">
              <Badge 
                variant="secondary" 
                className="gap-1.5 px-3 py-1 text-sm font-medium bg-secondary/20"
              >
                <CompanyLogo companyName={question.company} size={14} className="flex-shrink-0" />
                {question.company}
              </Badge>
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
          )}
        </div>

        {/* Main content */}
        <div 
          ref={containerRef}
          className="flex-1 flex flex-col lg:flex-row"
          style={{ minHeight: "calc(100vh - 140px)" }}
        >
          {/* Left Panel: Question - Scrollable */}
          <div 
            className="flex flex-col bg-background transition-none lg:overflow-y-auto custom-scrollbar"
            style={{ width: isDesktop ? `${leftPanelWidth}%` : '100%' }}
          >
            <div className="px-4 lg:px-6 pb-3 border-b border-border/30">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-transparent h-auto p-0 gap-1">
                  <TabsTrigger value="question" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2">
                    Question
                  </TabsTrigger>
                  <TabsTrigger 
                    value="hint"
                    disabled={!question.hint}
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
                  >
                    Hint
                  </TabsTrigger>
                  <TabsTrigger 
                    value="expectedOutput"
                    disabled={!question.expectedOutput || !question.expectedOutput.trim()}
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
                  >
                    Expected Output
                  </TabsTrigger>
                  <TabsTrigger 
                    value="solution" 
                    onClick={handleShowSolution}
                    disabled={!currentUser}
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
                  >
                    Solution
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 lg:px-6 py-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="question" className="mt-0">
                  {renderQuestionContent(question.question)}
                </TabsContent>

                <TabsContent value="hint" className="mt-0">
                  {question.hint ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase tracking-wide">
                        <Sparkles className="h-4 w-4" />
                        Quick Hint
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                        {question.hint.split("\n").map((line, idx) => (
                          <p key={idx} className="mb-2 last:mb-0">
                            {line || '\u00A0'}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                      No hint has been added yet for this question.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="expectedOutput" className="mt-0">
                  {question.expectedOutput && question.expectedOutput.trim() ? (
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-green-500 font-semibold text-sm uppercase tracking-wide">
                        <Eye className="h-4 w-4" />
                        Expected Output
                      </div>
                      {(() => {
                        const tableData = parseTableJSON(question.expectedOutput);
                        if (tableData) {
                          return (
                            <div className="rounded-md bg-background/60 border border-border/50 overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b-2 border-border/50 bg-muted/30">
                                      {tableData.columns?.map((col, idx) => (
                                        <th key={idx} className="px-5 py-3 text-left font-bold text-foreground">
                                          {col}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tableData.values?.map((row, rowIdx) => (
                                      <tr key={rowIdx} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                        {row.map((cell, cellIdx) => (
                                          <td key={cellIdx} className="px-5 py-3 text-foreground/90">
                                            {String(cell)}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="rounded-md bg-background/60 border border-border/50 p-3">
                            <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
                              {question.expectedOutput}
                            </pre>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                      No expected output has been added for this question yet.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="solution" className="mt-0">
                  {currentUser ? (
                    <SolutionWithCopy solution={question.answer} />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-12">
                      <div className="p-4 rounded-full bg-muted/50">
                        <Lightbulb className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Sign in to view the solution</p>
                      <Button onClick={() => setAuthModalOpen(true)} size="sm">
                        Sign In
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Horizontal Resizer */}
          {isDesktop && (
            <div
              onMouseDown={handleMouseDownHorizontal}
              className={`w-1 bg-border/50 hover:bg-primary/50 cursor-col-resize transition-colors flex items-center justify-center group relative ${
                isResizingHorizontal ? 'bg-primary' : ''
              }`}
              style={{ flexShrink: 0 }}
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 flex items-center justify-center">
                <div className="h-8 w-0.5 bg-muted-foreground/30 group-hover:bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          )}

          {/* Right Panel: Code Editor and Output - Fixed */}
          <div 
            data-right-panel
            className="flex flex-col bg-background lg:sticky lg:top-[80px] lg:self-start"
            style={{ 
              width: isDesktop ? `${100 - leftPanelWidth}%` : '100%',
              height: isDesktop ? 'calc(100vh - 120px)' : 'auto',
              maxHeight: isDesktop ? 'calc(100vh - 120px)' : 'none'
            }}
          >
            {currentUser ? (
              <>
                {/* Compiler Section - Top Half */}
                <div 
                  className="flex flex-col border-b border-border/30 overflow-hidden"
                  style={{ height: `${compilerHeight}%`, minHeight: '200px' }}
                >
                  <div className="flex-1 overflow-hidden p-4 flex flex-col min-h-0">
                    <CodeEditor
                      language={language}
                      question={question.question}
                      questionId={question.id}
                      height="100%"
                      expectedOutput={question.expectedOutput}
                      hideOutput={true}
                      sqlTableNames={question.sqlTableNames}
                      onOutputChange={(outputData, textOutputData) => {
                        setOutput(outputData);
                        setTextOutput(textOutputData);
                      }}
                    />
                  </div>
                </div>

                {/* Vertical Resizer */}
                <div
                  onMouseDown={handleMouseDownVertical}
                  className={`h-1 bg-border/50 hover:bg-primary/50 cursor-row-resize transition-colors flex items-center justify-center group relative ${
                    isResizingVertical ? 'bg-primary' : ''
                  }`}
                  style={{ flexShrink: 0 }}
                >
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 flex items-center justify-center">
                    <div className="w-8 h-0.5 bg-muted-foreground/30 group-hover:bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Output Section - Bottom Half */}
                <div 
                  className="flex flex-col overflow-hidden"
                  style={{ height: `${100 - compilerHeight}%`, minHeight: '200px' }}
                >
                    <div className="px-4 py-2 border-b border-border/30 bg-muted/20 flex-shrink-0">
                      <span className="text-sm font-medium text-foreground">Output</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {output && output.columns.length > 0 && output.values.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b-2 border-border/50 bg-muted/30">
                                {output.columns.map((col, idx) => (
                                  <th key={idx} className="px-5 py-3 text-left font-bold text-foreground">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {output.values.map((row, rowIdx) => (
                                <tr key={rowIdx} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                  {row.map((cell, cellIdx) => (
                                    <td key={cellIdx} className="px-5 py-3 text-foreground/90">
                                      {String(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : textOutput ? (
                        <div className="p-5">
                          <pre className="text-sm text-foreground/90 font-mono whitespace-pre-wrap bg-background/70 p-4 rounded-lg border border-border/50 shadow-inner">
                            {textOutput}
                          </pre>
                        </div>
                      ) : (
                        <div className="p-5 text-sm text-muted-foreground text-center">
                          No results to display
                        </div>
                      )}
                    </div>
                  </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
                <div className="p-5 rounded-full bg-primary/10 border-2 border-primary/20">
                  <Code2 className="h-10 w-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="text-foreground font-semibold">Start Coding Now</p>
                  <p className="text-sm text-muted-foreground">
                    Sign in to access the interactive code editor
                  </p>
                </div>
                <Button onClick={() => setAuthModalOpen(true)} size="lg">
                  Sign In to Continue
                </Button>
              </div>
            )}
          </div>

        </div>
      </div>
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultMode={authMode}
      />
    </div>
  );
};

export default QuestionDetail;

