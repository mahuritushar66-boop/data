import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Loader2, Terminal, Code2, FileText, Lightbulb, Sparkles, Eye, Copy, Check, ArrowRight, ArrowLeft, User, LogOut, Trophy } from "lucide-react";
import CompanyLogo from "@/components/CompanyLogo";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import CodeEditor from "@/components/CodeEditor";
import AuthModal from "@/components/AuthModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

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
const renderQuestionContent = (questionText: string, sqlTableNames?: string) => {
  // Parse admin-provided table names (comma-separated)
  const adminTableNamesList: string[] = sqlTableNames
    ? sqlTableNames.split(',').map(name => name.trim().toLowerCase()).filter(name => name.length > 0)
    : [];

  // Try to extract table names mentioned in the question text
  // Order matters: more specific patterns first to avoid false matches
  const tableNamePatterns = [
    /(?:FROM|from)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /SQL\s+table[:\s]+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /(?:table|Table|TABLE)[:\s]+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    /using\s+the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+table/gi,
    /the\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+table/gi,
    // More specific pattern: word before "table" but not "the"
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\s+table\b/gi,
  ];
  const mentionedTables: string[] = [];
  tableNamePatterns.forEach(pattern => {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(questionText)) !== null) {
      if (m[1]) {
        const tableName = m[1].toLowerCase();
        // Skip common SQL keywords, articles, and generic words
        const skipWords = ['select', 'where', 'group', 'order', 'having', 'limit', 'join', 'inner', 'left', 'right', 'outer', 'on', 'as', 'and', 'or', 'not', 'in', 'exists', 'like', 'between', 'the', 'a', 'an', 'this', 'that', 'below', 'above'];
        if (!skipWords.includes(tableName) && !mentionedTables.includes(tableName)) {
          mentionedTables.push(tableName);
        }
      }
    }
  });

  let tableCounter = 0;
  const resolveTableName = (data?: Record<string, any>, tableIndex: number = 0) => {
    let rawName: string | undefined;
    
    // Priority: 1. Admin-provided names (ALWAYS use if provided), 2. JSON table name, 3. Mentioned tables, 4. Fallback
    if (adminTableNamesList.length > 0) {
      // Use the corresponding admin name for this table index
      const adminNameIndex = Math.min(tableIndex, adminTableNamesList.length - 1);
      rawName = adminTableNamesList[adminNameIndex];
    } else {
      // Second priority: Try to get table name from JSON
      rawName =
        (typeof data?.tableName === "string" && data.tableName.trim()) ||
        (typeof data?.name === "string" && data.name.trim());
      
      if (!rawName && mentionedTables.length > 0) {
        // Third priority: Use mentioned tables from question text
        rawName = mentionedTables[Math.min(tableIndex, mentionedTables.length - 1)];
      }
      
      if (!rawName) {
        // Fourth priority: Fallback to generic name
        rawName = `dataset_${tableCounter + 1}`;
      }
    }
    
    const sqlName = sanitizeSqlIdentifier(rawName.toLowerCase(), `dataset_${tableCounter + 1}`);
    tableCounter += 1;
    return sqlName;
  };

  // First, try to parse the entire question as JSON
  const tableData = parseTableJSON(questionText);
  if (tableData) {
    const sqlName = resolveTableName(tableData, 0);
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
            // Find the index of this table in the jsonBlocks array
            const tableIndex = jsonBlocks.findIndex(block => block.data === tableData);
            const sqlName = resolveTableName(tableData, tableIndex >= 0 ? tableIndex : idx);
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
              <div key={idx} className="leading-relaxed whitespace-pre-wrap text-foreground/90" style={{ fontSize: '16px' }}>
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
    <div className="leading-relaxed whitespace-pre-wrap text-foreground/90 space-y-3" style={{ fontSize: '15px' }}>
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
  const { profile, currentUser, logout } = useAuth();
  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [nextQuestionId, setNextQuestionId] = useState<string | null>(null);
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
    // Default to 90% for compiler, 10% for output
    return saved ? parseFloat(saved) : 90; // Default 90% (compiler) / 10% (output)
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
    e.stopPropagation();
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
          // Use the actual height of the panel (offsetHeight accounts for padding/borders)
          const panelHeight = rightPanel.offsetHeight || panelRect.height;
          // Calculate position relative to the top of the right panel
          const relativeY = e.clientY - panelRect.top;
          // Ensure we have a valid height and positive relative position
          if (panelHeight > 0 && relativeY > 0) {
            // Calculate percentage of panel height
            const newHeightPercent = (relativeY / panelHeight) * 100;
            // Constrain between 10% and 95%
            const constrainedHeight = Math.max(10, Math.min(95, newHeightPercent));
            setCompilerHeight(constrainedHeight);
          }
          // Prevent default to avoid text selection and scrolling
          e.preventDefault();
          e.stopPropagation();
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

  // Fetch next question from the same module
  useEffect(() => {
    if (!question || !question.title || !questionId) {
      setNextQuestionId(null);
      return;
    }

    const fetchNextQuestion = async () => {
      try {
        const moduleTitle = question.title || "General";
        let snapshot;
        try {
          // Try to fetch with orderBy first
          const questionsQuery = query(
            collection(db, "interviewQuestions"),
            orderBy("createdAt", "desc")
          );
          snapshot = await getDocs(questionsQuery);
        } catch (orderError) {
          // Fallback: fetch without orderBy if createdAt index doesn't exist
          console.warn("Could not order by createdAt, fetching all questions:", orderError);
          snapshot = await getDocs(collection(db, "interviewQuestions"));
        }
        
        const allQuestions = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "General",
            createdAt: data.createdAt,
            order: data.order,
          };
        });

        // Filter by module title first
        const moduleQuestions = allQuestions.filter(q => {
          const qTitle = q.title || "General";
          return qTitle === moduleTitle || qTitle === (moduleTitle || "General");
        });
        
        // Sort by order if available, otherwise by createdAt (newest first)
        moduleQuestions.sort((a, b) => {
          // If both have order, sort by order (ascending)
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          // If only one has order, prioritize the one with order
          if (a.order !== undefined) return -1;
          if (b.order !== undefined) return 1;
          // Fall back to createdAt (newest first)
          if (a.createdAt && b.createdAt) {
            return b.createdAt.toMillis() - a.createdAt.toMillis();
          }
          return b.id.localeCompare(a.id);
        });
        
        const currentIndex = moduleQuestions.findIndex(q => q.id === questionId);
        
        if (currentIndex >= 0 && currentIndex < moduleQuestions.length - 1) {
          const nextId = moduleQuestions[currentIndex + 1].id;
          setNextQuestionId(nextId);
        } else {
          setNextQuestionId(null);
        }
      } catch (error) {
        console.error("Error fetching next question:", error);
        setNextQuestionId(null);
      }
    };

    fetchNextQuestion();
  }, [question, questionId]);

  const moduleTitle = question?.title || "General";
  const moduleSlug = encodeURIComponent(moduleTitle);
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

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Custom Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border h-16">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center space-x-2 group">
              <img
                src="/logo.jpg"
                alt="BytesOfData Logo"
                className="h-12 w-auto object-contain group-hover:opacity-80 transition-opacity"
              />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {getInitials(currentUser.displayName || currentUser.email)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {currentUser.displayName || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {currentUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/leaderboard" className="cursor-pointer">
                      <Trophy className="mr-2 h-4 w-4" />
                      <span>Leaderboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col min-h-screen pt-16">
        {/* Header */}
        <div className="px-4 lg:px-6 pt-2 pb-2 bg-background">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl lg:text-3xl font-bold">
              {question.questionTitle || "Interview Question"}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const moduleTitle = question.title || "General";
                  navigate(`/interview-prep/module/${encodeURIComponent(moduleTitle)}`);
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
                    navigate(`/interview-prep/question/${nextQuestionId}`);
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
              {question.company && (
                <Badge 
                  variant="secondary" 
                  className="gap-1.5 px-3 py-1 text-sm font-medium bg-muted text-foreground border-border/50 hover:bg-muted"
                >
                  <CompanyLogo companyName={question.company} size={14} className="flex-shrink-0" />
                  {question.company}
                </Badge>
              )}
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

        {/* Main content */}
        <div 
          ref={containerRef}
          className="flex-1 flex flex-col lg:flex-row"
          style={{ minHeight: "calc(100vh - 140px)" }}
        >
          {/* Left Panel: Question - Scrollable */}
          <div 
            className="flex flex-col bg-background transition-none"
            style={{ 
              width: isDesktop ? `${leftPanelWidth}%` : '100%',
              height: isDesktop ? 'calc(100vh - 140px)' : 'auto',
              maxHeight: isDesktop ? 'calc(100vh - 140px)' : 'none'
            }}
          >
            <div className="px-4 lg:px-6 pb-3 border-b border-border/30 flex-shrink-0">
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

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 lg:px-6 py-4 min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="question" className="mt-0">
                  {renderQuestionContent(question.question, question.sqlTableNames)}
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

          {/* Right Panel: Code Editor and Output - Fixed (No Scroll) */}
          <div 
            data-right-panel
            className="flex flex-col bg-background lg:sticky lg:top-[80px] lg:self-start overflow-hidden"
            style={{ 
              width: isDesktop ? `${100 - leftPanelWidth}%` : '100%',
              height: isDesktop ? 'calc(100vh - 140px)' : 'auto',
              maxHeight: isDesktop ? 'calc(100vh - 140px)' : 'none'
            }}
          >
            {currentUser ? (
              <>
                {/* Compiler Section - Top Half */}
                <div 
                  className="flex flex-col border-b border-border/30 overflow-hidden"
                  style={{ height: `${compilerHeight}%`, minHeight: '200px' }}
                >
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    <CodeEditor
                      language={language}
                      question={question.question}
                      questionId={question.id}
                      height="100%"
                      expectedOutput={question.expectedOutput}
                      hideOutput={true}
                      sqlTableNames={question.sqlTableNames}
                      difficulty={question.difficulty}
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
                  className={`h-2 bg-border/50 hover:bg-primary/50 cursor-row-resize transition-colors flex items-center justify-center group relative z-10 ${
                    isResizingVertical ? 'bg-primary' : ''
                  }`}
                  style={{ flexShrink: 0, touchAction: 'none' }}
                >
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 flex items-center justify-center">
                    <div className="w-16 h-1 bg-muted-foreground/40 group-hover:bg-primary opacity-60 group-hover:opacity-100 transition-opacity rounded-full" />
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

