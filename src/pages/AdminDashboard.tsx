import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, LogOut, Plus, Edit, Trash2, Lock, Unlock, Briefcase, LineChart, Users, Lightbulb, Code, Brain, BookOpen, TrendingUp, Database, BarChart3, Zap, Target, LayoutDashboard, FileText, FolderOpen, Newspaper, Settings, UserCheck, Loader2, Layers, Menu, Quote, ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import CompanyLogo from "@/components/CompanyLogo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { Check, ChevronsUpDown, ChevronsUp, ChevronsDown, Search, X } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { uploadToCloudinary, uploadPdfToCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { uploadToSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  DEFAULT_GLOBAL_PRICE,
  DEFAULT_MODULE_PRICE,
  DEFAULT_MODULE_TITLE,
  GLOBAL_PRICING_DOC,
  MODULE_PRICING_COLLECTION,
  getModulePricingDocId,
  normalizeModuleTitle,
} from "@/constants/pricing";

type InterviewQuestion = {
  id: string;
  title?: string;
  questionTitle?: string; // Question title (e.g., "Histogram of Tweets")
  topic?: string;
  question: string;
  answer: string;
  tier: "free" | "paid";
  createdAt?: Date;
  expectedOutput?: string; // Expected output for validation
  difficulty?: "easy" | "medium" | "hard";
  company?: string;
  questionOfTheWeek?: boolean; // Mark as Question of the Week
  hint?: string;
  sqlTableNames?: string; // Comma-separated table names for SQL questions (e.g., "customers,orders,products")
  order?: number; // Display order within module
};

type ManagedUser = {
  id: string;
  displayName?: string;
  email?: string;
  isPaid?: boolean;
  hasGlobalAccess?: boolean;
  purchasedModules?: Record<string, boolean>;
  createdAt?: Date;
};

type CaseStudy = {
  id: string;
  title: string;
  description: string;
  industry: string;
  techniques: string[];
  outcomes: string[];
  datasetUrl?: string;
  notebookUrl?: string;
  pdfUrl?: string;
  viewUrl?: string;
  coverEmoji?: string;
};

type ProjectResource = {
  id: string;
  title: string;
  description: string;
  imageUrls?: string[]; // Multiple images
  pdfUrls?: string[]; // Multiple PDFs
  driveLinks?: string[]; // Multiple drive links
  // Legacy single fields (for backward compatibility)
  imageUrl?: string;
  driveLink?: string;
};

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime?: string;
  date?: string;
  featured?: boolean;
  url?: string;
  imageUrl?: string;
  order?: number;
};

type Course = {
  id: string;
  title: string;
  description: string;
  highlights: string[];
  platform: string;
  platformLabel: string;
  courseUrl: string;
  imageUrl?: string;
  price?: string;
  featured?: boolean;
  order?: number;
};

type AboutContent = {
  name: string;
  title: string;
  avatarUrl?: string;
  story: string;
  skills: string[];
  timeline: {
    year: string;
    title: string;
    company: string;
    desc: string;
  }[];
  achievements: {
    icon: string;
    value: string;
    label: string;
  }[];
};

type Service = {
  id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  price: string;
  ctaLabel?: string;
  ctaUrl?: string;
};
type AdminSection = "dashboard" | "questions" | "theory-questions" | "case-studies" | "projects" | "blog" | "courses" | "about" | "services" | "users" | "testimonials" | "module-order" | "question-order";

// Non-code modules that don't need compiler
const NON_CODE_MODULES = ["Puzzle", "AI", "ML", "Theory", "Aptitude", "Logical Reasoning"];

type TheoryQuestion = {
  id: string;
  module: string; // Puzzle, AI, ML, etc.
  questionTitle?: string;
  question: string;
  hint?: string;
  imageUrls?: string[];
  pdfUrl?: string;
  company?: string;
  difficulty?: "easy" | "medium" | "hard";
  createdAt?: Date;
};

type Testimonial = {
  id: string;
  name: string;
  role?: string;
  company?: string;
  message: string;
  highlight?: string;
  avatarUrl?: string;
  linkedinUrl?: string;
  createdAt?: Date;
};

const AdminDashboard = () => {
  const DEFAULT_TITLE = DEFAULT_MODULE_TITLE;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setUserPaidStatus, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<InterviewQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({
    title: "",
    questionTitle: "",
    topic: "",
    question: "",
    answer: "",
    tier: "free" as "free" | "paid",
    expectedOutput: "",
    difficulty: "" as "" | "easy" | "medium" | "hard",
    company: "",
    questionOfTheWeek: false,
    hint: "",
    sqlTableNames: "",
  });
  const [modulePricing, setModulePricing] = useState<Record<string, number>>({});
  const [modulePricingInputs, setModulePricingInputs] = useState<Record<string, string>>({});
  const [globalModulePrice, setGlobalModulePrice] = useState<string>(String(DEFAULT_GLOBAL_PRICE));
  const [savingModulePrice, setSavingModulePrice] = useState<string | null>(null);
  const [savingGlobalPrice, setSavingGlobalPrice] = useState(false);
  const [moduleOrder, setModuleOrder] = useState<string[]>([]);
  const [savingModuleOrder, setSavingModuleOrder] = useState(false);
  const [selectedModuleForQuestionOrder, setSelectedModuleForQuestionOrder] = useState<string>("");
  const [questionOrderMap, setQuestionOrderMap] = useState<Record<string, string[]>>({}); // moduleTitle -> questionId[]
  const [savingQuestionOrder, setSavingQuestionOrder] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionTierFilter, setQuestionTierFilter] = useState<"all" | "free" | "paid">("all");
  const [questionDifficultyFilter, setQuestionDifficultyFilter] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [questionCompanyFilter, setQuestionCompanyFilter] = useState<string>("all");
  const [questionModuleFilter, setQuestionModuleFilter] = useState<string>("all");
  const [titleSearchOpen, setTitleSearchOpen] = useState(false);
  const [expectedOutputHelperOpen, setExpectedOutputHelperOpen] = useState(false);
  const [expectedOutputConverterInput, setExpectedOutputConverterInput] = useState("");
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [isCaseDialogOpen, setIsCaseDialogOpen] = useState(false);
  const [isSavingCaseStudy, setIsSavingCaseStudy] = useState(false);
  const [editingCaseStudy, setEditingCaseStudy] = useState<CaseStudy | null>(null);
  const [caseStudyForm, setCaseStudyForm] = useState({
    title: "",
    description: "",
    industry: "",
    techniques: "",
    outcomes: "",
    datasetUrl: "",
    notebookUrl: "",
    pdfUrl: "",
    viewUrl: "",
    coverEmoji: "",
  });
  const [projects, setProjects] = useState<ProjectResource[]>([]);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectResource | null>(null);
  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    imageUrls: [] as string[],
    pdfUrls: [] as string[],
    driveLinks: [""] as string[], // Start with one empty field
  });
  const [projectImageFiles, setProjectImageFiles] = useState<File[]>([]);
  const [projectPdfFiles, setProjectPdfFiles] = useState<File[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isBlogDialogOpen, setIsBlogDialogOpen] = useState(false);
  const [isSavingBlog, setIsSavingBlog] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [blogForm, setBlogForm] = useState({
    title: "",
    excerpt: "",
    category: "",
    readTime: "",
    date: "",
    featured: false,
    url: "",
    imageUrl: "",
  });
  const [blogImageFile, setBlogImageFile] = useState<File | null>(null);

  // Courses state
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    highlights: "",
    platform: "",
    platformLabel: "",
    courseUrl: "",
    imageUrl: "",
    price: "",
    featured: false,
  });
  const [courseImageFile, setCourseImageFile] = useState<File | null>(null);

  // About page state
  const [aboutContent, setAboutContent] = useState<AboutContent | null>(null);
  const [isSavingAbout, setIsSavingAbout] = useState(false);
  const [aboutForm, setAboutForm] = useState({
    name: "",
    title: "",
    avatarUrl: "",
    story: "",
    skills: "",
    timeline: [] as { year: string; title: string; company: string; desc: string }[],
    achievements: [] as { icon: string; value: string; label: string }[],
  });
  const [aboutAvatarFile, setAboutAvatarFile] = useState<File | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    icon: "Briefcase",
    title: "",
    description: "",
    features: "",
    price: "",
    ctaLabel: "",
    ctaUrl: "",
  });
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isTestimonialDialogOpen, setIsTestimonialDialogOpen] = useState(false);
  const [isSavingTestimonial, setIsSavingTestimonial] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState({
    name: "",
    role: "",
    company: "",
    message: "",
    highlight: "",
    avatarUrl: "",
    linkedinUrl: "",
  });

  // Theory Questions (Puzzle, AI, ML modules)
  const [theoryQuestions, setTheoryQuestions] = useState<TheoryQuestion[]>([]);
  const [isTheoryDialogOpen, setIsTheoryDialogOpen] = useState(false);
  const [isSavingTheory, setIsSavingTheory] = useState(false);
  const [editingTheory, setEditingTheory] = useState<TheoryQuestion | null>(null);
  const [theoryForm, setTheoryForm] = useState({
    module: "",
    questionTitle: "",
    question: "",
    hint: "",
    company: "",
    difficulty: "" as "" | "easy" | "medium" | "hard",
  });
  const [theoryImages, setTheoryImages] = useState<File[]>([]);
  const [theoryPdf, setTheoryPdf] = useState<File | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  useEffect(() => {
    const q = query(collection(db, "interviewQuestions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapped = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title,
          questionTitle: data.questionTitle,
          questionOfTheWeek: data.questionOfTheWeek ?? false,
          topic: data.topic,
          question: data.question,
          answer: data.answer,
          tier: data.tier ?? "free",
          createdAt: data.createdAt?.toDate?.(),
          expectedOutput: data.expectedOutput,
          difficulty: data.difficulty,
          company: data.company,
          hint: data.hint,
          order: data.order,
        } as InterviewQuestion;
      });
      setQuestions(mapped);
    });
    return unsubscribe;
  }, []);

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
            createdAt: data.createdAt?.toDate?.(),
          } as Testimonial;
        });
        setTestimonials(items);
      },
      (error) => {
        console.error("Testimonials error:", error);
      }
    );
    return unsubscribe;
  }, []);

  // Fetch theory questions
  useEffect(() => {
    const theoryQuery = query(collection(db, "theoryQuestions"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      theoryQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
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
          } as TheoryQuestion;
        });
        setTheoryQuestions(items);
      },
      (error) => {
        console.error("Theory questions error:", error);
        toast({
          title: "Unable to load testimonials",
          description: error.message || "Please try again later.",
          variant: "destructive",
        });
      },
    );
    return unsubscribe;
  }, [toast]);

  useEffect(() => {
    const pricingRef = collection(db, MODULE_PRICING_COLLECTION);
    const unsubscribe = onSnapshot(pricingRef, (snapshot) => {
      const nextPricing: Record<string, number> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (docSnap.id === GLOBAL_PRICING_DOC) {
          if (typeof data.price === "number" && !Number.isNaN(data.price)) {
            setGlobalModulePrice(String(data.price));
          }
          return;
        }
        if (typeof data.price === "number" && !Number.isNaN(data.price)) {
          const normalized = normalizeModuleTitle(data.title || docSnap.id);
          nextPricing[normalized] = data.price;
        }
      });
      setModulePricing(nextPricing);
    });
    return unsubscribe;
  }, []);


  useEffect(() => {
    setModulePricingInputs((prev) => {
      const updated = { ...prev };
      Object.entries(modulePricing).forEach(([title, price]) => {
        if (updated[title] === undefined || updated[title] === "") {
          updated[title] = String(price);
        }
      });
      return updated;
    });
  }, [modulePricing]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupUserListener = () => {
      // Clean up previous listener if exists
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      const processSnapshot = (snapshot: any) => {
        // Map documents to user objects
        const mapped = snapshot.docs.map((docSnap: any) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            displayName: data.displayName || "Unknown user",
            email: data.email,
            isPaid: data.isPaid ?? false,
            hasGlobalAccess: data.hasGlobalAccess ?? false,
            purchasedModules: data.purchasedModules || {},
            createdAt: data.createdAt?.toDate?.(),
          } as ManagedUser;
        });
        
        // Sort client-side by createdAt if available, otherwise by ID
        mapped.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return b.createdAt.getTime() - a.createdAt.getTime(); // Descending
          }
          return b.id.localeCompare(a.id); // Fallback to ID
        });
        
        // Always update users state, even if empty (handles deletions)
        setUsers(mapped);
      };

      // Try to fetch with orderBy first
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      unsubscribe = onSnapshot(
        q,
        processSnapshot,
        (error) => {
          // If orderBy fails (e.g., missing createdAt or index), fetch without orderBy
          console.warn("Could not order by createdAt, fetching all users:", error);
          
          // Clean up previous listener
          if (unsubscribe) {
            unsubscribe();
          }
          
          // Setup fallback query without orderBy
          const fallbackQuery = collection(db, "users");
          unsubscribe = onSnapshot(fallbackQuery, processSnapshot, (fallbackError) => {
            console.error("Error fetching users:", fallbackError);
            // Set empty array on error to clear stale data
            setUsers([]);
          });
        }
      );
    };

    setupUserListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, "caseStudies"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCaseStudies(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title || "Untitled Study",
            description: data.description || "",
            industry: data.industry || "General",
            techniques: Array.isArray(data.techniques) ? data.techniques : [],
            outcomes: Array.isArray(data.outcomes) ? data.outcomes : [],
            datasetUrl: data.datasetUrl,
            notebookUrl: data.notebookUrl,
            pdfUrl: data.pdfUrl,
            viewUrl: data.viewUrl,
            coverEmoji: data.coverEmoji,
          } as CaseStudy;
        }),
      );
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title || "Untitled project",
            description: data.description || "",
            imageUrl: data.imageUrl,
            driveLink: data.driveLink || data.ctaUrl || "", // Fallback to ctaUrl for old data
          } as ProjectResource;
        }),
      );
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "blogPosts"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || "Untitled post",
          excerpt: data.excerpt || "",
          category: data.category || "General",
          readTime: data.readTime,
          date: data.date,
          featured: Boolean(data.featured),
          url: data.url,
          imageUrl: data.imageUrl,
          order: data.order ?? 999,
        } as BlogPost;
      });
      // Sort by order, then by createdAt
      posts.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      setBlogPosts(posts);
    });
    return unsubscribe;
  }, []);

  // Fetch courses
  useEffect(() => {
    const q = query(collection(db, "courses"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title,
          description: data.description,
          highlights: data.highlights || [],
          platform: data.platform,
          platformLabel: data.platformLabel,
          courseUrl: data.courseUrl,
          imageUrl: data.imageUrl,
          price: data.price,
          featured: Boolean(data.featured),
          order: data.order ?? 999,
        } as Course;
      });
      items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      setCourses(items);
    });
    return unsubscribe;
  }, []);

  // Fetch about content
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "siteContent", "about"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAboutContent({
          name: data.name || "",
          title: data.title || "",
          avatarUrl: data.avatarUrl || "",
          story: data.story || "",
          skills: data.skills || [],
          timeline: data.timeline || [],
          achievements: data.achievements || [],
        });
        setAboutForm({
          name: data.name || "",
          title: data.title || "",
          avatarUrl: data.avatarUrl || "",
          story: data.story || "",
          skills: (data.skills || []).join(", "),
          timeline: data.timeline || [],
          achievements: data.achievements || [],
        });
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "services"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setServices(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            icon: data.icon || "Briefcase",
            title: data.title || "Untitled Service",
            description: data.description || "",
            features: Array.isArray(data.features) ? data.features : [],
            price: data.price || "",
            ctaLabel: data.ctaLabel,
            ctaUrl: data.ctaUrl,
          } as Service;
        }),
      );
    });
    return unsubscribe;
  }, []);

  const openCreateDialog = () => {
    setEditingQuestion(null);
    setQuestionForm({ title: "", questionTitle: "", topic: "", question: "", answer: "", tier: "free", expectedOutput: "", difficulty: "", company: "", questionOfTheWeek: false, hint: "", sqlTableNames: "" });
    setTitleSearchOpen(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (question: InterviewQuestion) => {
    setEditingQuestion(question);
    setQuestionForm({
      title: question.title ?? "",
      questionTitle: question.questionTitle ?? "",
      topic: question.topic ?? "",
      question: question.question,
      answer: question.answer,
      tier: question.tier,
      expectedOutput: question.expectedOutput ?? "",
      difficulty: question.difficulty ?? "",
      company: question.company ?? "",
      questionOfTheWeek: question.questionOfTheWeek ?? false,
      hint: question.hint ?? "",
      sqlTableNames: question.sqlTableNames ?? "",
    });
    setTitleSearchOpen(false);
    setIsDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionForm.question.trim() || !questionForm.answer.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a question and an answer.",
        variant: "destructive",
      });
      return;
    }

    const normalizedTitle = questionForm.title.trim() || DEFAULT_TITLE;

    setIsSavingQuestion(true);
    try {
      // Prepare data, filtering out empty strings and undefined values
      const questionData: any = {
        title: normalizedTitle,
        topic: questionForm.topic.trim() || undefined,
        question: questionForm.question.trim(),
        answer: questionForm.answer.trim(),
        tier: questionForm.tier,
      };

      // Only include optional fields if they have values
      if (questionForm.questionTitle.trim()) {
        questionData.questionTitle = questionForm.questionTitle.trim();
      }
      if (questionForm.difficulty) {
        questionData.difficulty = questionForm.difficulty;
      }
      if (questionForm.company.trim()) {
        questionData.company = questionForm.company.trim();
      }
      if (questionForm.expectedOutput.trim()) {
        questionData.expectedOutput = questionForm.expectedOutput.trim();
      }
      if (questionForm.hint.trim()) {
        questionData.hint = questionForm.hint.trim();
      }
      if (questionForm.sqlTableNames.trim()) {
        questionData.sqlTableNames = questionForm.sqlTableNames.trim();
      }
      if (questionForm.questionOfTheWeek) {
        questionData.questionOfTheWeek = true;
      } else {
        questionData.questionOfTheWeek = false;
      }

      // Remove undefined values (Firestore doesn't accept undefined)
      Object.keys(questionData).forEach(key => {
        if (questionData[key] === undefined) {
          delete questionData[key];
        }
      });

      if (editingQuestion) {
        await updateDoc(doc(db, "interviewQuestions", editingQuestion.id), {
          ...questionData,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Question updated" });
      } else {
        await addDoc(collection(db, "interviewQuestions"), {
          ...questionData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Question added" });
      }
      setIsDialogOpen(false);
      setEditingQuestion(null);
    } catch (error: any) {
      toast({
        title: "Failed to save question",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Delete this question? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "interviewQuestions", id));
      toast({ title: "Question deleted" });
    } catch (error: any) {
      toast({
        title: "Failed to delete question",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    return users.filter((user) => {
      const term = userSearch.toLowerCase();
      return user.displayName?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term);
    });
  }, [userSearch, users]);

  const handleGenerateExpectedOutput = useCallback(() => {
    const raw = expectedOutputConverterInput.trim();
    if (!raw) {
      toast({
        title: "No data provided",
        description: "Paste a sample table (header row + values) before generating JSON.",
        variant: "destructive",
      });
      return;
    }

    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      toast({
        title: "Need at least two rows",
        description: "Include a header row followed by at least one row of values.",
        variant: "destructive",
      });
      return;
    }

    const detectDelimiter = (line: string) => {
      if (line.includes("\t")) return "\t";
      if (line.includes("|")) return "|";
      if (line.includes(";")) return ";";
      return line.includes(",") ? "," : /\s{2,}/.test(line) ? /\s+/ : ",";
    };

    const headerDelimiter = detectDelimiter(lines[0]);
    const normalizeRow = (line: string, delimiter: string | RegExp) => {
      if (delimiter instanceof RegExp) {
        return line.split(delimiter).map((cell) => cell.trim()).filter((cell) => cell.length > 0);
      }
      return line.split(delimiter).map((cell) => cell.trim());
    };

    const columns = normalizeRow(lines[0], headerDelimiter).filter((col) => col.length > 0);
    if (columns.length === 0) {
      toast({
        title: "No columns detected",
        description: "Ensure the first line contains column names separated by commas, tabs, or pipes.",
        variant: "destructive",
      });
      return;
    }

    const values: any[][] = [];
    for (let i = 1; i < lines.length; i += 1) {
      const row = normalizeRow(lines[i], headerDelimiter);
      if (row.length !== columns.length) {
        toast({
          title: "Row mismatch",
          description: `Row ${i + 1} has ${row.length} value(s); expected ${columns.length}.`,
          variant: "destructive",
        });
        return;
      }
      const parsedRow = row.map((cell) => {
        if (!cell) return "";
        const lowered = cell.toLowerCase();
        if (lowered === "null") return null;
        if (lowered === "true") return true;
        if (lowered === "false") return false;
        if (!Number.isNaN(Number(cell)) && /^-?\d+(\.\d+)?$/.test(cell)) {
          return Number(cell);
        }
        return cell;
      });
      values.push(parsedRow);
    }

    const json = JSON.stringify({ columns, values }, null, 2);
    setQuestionForm((prev) => ({ ...prev, expectedOutput: json }));
    setExpectedOutputConverterInput("");
    toast({
      title: "JSON generated",
      description: "Expected output updated with the converted table.",
    });
  }, [expectedOutputConverterInput, toast]);

  // Helper function to get module name from pricing doc ID
  const getModuleNameFromDocId = (docId: string): string => {
    // Try to find the module name from modulePricing keys
    for (const [moduleTitle, _] of Object.entries(modulePricing)) {
      if (getModulePricingDocId(moduleTitle) === docId) {
        return moduleTitle;
      }
    }
    // If not found, try to decode the docId (it's URL encoded)
    try {
      return decodeURIComponent(docId);
    } catch {
      return docId; // Fallback to docId if decoding fails
    }
  };

  // Get unique titles for combobox
  const uniqueTitles = useMemo(() => {
    const titles = new Set<string>();
    questions.forEach((q) => {
      const normalizedTitle = q.title?.trim() || DEFAULT_TITLE;
      titles.add(normalizedTitle);
    });
    return Array.from(titles).sort();
  }, [questions]);

  // Initialize module order from questions (not just pricing)
  useEffect(() => {
    // Get all unique module titles from questions
    const moduleTitles = uniqueTitles;
    
    if (moduleTitles.length === 0) {
      if (moduleOrder.length > 0) {
        setModuleOrder([]);
      }
      return;
    }

    // Only initialize once when moduleOrder is empty
    if (moduleOrder.length === 0) {
      // Try to load from Firestore first
      const orderDocRef = doc(db, "moduleOrder", "order");
      getDoc(orderDocRef).then((orderDoc) => {
        if (orderDoc.exists() && orderDoc.data().order) {
          const savedOrder = orderDoc.data().order as string[];
          // Merge saved order with current modules (add new modules at the end)
          const mergedOrder = [
            ...savedOrder.filter((title) => moduleTitles.includes(title)),
            ...moduleTitles.filter((title) => !savedOrder.includes(title)),
          ];
          setModuleOrder(mergedOrder);
        } else {
          setModuleOrder([...moduleTitles]);
        }
      }).catch(() => {
        setModuleOrder([...moduleTitles]);
      });
    } else {
      // Update order when new modules are added (add new ones at the end)
      const newModules = moduleTitles.filter((title) => !moduleOrder.includes(title));
      if (newModules.length > 0) {
        setModuleOrder((prev) => [...prev, ...newModules]);
      }
      // Remove modules that no longer exist
      const filteredOrder = moduleOrder.filter((title) => moduleTitles.includes(title));
      if (filteredOrder.length !== moduleOrder.length) {
        setModuleOrder(filteredOrder);
      }
    }
  }, [uniqueTitles.join(',')]); // Use join to create a stable dependency, removed moduleOrder.length to avoid infinite loop

  const moduleFilterOptions = useMemo(() => {
    if (moduleOrder.length > 0) {
      return moduleOrder;
    }
    return uniqueTitles;
  }, [moduleOrder, uniqueTitles]);

  const normalizedModuleTitle = (questionForm.title || "").toLowerCase();
  const expectsTabularOutput = ["sql", "mysql", "python", "pandas", "dataframe"].some((keyword) =>
    normalizedModuleTitle.includes(keyword),
  );

  // Get unique companies for filter
  const uniqueCompanies = useMemo(() => {
    const companies = new Set<string>();
    questions.forEach((q) => {
      if (q.company?.trim()) {
        companies.add(q.company.trim());
      }
    });
    return Array.from(companies).sort();
  }, [questions]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    let filtered = questions;
    
    // Search filter
    if (questionSearch.trim()) {
      const term = questionSearch.toLowerCase();
      filtered = filtered.filter((q) => {
        return (
          q.title?.toLowerCase().includes(term) ||
          q.question?.toLowerCase().includes(term) ||
          q.answer?.toLowerCase().includes(term) ||
          q.company?.toLowerCase().includes(term) ||
          q.difficulty?.toLowerCase().includes(term) ||
          q.questionTitle?.toLowerCase().includes(term)
        );
      });
    }
    
    // Tier filter
    if (questionTierFilter !== "all") {
      filtered = filtered.filter((q) => q.tier === questionTierFilter);
    }
    
    // Difficulty filter
    if (questionDifficultyFilter !== "all") {
      filtered = filtered.filter((q) => q.difficulty === questionDifficultyFilter);
    }
    
    // Company filter
    if (questionCompanyFilter !== "all") {
      filtered = filtered.filter((q) => q.company === questionCompanyFilter);
    }

    // Module filter
    if (questionModuleFilter !== "all") {
      filtered = filtered.filter((q) => (q.title?.trim() || DEFAULT_TITLE) === questionModuleFilter);
    }
    
    return filtered;
  }, [questionSearch, questionTierFilter, questionDifficultyFilter, questionCompanyFilter, questionModuleFilter, questions]);

  // Question stats
  const questionStats = useMemo(() => {
    const free = questions.filter((q) => q.tier === "free").length;
    const paid = questions.filter((q) => q.tier === "paid").length;
    const withDifficulty = questions.filter((q) => q.difficulty).length;
    const withCompany = questions.filter((q) => q.company).length;
    return { total: questions.length, free, paid, withDifficulty, withCompany };
  }, [questions]);

  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [userToUpdate, setUserToUpdate] = useState<ManagedUser | null>(null);

  const toggleUserPaidStatus = async (user: ManagedUser) => {
    if (!user.id) return;
    
    // Set the user to update and open confirmation dialog
    setUserToUpdate(user);
    setConfirmDialogOpen(true);
  };

  const confirmToggleUserPaidStatus = async () => {
    if (!userToUpdate?.id) return;
    
    setUpdatingUserId(userToUpdate.id);
    try {
      await setUserPaidStatus(userToUpdate.id, !userToUpdate.isPaid);
      setConfirmDialogOpen(false);
      setUserToUpdate(null);
    } catch (error) {
      // Error is already handled in setUserPaidStatus
      console.error("Failed to update user premium status:", error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const openCaseStudyDialog = (study?: CaseStudy) => {
    if (study) {
      setEditingCaseStudy(study);
      setCaseStudyForm({
        title: study.title,
        description: study.description,
        industry: study.industry,
        techniques: study.techniques.join(", "),
        outcomes: study.outcomes.join("\n"),
        datasetUrl: study.datasetUrl || "",
        notebookUrl: study.notebookUrl || "",
        pdfUrl: study.pdfUrl || "",
        viewUrl: study.viewUrl || "",
        coverEmoji: study.coverEmoji || "",
      });
    } else {
      setEditingCaseStudy(null);
      setCaseStudyForm({
        title: "",
        description: "",
        industry: "",
        techniques: "",
        outcomes: "",
        datasetUrl: "",
        notebookUrl: "",
        pdfUrl: "",
        viewUrl: "",
        coverEmoji: "",
      });
    }
    setIsCaseDialogOpen(true);
  };

  const openProjectDialog = (project?: ProjectResource) => {
    if (project) {
      setEditingProject(project);
      // Handle both legacy single fields and new array fields
      const imageUrls = project.imageUrls || (project.imageUrl ? [project.imageUrl] : []);
      const pdfUrls = project.pdfUrls || [];
      const driveLinks = project.driveLinks || (project.driveLink ? [project.driveLink] : [""]);
      
      setProjectForm({
        title: project.title,
        description: project.description,
        imageUrls,
        pdfUrls,
        driveLinks: driveLinks.length > 0 ? driveLinks : [""],
      });
      setProjectImageFiles([]);
      setProjectPdfFiles([]);
    } else {
      setEditingProject(null);
      setProjectForm({
        title: "",
        description: "",
        imageUrls: [],
        pdfUrls: [],
        driveLinks: [""],
      });
      setProjectImageFiles([]);
      setProjectPdfFiles([]);
    }
    setIsProjectDialogOpen(true);
  };

  const handleSaveCaseStudy = async () => {
    if (!caseStudyForm.title.trim() || !caseStudyForm.description.trim() || !caseStudyForm.industry.trim()) {
      toast({
        title: "Missing information",
        description: "Title, description, and industry are required.",
        variant: "destructive",
      });
      return;
    }

    const techniques = caseStudyForm.techniques
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const outcomes = caseStudyForm.outcomes
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    setIsSavingCaseStudy(true);
    try {
      if (editingCaseStudy) {
        await updateDoc(doc(db, "caseStudies", editingCaseStudy.id), {
          ...caseStudyForm,
          techniques,
          outcomes,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Case study updated" });
      } else {
        await addDoc(collection(db, "caseStudies"), {
          ...caseStudyForm,
          techniques,
          outcomes,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Case study added" });
      }
      setIsCaseDialogOpen(false);
      setEditingCaseStudy(null);
    } catch (error: any) {
      toast({
        title: "Failed to save case study",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCaseStudy(false);
    }
  };

  const handleDeleteCaseStudy = async (id: string) => {
    if (!window.confirm("Delete this case study?")) return;
    try {
      await deleteDoc(doc(db, "caseStudies", id));
      toast({ title: "Case study deleted" });
    } catch (error: any) {
      toast({
        title: "Failed to delete case study",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveProject = async () => {
    if (!projectForm.title.trim() || !projectForm.description.trim()) {
      toast({
        title: "Missing information",
        description: "Title and description are required.",
        variant: "destructive",
      });
      return;
    }

    // Check if at least one drive link is provided
    const validDriveLinks = projectForm.driveLinks.filter(link => link.trim());
    if (validDriveLinks.length === 0) {
      toast({
        title: "Missing Google Drive link",
        description: "Please provide at least one Google Drive link.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingProject(true);
    try {
      let imageUrls = [...projectForm.imageUrls];
      let pdfUrls = [...projectForm.pdfUrls];

      // Upload new images to Cloudinary
      if (projectImageFiles.length > 0) {
        toast({ title: "Uploading images...", description: `${projectImageFiles.length} file(s)` });
        
        for (const file of projectImageFiles) {
          if (isCloudinaryConfigured()) {
            try {
              const url = await uploadToCloudinary(file);
              imageUrls.push(url);
            } catch (cloudinaryError: any) {
              console.error("Cloudinary upload failed:", cloudinaryError);
              // Fallback to Firebase
              const fileRef = ref(storage, `project-images/${Date.now()}_${file.name}`);
              await uploadBytes(fileRef, file);
              const url = await getDownloadURL(fileRef);
              imageUrls.push(url);
            }
          } else {
            const fileRef = ref(storage, `project-images/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            imageUrls.push(url);
          }
        }
        toast({ title: `${projectImageFiles.length} image(s) uploaded` });
      }

      // Upload new PDFs to Cloudinary
      if (projectPdfFiles.length > 0) {
        toast({ title: "Uploading PDFs...", description: `${projectPdfFiles.length} file(s)` });
        
        // Upload PDFs to Cloudinary
        for (const file of projectPdfFiles) {
          if (isCloudinaryConfigured()) {
            try {
              const url = await uploadPdfToCloudinary(file);
              pdfUrls.push(url);
            } catch (error: any) {
              console.error("Cloudinary PDF upload failed:", error);
              toast({ 
                title: "PDF upload failed", 
                description: error.message,
                variant: "destructive" 
              });
            }
          }
        }
        toast({ title: `${projectPdfFiles.length} PDF(s) uploaded` });
      }

      const projectData = {
        title: projectForm.title.trim(),
        description: projectForm.description.trim(),
        imageUrls,
        pdfUrls,
        driveLinks: validDriveLinks,
        // Keep legacy single fields for backward compatibility
        imageUrl: imageUrls[0] || "",
        driveLink: validDriveLinks[0] || "",
      };

      if (editingProject) {
        await updateDoc(doc(db, "projects", editingProject.id), {
          ...projectData,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Project updated" });
      } else {
        await addDoc(collection(db, "projects"), {
          ...projectData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Project added" });
      }
      setIsProjectDialogOpen(false);
      setEditingProject(null);
      setProjectImageFiles([]);
      setProjectPdfFiles([]);
    } catch (error: any) {
      toast({
        title: "Failed to save project",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await deleteDoc(doc(db, "projects", id));
      toast({ title: "Project deleted" });
    } catch (error: any) {
      toast({
        title: "Failed to delete project",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const openBlogDialog = (blog?: BlogPost) => {
    if (blog) {
      setEditingBlog(blog);
      setBlogForm({
        title: blog.title,
        excerpt: blog.excerpt,
        category: blog.category,
        readTime: blog.readTime || "",
        date: blog.date || "",
        featured: blog.featured || false,
        url: blog.url || "",
        imageUrl: blog.imageUrl || "",
      });
    } else {
      setEditingBlog(null);
      setBlogForm({
        title: "",
        excerpt: "",
        category: "",
        readTime: "",
        date: "",
        featured: false,
        url: "",
        imageUrl: "",
      });
    }
    setBlogImageFile(null);
    setIsBlogDialogOpen(true);
  };

  const handleSaveBlog = async () => {
    if (!blogForm.title.trim() || !blogForm.excerpt.trim() || !blogForm.url.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide title, excerpt, and URL.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingBlog(true);
    try {
      let imageUrl = blogForm.imageUrl.trim();

      // Upload image if provided
      if (blogImageFile) {
        if (isCloudinaryConfigured()) {
          imageUrl = await uploadToCloudinary(blogImageFile);
        } else {
          const fileRef = ref(storage, `blog-images/${Date.now()}_${blogImageFile.name}`);
          await uploadBytes(fileRef, blogImageFile);
          imageUrl = await getDownloadURL(fileRef);
        }
      }

      const blogData = {
        title: blogForm.title.trim(),
        excerpt: blogForm.excerpt.trim(),
        category: blogForm.category.trim() || "General",
        readTime: blogForm.readTime.trim() || undefined,
        date: blogForm.date.trim() || undefined,
        featured: blogForm.featured,
        url: blogForm.url.trim(),
        imageUrl: imageUrl || undefined,
      };

      if (editingBlog) {
        await updateDoc(doc(db, "blogPosts", editingBlog.id), {
          ...blogData,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Blog post updated" });
      } else {
        await addDoc(collection(db, "blogPosts"), {
          ...blogData,
          order: blogPosts.length,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Blog post added" });
      }
      setIsBlogDialogOpen(false);
      setEditingBlog(null);
      setBlogImageFile(null);
    } catch (error: any) {
      toast({
        title: "Failed to save blog post",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingBlog(false);
    }
  };

  // Blog reordering
  const handleMoveBlogUp = (index: number) => {
    if (index === 0) return;
    const newPosts = [...blogPosts];
    [newPosts[index - 1], newPosts[index]] = [newPosts[index], newPosts[index - 1]];
    setBlogPosts(newPosts);
  };

  const handleMoveBlogDown = (index: number) => {
    if (index === blogPosts.length - 1) return;
    const newPosts = [...blogPosts];
    [newPosts[index], newPosts[index + 1]] = [newPosts[index + 1], newPosts[index]];
    setBlogPosts(newPosts);
  };

  const handleSaveBlogOrder = async () => {
    try {
      const updates = blogPosts.map((post, index) =>
        updateDoc(doc(db, "blogPosts", post.id), { order: index })
      );
      await Promise.all(updates);
      toast({ title: "Blog order saved" });
    } catch (error: any) {
      toast({
        title: "Failed to save order",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Course handlers
  const openCourseDialog = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setCourseForm({
        title: course.title,
        description: course.description,
        highlights: course.highlights.join("\n"),
        platform: course.platform,
        platformLabel: course.platformLabel,
        courseUrl: course.courseUrl,
        imageUrl: course.imageUrl || "",
        price: course.price || "",
        featured: course.featured || false,
      });
    } else {
      setEditingCourse(null);
      setCourseForm({
        title: "",
        description: "",
        highlights: "",
        platform: "",
        platformLabel: "",
        courseUrl: "",
        imageUrl: "",
        price: "",
        featured: false,
      });
    }
    setCourseImageFile(null);
    setIsCourseDialogOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.title.trim() || !courseForm.description.trim() || !courseForm.courseUrl.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide title, description, and course URL.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingCourse(true);
    try {
      let imageUrl = courseForm.imageUrl.trim();

      if (courseImageFile) {
        if (isCloudinaryConfigured()) {
          imageUrl = await uploadToCloudinary(courseImageFile);
        } else {
          const fileRef = ref(storage, `course-images/${Date.now()}_${courseImageFile.name}`);
          await uploadBytes(fileRef, courseImageFile);
          imageUrl = await getDownloadURL(fileRef);
        }
      }

      const highlights = courseForm.highlights
        .split("\n")
        .map((h) => h.trim())
        .filter(Boolean);

      const courseData = {
        title: courseForm.title.trim(),
        description: courseForm.description.trim(),
        highlights,
        platform: courseForm.platform.trim(),
        platformLabel: courseForm.platformLabel.trim() || courseForm.platform.trim(),
        courseUrl: courseForm.courseUrl.trim(),
        imageUrl: imageUrl || undefined,
        price: courseForm.price.trim() || undefined,
        featured: courseForm.featured,
      };

      if (editingCourse) {
        await updateDoc(doc(db, "courses", editingCourse.id), {
          ...courseData,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Course updated" });
      } else {
        await addDoc(collection(db, "courses"), {
          ...courseData,
          order: courses.length,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Course added" });
      }
      setIsCourseDialogOpen(false);
      setEditingCourse(null);
      setCourseImageFile(null);
    } catch (error: any) {
      toast({
        title: "Failed to save course",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm("Delete this course?")) return;
    try {
      await deleteDoc(doc(db, "courses", id));
      toast({ title: "Course deleted" });
    } catch (error: any) {
      toast({
        title: "Failed to delete course",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  // About page handlers
  const handleSaveAbout = async () => {
    if (!aboutForm.name.trim() || !aboutForm.story.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide name and story.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAbout(true);
    try {
      let avatarUrl = aboutForm.avatarUrl.trim();

      if (aboutAvatarFile) {
        if (isCloudinaryConfigured()) {
          avatarUrl = await uploadToCloudinary(aboutAvatarFile);
        } else {
          const fileRef = ref(storage, `about-avatar/${Date.now()}_${aboutAvatarFile.name}`);
          await uploadBytes(fileRef, aboutAvatarFile);
          avatarUrl = await getDownloadURL(fileRef);
        }
      }

      const skills = aboutForm.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const aboutData = {
        name: aboutForm.name.trim(),
        title: aboutForm.title.trim(),
        avatarUrl: avatarUrl || undefined,
        story: aboutForm.story.trim(),
        skills,
        timeline: aboutForm.timeline,
        achievements: aboutForm.achievements,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "siteContent", "about"), aboutData, { merge: true });
      toast({ title: "About page updated" });
      setAboutAvatarFile(null);
    } catch (error: any) {
      toast({
        title: "Failed to save about page",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAbout(false);
    }
  };

  const addTimelineItem = () => {
    setAboutForm((prev) => ({
      ...prev,
      timeline: [...prev.timeline, { year: "", title: "", company: "", desc: "" }],
    }));
  };

  const removeTimelineItem = (index: number) => {
    setAboutForm((prev) => ({
      ...prev,
      timeline: prev.timeline.filter((_, i) => i !== index),
    }));
  };

  const updateTimelineItem = (index: number, field: string, value: string) => {
    setAboutForm((prev) => ({
      ...prev,
      timeline: prev.timeline.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addAchievementItem = () => {
    setAboutForm((prev) => ({
      ...prev,
      achievements: [...prev.achievements, { icon: "Award", value: "", label: "" }],
    }));
  };

  const removeAchievementItem = (index: number) => {
    setAboutForm((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
    }));
  };

  const updateAchievementItem = (index: number, field: string, value: string) => {
    setAboutForm((prev) => ({
      ...prev,
      achievements: prev.achievements.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleDeleteBlog = async (id: string) => {
    if (!window.confirm("Delete this blog post?")) return;
    try {
      await deleteDoc(doc(db, "blogPosts", id));
      toast({ title: "Blog post deleted" });
    } catch (error: any) {
      toast({
        title: "Failed to delete blog post",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const openServiceDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        icon: service.icon,
        title: service.title,
        description: service.description,
        features: service.features.join("\n"),
        price: service.price,
        ctaLabel: service.ctaLabel || "",
        ctaUrl: service.ctaUrl || "",
      });
    } else {
      setEditingService(null);
      setServiceForm({
        icon: "Briefcase",
        title: "",
        description: "",
        features: "",
        price: "",
        ctaLabel: "",
        ctaUrl: "",
      });
    }
    setIsServiceDialogOpen(true);
  };

  const handleSaveService = async () => {
    if (!serviceForm.title.trim() || !serviceForm.description.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide title and description.",
        variant: "destructive",
      });
      return;
    }

    const featuresArray = serviceForm.features
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    setIsSavingService(true);
    try {
      if (editingService) {
        await updateDoc(doc(db, "services", editingService.id), {
          icon: serviceForm.icon,
          title: serviceForm.title.trim(),
          description: serviceForm.description.trim(),
          features: featuresArray,
          price: serviceForm.price.trim() || undefined,
          ctaLabel: serviceForm.ctaLabel.trim() || undefined,
          ctaUrl: serviceForm.ctaUrl.trim() || undefined,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Service updated" });
      } else {
        await addDoc(collection(db, "services"), {
          icon: serviceForm.icon,
          title: serviceForm.title.trim(),
          description: serviceForm.description.trim(),
          features: featuresArray,
          price: serviceForm.price.trim() || undefined,
          ctaLabel: serviceForm.ctaLabel.trim() || undefined,
          ctaUrl: serviceForm.ctaUrl.trim() || undefined,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Service added" });
      }
      setIsServiceDialogOpen(false);
      setEditingService(null);
    } catch (error: any) {
      toast({
        title: "Failed to save service",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      await deleteDoc(doc(db, "services", id));
      toast({ title: "Service deleted" });
    } catch (error: any) {
      toast({
        title: "Failed to delete service",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetTestimonialForm = () => {
    setTestimonialForm({
      name: "",
      role: "",
      company: "",
      message: "",
      highlight: "",
      avatarUrl: "",
      linkedinUrl: "",
    });
  };

  const openTestimonialDialog = (testimonial?: Testimonial) => {
    if (testimonial) {
      setEditingTestimonial(testimonial);
      setTestimonialForm({
        name: testimonial.name || "",
        role: testimonial.role || "",
        company: testimonial.company || "",
        message: testimonial.message || "",
        highlight: testimonial.highlight || "",
        avatarUrl: testimonial.avatarUrl || "",
        linkedinUrl: testimonial.linkedinUrl || "",
      });
    } else {
      setEditingTestimonial(null);
      resetTestimonialForm();
    }
    setIsTestimonialDialogOpen(true);
  };

  const handleSaveTestimonial = async () => {
    if (!testimonialForm.name.trim() || !testimonialForm.message.trim()) {
      toast({
        title: "Missing information",
        description: "Name and feedback are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingTestimonial(true);
    try {
      const basePayload = {
        name: testimonialForm.name.trim(),
        message: testimonialForm.message.trim(),
        ...(testimonialForm.role.trim() && { role: testimonialForm.role.trim() }),
        ...(testimonialForm.company.trim() && { company: testimonialForm.company.trim() }),
        ...(testimonialForm.highlight.trim() && { highlight: testimonialForm.highlight.trim() }),
        ...(testimonialForm.avatarUrl.trim() && { avatarUrl: testimonialForm.avatarUrl.trim() }),
        ...(testimonialForm.linkedinUrl.trim() && { linkedinUrl: testimonialForm.linkedinUrl.trim() }),
      };

      if (editingTestimonial) {
        await updateDoc(doc(db, "testimonials", editingTestimonial.id), {
          ...basePayload,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Testimonial updated" });
      } else {
        await addDoc(collection(db, "testimonials"), {
          ...basePayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Testimonial added" });
      }
      setIsTestimonialDialogOpen(false);
      setEditingTestimonial(null);
      resetTestimonialForm();
    } catch (error: any) {
      toast({
        title: "Failed to save testimonial",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingTestimonial(false);
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!window.confirm("Delete this testimonial?")) return;
    try {
      await deleteDoc(doc(db, "testimonials", id));
      toast({ title: "Testimonial removed" });
    } catch (error: any) {
      toast({
        title: "Failed to delete testimonial",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Theory Questions functions
  const openTheoryDialog = (theory?: TheoryQuestion) => {
    if (theory) {
      setEditingTheory(theory);
      setTheoryForm({
        module: theory.module,
        questionTitle: theory.questionTitle || "",
        question: theory.question,
        hint: theory.hint || "",
        company: theory.company || "",
        difficulty: theory.difficulty || "",
      });
    } else {
      setEditingTheory(null);
      setTheoryForm({
        module: "",
        questionTitle: "",
        question: "",
        hint: "",
        company: "",
        difficulty: "",
      });
    }
    setTheoryImages([]);
    setTheoryPdf(null);
    setIsTheoryDialogOpen(true);
  };

  const handleSaveTheory = async () => {
    if (!theoryForm.module.trim() || !theoryForm.question.trim()) {
      toast({
        title: "Missing information",
        description: "Module and question are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingTheory(true);
    try {
      let imageUrls: string[] = editingTheory?.imageUrls || [];
      let pdfUrl = editingTheory?.pdfUrl || "";

      // Upload images - try Cloudinary first, then Firebase Storage
      if (theoryImages.length > 0) {
        toast({ title: "Uploading images...", description: "Please wait..." });
        
        if (isCloudinaryConfigured()) {
          try {
            const uploadPromises = theoryImages.map((img) => uploadToCloudinary(img));
            const uploadedUrls = await Promise.all(uploadPromises);
            imageUrls = [...imageUrls, ...uploadedUrls];
            toast({ title: `${theoryImages.length} image(s) uploaded to Cloudinary` });
          } catch (cloudinaryError: any) {
            console.error("Cloudinary upload failed:", cloudinaryError);
            toast({ title: "Cloudinary failed, trying Firebase...", variant: "destructive" });
            // Fallback to Firebase
            for (const img of theoryImages) {
              const fileRef = ref(storage, `theory-images/${Date.now()}_${img.name}`);
              await uploadBytes(fileRef, img);
              const url = await getDownloadURL(fileRef);
              imageUrls.push(url);
            }
            toast({ title: `${theoryImages.length} image(s) uploaded to Firebase` });
          }
        } else {
          // Use Firebase Storage directly
          console.log("Cloudinary not configured, using Firebase Storage");
          for (const img of theoryImages) {
            const fileRef = ref(storage, `theory-images/${Date.now()}_${img.name}`);
            await uploadBytes(fileRef, img);
            const url = await getDownloadURL(fileRef);
            imageUrls.push(url);
          }
          toast({ title: `${theoryImages.length} image(s) uploaded to Firebase` });
        }
      }

      // Upload PDF to Cloudinary
      if (theoryPdf) {
        toast({ title: "Uploading PDF...", description: "Please wait..." });
        
        if (isCloudinaryConfigured()) {
          try {
            pdfUrl = await uploadPdfToCloudinary(theoryPdf);
            toast({ title: "PDF uploaded to Cloudinary" });
          } catch (cloudinaryError: any) {
            console.error("Cloudinary PDF upload failed:", cloudinaryError);
            toast({ 
              title: "PDF upload failed", 
              description: cloudinaryError.message,
              variant: "destructive" 
            });
          }
        } else {
          toast({ 
            title: "Cloudinary not configured", 
            description: "Please configure Cloudinary to upload PDFs.",
            variant: "destructive" 
          });
        }
      }

      const theoryData = {
        module: theoryForm.module.trim(),
        questionTitle: theoryForm.questionTitle.trim() || null,
        question: theoryForm.question.trim(),
        hint: theoryForm.hint.trim() || null,
        company: theoryForm.company.trim() || null,
        difficulty: theoryForm.difficulty || null,
        imageUrls,
        pdfUrl: pdfUrl || null,
      };

      if (editingTheory) {
        await updateDoc(doc(db, "theoryQuestions", editingTheory.id), {
          ...theoryData,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Theory question updated" });
      } else {
        await addDoc(collection(db, "theoryQuestions"), {
          ...theoryData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Theory question added" });
      }
      setIsTheoryDialogOpen(false);
      setEditingTheory(null);
      setTheoryImages([]);
      setTheoryPdf(null);
    } catch (error: any) {
      toast({
        title: "Failed to save theory question",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingTheory(false);
    }
  };

  const handleDeleteTheory = async (id: string) => {
    if (!window.confirm("Delete this theory question?")) return;
    try {
      await deleteDoc(doc(db, "theoryQuestions", id));
      toast({ title: "Theory question deleted" });
    } catch (error: any) {
      toast({
        title: "Failed to delete",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const navigationItems = [
    { id: "dashboard" as AdminSection, label: "Dashboard", icon: LayoutDashboard },
    { id: "questions" as AdminSection, label: "Interview Questions", icon: FileText },
    { id: "theory-questions" as AdminSection, label: "Theory Questions", icon: Brain },
    { id: "case-studies" as AdminSection, label: "Case Studies", icon: FolderOpen },
    { id: "projects" as AdminSection, label: "Projects", icon: Briefcase },
    { id: "blog" as AdminSection, label: "Blog Posts", icon: Newspaper },
    { id: "courses" as AdminSection, label: "Courses", icon: BookOpen },
    { id: "about" as AdminSection, label: "About Page", icon: Users },
    { id: "services" as AdminSection, label: "Services", icon: Settings },
    { id: "testimonials" as AdminSection, label: "Testimonials", icon: Quote },
    { id: "users" as AdminSection, label: "Learner Access", icon: UserCheck },
    { id: "module-order" as AdminSection, label: "Module Order", icon: Layers },
    { id: "question-order" as AdminSection, label: "Question Order", icon: GripVertical },
  ];

  const getSectionDescription = (section: AdminSection): string => {
    switch (section) {
      case "dashboard":
        return "Overview of all content and statistics.";
      case "questions":
        return "Create, edit, or remove questions from the public repository.";
      case "theory-questions":
        return "Manage theory questions for Puzzle, AI, ML modules (no compiler needed).";
      case "case-studies":
        return "Publish detailed case studies to showcase real-world projects.";
      case "projects":
        return "Upload project resources so users can download them.";
      case "blog":
        return "Manage blog posts with images and ordering.";
      case "courses":
        return "Add and manage courses displayed on the Courses page.";
      case "about":
        return "Edit the About page content including bio, skills, and timeline.";
      case "services":
        return "Manage services that appear on the Services page.";
      case "testimonials":
        return "Collect and curate learner testimonials shown on the homepage.";
      case "users":
        return "Toggle premium access for any user after payment confirmation.";
      case "module-order":
        return "Manage the display order of modules on the Interview Prep page.";
      case "question-order":
        return "Set the display order of questions within each module.";
      default:
        return "";
    }
  };

  // Calculate module statistics
  const moduleStats = useMemo(() => {
    const modules = new Map<string, { total: number; free: number; paid: number }>();
    questions.forEach((q) => {
      const title = q.title?.trim() || "General";
      if (!modules.has(title)) {
        modules.set(title, { total: 0, free: 0, paid: 0 });
      }
      const stats = modules.get(title)!;
      stats.total += 1;
      if (q.tier === "free") stats.free += 1;
      else stats.paid += 1;
    });
    return Array.from(modules.entries()).map(([name, stats]) => ({
      name,
      ...stats,
    })).sort((a, b) => b.total - a.total);
  }, [questions]);

  // Define render functions before renderContent
  const renderDashboardSection = () => (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <GlassCard className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{questions.length}</p>
            <p className="text-xs text-muted-foreground">Interview Questions</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Brain className="h-4 w-4 text-purple-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{theoryQuestions.length}</p>
            <p className="text-xs text-muted-foreground">Theory Questions</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Users className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <BookOpen className="h-4 w-4 text-orange-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{courses.length}</p>
            <p className="text-xs text-muted-foreground">Courses</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Briefcase className="h-4 w-4 text-cyan-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{projects.length}</p>
            <p className="text-xs text-muted-foreground">Projects</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <FolderOpen className="h-4 w-4 text-pink-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{caseStudies.length}</p>
            <p className="text-xs text-muted-foreground">Case Studies</p>
          </div>
        </GlassCard>
      </div>

      {/* Modules Overview */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Modules Overview
          </h3>
          <Badge variant="secondary">{moduleStats.length} Modules</Badge>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module Name</TableHead>
                <TableHead className="text-center">Total Questions</TableHead>
                <TableHead className="text-center">Free</TableHead>
                <TableHead className="text-center">Premium</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {moduleStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No modules found. Add questions to create modules.
                  </TableCell>
                </TableRow>
              ) : (
                moduleStats.map((module) => (
                  <TableRow key={module.name}>
                    <TableCell className="font-medium">{module.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{module.total}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-green-500/50 text-green-500">
                        {module.free}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
                        {module.paid}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Content Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm">Blog Posts</span>
              <Badge>{blogPosts.length}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm">Services</span>
              <Badge>{services.length}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm">Testimonials</span>
              <Badge>{testimonials.length}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm">Premium Users</span>
              <Badge variant="secondary">
                {users.filter(u => u.isPaid || u.hasGlobalAccess).length}
              </Badge>
            </div>
          </div>
        </GlassCard>

        {/* Question Types */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Question Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm">Free Questions</span>
              <Badge variant="outline" className="border-green-500/50 text-green-500">
                {questions.filter(q => q.tier === "free").length}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm">Premium Questions</span>
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
                {questions.filter(q => q.tier === "paid").length}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm">Easy</span>
              <Badge variant="outline" className="border-green-500/50 text-green-500 bg-green-500/10">
                {questions.filter(q => q.difficulty === "easy").length}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm">Medium</span>
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 bg-yellow-500/10">
                {questions.filter(q => q.difficulty === "medium").length}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm">Hard</span>
              <Badge variant="outline" className="border-red-500/50 text-red-500 bg-red-500/10">
                {questions.filter(q => q.difficulty === "hard").length}
              </Badge>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );

  const renderQuestionsSection = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <GlassCard className="p-4 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Questions</p>
              <p className="text-2xl font-bold mt-1">{questionStats.total}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Free Questions</p>
              <p className="text-2xl font-bold mt-1 text-green-500">{questionStats.free}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <Target className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 border-secondary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Premium Questions</p>
              <p className="text-2xl font-bold mt-1 text-secondary">{questionStats.paid}</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/10">
              <Zap className="h-5 w-5 text-secondary" />
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 border-accent/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Modules</p>
              <p className="text-2xl font-bold mt-1 text-accent">{uniqueTitles.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10">
              <Layers className="h-5 w-5 text-accent" />
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Module Pricing (INR)</h3>
            <p className="text-sm text-muted-foreground">
              Set the paid access price for each interview module. Leave empty to use the default ₹{DEFAULT_MODULE_PRICE}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">All Modules Pass</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                value={globalModulePrice}
                onChange={(e) => setGlobalModulePrice(e.target.value)}
                className="w-28"
                placeholder={String(DEFAULT_GLOBAL_PRICE)}
              />
              <Button
                onClick={async () => {
                  const amount = Number(globalModulePrice);
                  if (!Number.isFinite(amount) || amount <= 0) {
                    toast({
                      title: "Invalid price",
                      description: "Enter a positive number for the global pass.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setSavingGlobalPrice(true);
                  try {
                    await setDoc(
                      doc(db, MODULE_PRICING_COLLECTION, GLOBAL_PRICING_DOC),
                      {
                        price: amount,
                        currency: "INR",
                        type: "global",
                        updatedAt: serverTimestamp(),
                      },
                      { merge: true }
                    );
                    toast({ title: "Global price updated", description: `All modules now cost ₹${amount}` });
                  } catch (error: any) {
                    toast({
                      title: "Failed to update global price",
                      description: error.message || "Please try again.",
                      variant: "destructive",
                    });
                  } finally {
                    setSavingGlobalPrice(false);
                  }
                }}
                disabled={savingGlobalPrice}
                className="min-w-[96px]"
              >
                {savingGlobalPrice ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </div>
        {uniqueTitles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a question to create your first module.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {uniqueTitles.map((title) => {
              const normalizedTitle = normalizeModuleTitle(title);
              const inputValue = modulePricingInputs[normalizedTitle] ?? "";
              const effectivePrice = modulePricing[normalizedTitle] ?? DEFAULT_MODULE_PRICE;
              return (
                <div
                  key={normalizedTitle}
                  className="rounded-xl border border-border/60 bg-background/80 p-4 space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="text-xs text-muted-foreground">
                        Current price: <span className="font-medium text-foreground">₹{effectivePrice}</span>
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {effectivePrice === DEFAULT_MODULE_PRICE ? "Default" : "Custom"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="1"
                      value={inputValue}
                      onChange={(e) =>
                        setModulePricingInputs((prev) => ({
                          ...prev,
                          [normalizedTitle]: e.target.value,
                        }))
                      }
                      placeholder={String(DEFAULT_MODULE_PRICE)}
                    />
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const rawValue = modulePricingInputs[normalizedTitle] ?? String(effectivePrice);
                        const amount = Number(rawValue);
                        if (!Number.isFinite(amount) || amount <= 0) {
                          toast({
                            title: "Invalid price",
                            description: "Enter a positive number in rupees.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setSavingModulePrice(normalizedTitle);
                        try {
                          await setDoc(
                            doc(db, MODULE_PRICING_COLLECTION, getModulePricingDocId(normalizedTitle)),
                            {
                              title: normalizedTitle,
                              price: amount,
                              currency: "INR",
                              updatedAt: serverTimestamp(),
                            },
                            { merge: true }
                          );
                          toast({
                            title: "Module price updated",
                            description: `${normalizedTitle} now costs ₹${amount}`,
                          });
                        } catch (error: any) {
                          toast({
                            title: "Failed to save price",
                            description: error.message || "Please try again.",
                            variant: "destructive",
                          });
                        } finally {
                          setSavingModulePrice(null);
                        }
                      }}
                      disabled={savingModulePrice === normalizedTitle}
                      className="min-w-[96px]"
                    >
                      {savingModulePrice === normalizedTitle ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions by title, content, company, or difficulty..."
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  className="pl-10 pr-10"
                />
                {questionSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setQuestionSearch("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="bg-gradient-primary hover:shadow-glow-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
          
          {/* Filter Section */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={questionTierFilter} onValueChange={(value) => setQuestionTierFilter(value as "all" | "free" | "paid")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="paid">Premium</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={questionDifficultyFilter} onValueChange={(value) => setQuestionDifficultyFilter(value as "all" | "easy" | "medium" | "hard")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={questionCompanyFilter} onValueChange={setQuestionCompanyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {uniqueCompanies.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={questionModuleFilter} onValueChange={setQuestionModuleFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {moduleFilterOptions.map((module) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(questionTierFilter !== "all" || questionDifficultyFilter !== "all" || questionCompanyFilter !== "all" || questionModuleFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuestionTierFilter("all");
                  setQuestionDifficultyFilter("all");
                  setQuestionCompanyFilter("all");
                  setQuestionModuleFilter("all");
                }}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </GlassCard>
        
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <div className="p-6 pb-4 flex-shrink-0 border-b border-border">
              <DialogHeader>
                <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
                <DialogDescription>Provide the prompt, answer, and whether it is free or premium.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-4 overflow-y-auto flex-1 px-6 py-4 custom-scrollbar">
              <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-3 text-sm text-muted-foreground">
                Only the module title, question prompt, answer, and tier are required. Everything else is optional to help with organization and validation.
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title (Module Name)</Label>
                <Popover open={titleSearchOpen} onOpenChange={setTitleSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={titleSearchOpen}
                      className="w-full justify-between"
                    >
                      {questionForm.title || "Select or type a new title..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search or type new title..." 
                        value={questionForm.title}
                        onValueChange={(value) => setQuestionForm((prev) => ({ ...prev, title: value }))}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="py-2 text-center text-sm">
                            <p>No existing titles found.</p>
                            <p className="text-muted-foreground mt-1">Type to create a new title</p>
                          </div>
                        </CommandEmpty>
                        <CommandGroup>
                          {uniqueTitles.map((title) => (
                            <CommandItem
                              key={title}
                              value={title}
                              onSelect={() => {
                                setQuestionForm((prev) => ({ ...prev, title }));
                                setTitleSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  questionForm.title === title ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {title}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Select an existing module title or type a new one to create a new module.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="questionTitle">Question Title</Label>
                <Input
                  id="questionTitle"
                  placeholder="e.g., Histogram of Tweets, Data Science Skills"
                  value={questionForm.questionTitle}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, questionTitle: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  A short, descriptive title for this specific question (shown in the question list).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Textarea
                  id="question"
                  placeholder="Enter the interview question"
                  value={questionForm.question}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, question: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hint">Hint (optional)</Label>
                <Textarea
                  id="hint"
                  placeholder="Share a gentle nudge or thinking direction for candidates"
                  value={questionForm.hint}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, hint: e.target.value }))}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This hint will appear on the question page (and dedicated hint page) to guide learners before revealing the full solution.
                </p>
              </div>
              {(questionForm.title?.toLowerCase().includes("sql") || 
                questionForm.title?.toLowerCase().includes("mysql") ||
                questionForm.title?.toLowerCase().includes("python") ||
                questionForm.title?.toLowerCase().includes("pandas")) && (
                <div className="space-y-2">
                  <Label htmlFor="sqlTableNames">Table Names (optional)</Label>
                  <Input
                    id="sqlTableNames"
                    placeholder="e.g., customers, orders, products"
                    value={questionForm.sqlTableNames}
                    onChange={(e) => setQuestionForm((prev) => ({ ...prev, sqlTableNames: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of table/dataframe names. For SQL: creates tables in the compiler. For Python: shows as tablename.head() in starter code.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="answer">Answer / Explanation</Label>
                <Textarea
                  id="answer"
                  placeholder="Provide the answer or detailed guidance"
                  value={questionForm.answer}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, answer: e.target.value }))}
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="expectedOutput">Expected Output (for validation)</Label>
                  {expectsTabularOutput && (
                    <Collapsible open={expectedOutputHelperOpen} onOpenChange={setExpectedOutputHelperOpen}>
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="h-auto py-1 text-xs">
                          {expectedOutputHelperOpen ? "Hide" : "Show"} Table Format Helper
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3 text-sm">
                          <div>
                            <p className="font-semibold mb-2">SQL Expected Output Format:</p>
                            <p className="text-xs text-muted-foreground mb-3">
                              SQL queries return results as tables. Format your expected output as JSON with <code className="bg-background/60 px-1 py-0.5 rounded">columns</code> and <code className="bg-background/60 px-1 py-0.5 rounded">values</code> arrays.
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold mb-2 text-xs">Example Table Result:</p>
                            <div className="bg-background/60 border border-border/50 rounded p-2 mb-2 text-xs font-mono">
                              <div className="grid grid-cols-3 gap-2 mb-1 font-semibold border-b border-border/50 pb-1">
                                <div>id</div>
                                <div>name</div>
                                <div>salary</div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>1</div>
                                <div>John</div>
                                <div>50000</div>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>2</div>
                                <div>Jane</div>
                                <div>60000</div>
                              </div>
                            </div>
                            <p className="font-semibold mb-2 text-xs">JSON Format:</p>
                            <pre className="bg-background/80 border border-border/50 rounded p-2 text-xs overflow-x-auto">
{`{
  "columns": ["id", "name", "salary"],
  "values": [
    [1, "John", 50000],
    [2, "Jane", 60000]
  ]
}`}
                            </pre>
                          </div>
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground">
                              <strong>Tips:</strong> Column names are case-insensitive. Values are compared after trimming whitespace. Row order doesn't matter (rows are sorted before comparison).
                            </p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
                <Textarea
                  id="expectedOutput"
                  placeholder={
                    expectsTabularOutput
                      ? 'JSON format: {"columns": ["col1", "col2"], "values": [[val1, val2], [val3, val4]]}'
                      : 'Provide the exact expected output text shown to the user.'
                  }
                  value={questionForm.expectedOutput}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, expectedOutput: e.target.value }))}
                  rows={4}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Tables (SQL · Python · pandas · etc.):</strong> Use JSON with <code className="bg-background/60 px-1 py-0.5 rounded">columns</code> and <code className="bg-background/60 px-1 py-0.5 rounded">values</code>. <strong>Other outputs:</strong> Provide the exact text shown to the learner. Leave empty if validation is not required.
                </p>

                <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide">Convert Table Text to JSON</Label>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleGenerateExpectedOutput}
                      disabled={!expectedOutputConverterInput.trim()}
                    >
                      Generate JSON
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Paste sample data (header row first). Example:
id, name, salary
1, John, 50000
2, Jane, 60000"
                    value={expectedOutputConverterInput}
                    onChange={(e) => setExpectedOutputConverterInput(e.target.value)}
                    rows={4}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Works for SQL, Python (pandas), or any table-like output. Supports comma, tab, pipe, or multi‑space separators. Generated JSON is saved into the Expected Output field automatically.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select
                    value={questionForm.difficulty}
                    onValueChange={(value: "easy" | "medium" | "hard" | "") => setQuestionForm((prev) => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    placeholder="e.g., Google, Amazon, Microsoft"
                    value={questionForm.company}
                    onChange={(e) => setQuestionForm((prev) => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select
                  value={questionForm.tier}
                  onValueChange={(value: "free" | "paid") => setQuestionForm((prev) => ({ ...prev, tier: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-6 pt-4 flex-shrink-0 border-t border-border flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveQuestion} 
                disabled={isSavingQuestion}
                className="flex-1 bg-gradient-primary hover:shadow-glow-primary"
              >
                {isSavingQuestion ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingQuestion ? (
                  "Save changes"
                ) : (
                  "Add question"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <GlassCard className="text-center py-12">
            <div className="max-w-md mx-auto space-y-4">
              <div className="inline-flex p-4 rounded-full bg-muted/50">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">
                {questionSearch ? "No questions found" : "No questions yet"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {questionSearch 
                  ? "Try adjusting your search terms." 
                  : "Add your first interview question to get started."}
              </p>
              {!questionSearch && (
                <Button onClick={openCreateDialog} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Question
                </Button>
              )}
            </div>
          </GlassCard>
        ) : (
          <div className="grid gap-4">
            {filteredQuestions.map((question) => (
              <GlassCard 
                key={question.id} 
                className="p-5 hover:border-primary/30 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header with badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge variant={question.tier === "free" ? "outline" : "secondary"} className="font-semibold">
                            {question.tier === "free" ? "Free" : "Premium"}
                          </Badge>
                          {question.difficulty && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                question.difficulty === "easy" && "border-green-500/50 text-green-500 bg-green-500/10",
                                question.difficulty === "medium" && "border-yellow-500/50 text-yellow-500 bg-yellow-500/10",
                                question.difficulty === "hard" && "border-red-500/50 text-red-500 bg-red-500/10"
                              )}
                            >
                              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                            </Badge>
                          )}
                          {question.company && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <CompanyLogo companyName={question.company} size={12} className="flex-shrink-0" />
                              {question.company}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                          {question.title || "Untitled Question"}
                        </h3>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button 
                          size="icon" 
                          variant="outline" 
                          onClick={() => openEditDialog(question)}
                          className="hover:bg-primary/10 hover:border-primary/50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="destructive" 
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="hover:bg-destructive/90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Question preview */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Question:</p>
                        <p className="text-sm text-foreground/90 line-clamp-2 whitespace-pre-wrap">
                          {question.question}
                        </p>
                      </div>
                      {question.answer && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Answer:</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                            {question.answer}
                          </p>
                        </div>
                      )}
                      {question.expectedOutput && (
                        <div className="pt-2 border-t border-border/50">
                          <Badge variant="outline" className="text-xs">
                            Has Expected Output
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderTheoryQuestionsSection = () => (
    <GlassCard className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Modules: {NON_CODE_MODULES.join(", ")}
          </p>
        </div>
        <Dialog open={isTheoryDialogOpen} onOpenChange={setIsTheoryDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openTheoryDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Theory Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTheory ? "Edit Theory Question" : "Add Theory Question"}</DialogTitle>
              <DialogDescription>
                Add questions for non-code modules like Puzzle, AI, ML. These won't show a compiler.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Module *</Label>
                <Select
                  value={theoryForm.module}
                  onValueChange={(value) => setTheoryForm((prev) => ({ ...prev, module: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module..." />
                  </SelectTrigger>
                  <SelectContent>
                    {NON_CODE_MODULES.map((mod) => (
                      <SelectItem key={mod} value={mod}>
                        {mod}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Question Title</Label>
                <Input
                  value={theoryForm.questionTitle}
                  onChange={(e) => setTheoryForm((prev) => ({ ...prev, questionTitle: e.target.value }))}
                  placeholder="e.g., Find the missing number, Pattern recognition..."
                />
                <p className="text-xs text-muted-foreground">A short title shown in the question list</p>
              </div>
              
              <div className="space-y-2">
                <Label>Question *</Label>
                <Textarea
                  rows={5}
                  value={theoryForm.question}
                  onChange={(e) => setTheoryForm((prev) => ({ ...prev, question: e.target.value }))}
                  placeholder="Write the full question here..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Hint (Optional)</Label>
                <Textarea
                  rows={3}
                  value={theoryForm.hint}
                  onChange={(e) => setTheoryForm((prev) => ({ ...prev, hint: e.target.value }))}
                  placeholder="Provide a hint for the question..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company (Optional)</Label>
                  <Input
                    value={theoryForm.company}
                    onChange={(e) => setTheoryForm((prev) => ({ ...prev, company: e.target.value }))}
                    placeholder="e.g., Google, Amazon"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Difficulty (Optional)</Label>
                  <Select
                    value={theoryForm.difficulty}
                    onValueChange={(value) => setTheoryForm((prev) => ({ ...prev, difficulty: value as "" | "easy" | "medium" | "hard" }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Images (Optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setTheoryImages(Array.from(e.target.files || []))}
                />
                {theoryImages.length > 0 && (
                  <p className="text-xs text-primary">
                    {theoryImages.length} image(s) selected
                  </p>
                )}
                {editingTheory?.imageUrls && editingTheory.imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editingTheory.imageUrls.map((url, idx) => (
                      <img key={idx} src={url} alt={`Image ${idx + 1}`} className="w-16 h-16 object-cover rounded" />
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Images will be stored in {isSupabaseConfigured() ? "Supabase" : "Firebase Storage"}.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>PDF (Optional)</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setTheoryPdf(e.target.files?.[0] || null)}
                />
                {theoryPdf && (
                  <p className="text-xs text-primary">Selected: {theoryPdf.name}</p>
                )}
                {editingTheory?.pdfUrl && !theoryPdf && (
                  <a 
                    href={editingTheory.pdfUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View current PDF →
                  </a>
                )}
                <p className="text-xs text-muted-foreground">
                  PDF will be stored in {isSupabaseConfigured() ? "Supabase" : "Firebase Storage"}.
                </p>
              </div>
              
              <Button onClick={handleSaveTheory} disabled={isSavingTheory} className="w-full">
                {isSavingTheory ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingTheory ? (
                  "Save Changes"
                ) : (
                  "Add Question"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {theoryQuestions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No theory questions yet. Add your first question for Puzzle, AI, or ML modules.
          </p>
        ) : (
          theoryQuestions.map((theory) => (
            <div key={theory.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{theory.module}</Badge>
                    {theory.company && (
                      <Badge variant="outline">{theory.company}</Badge>
                    )}
                    {theory.difficulty && (
                      <Badge 
                        variant="outline"
                        className={
                          theory.difficulty === "easy" 
                            ? "border-green-500/50 text-green-500 bg-green-500/10" 
                            : theory.difficulty === "medium"
                            ? "border-yellow-500/50 text-yellow-500 bg-yellow-500/10"
                            : "border-red-500/50 text-red-500 bg-red-500/10"
                        }
                      >
                        {theory.difficulty.charAt(0).toUpperCase() + theory.difficulty.slice(1)}
                      </Badge>
                    )}
                    {theory.pdfUrl && <Badge variant="outline">Has PDF</Badge>}
                    {theory.imageUrls && theory.imageUrls.length > 0 && (
                      <Badge variant="outline">{theory.imageUrls.length} Image(s)</Badge>
                    )}
                  </div>
                  {theory.questionTitle && (
                    <p className="font-medium text-base">{theory.questionTitle}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{theory.question.substring(0, 150)}{theory.question.length > 150 ? "..." : ""}</p>
                  {theory.hint && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold">Hint:</span> {theory.hint.substring(0, 100)}...
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => openTheoryDialog(theory)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDeleteTheory(theory.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {theory.imageUrls && theory.imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {theory.imageUrls.slice(0, 4).map((url, idx) => (
                    <img key={idx} src={url} alt={`Image ${idx + 1}`} className="w-20 h-20 object-cover rounded" />
                  ))}
                  {theory.imageUrls.length > 4 && (
                    <div className="w-20 h-20 bg-muted rounded flex items-center justify-center text-sm">
                      +{theory.imageUrls.length - 4} more
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );

  const renderCaseStudiesSection = () => (
    <GlassCard className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div></div>
        <Dialog open={isCaseDialogOpen} onOpenChange={setIsCaseDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openCaseStudyDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Case Study
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingCaseStudy ? "Edit Case Study" : "Publish Case Study"}</DialogTitle>
              <DialogDescription>Provide project details, techniques, and resource links.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={caseStudyForm.title}
                    onChange={(e) => setCaseStudyForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Customer Churn Prediction"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input
                    value={caseStudyForm.industry}
                    onChange={(e) => setCaseStudyForm((prev) => ({ ...prev, industry: e.target.value }))}
                    placeholder="Telecom, Retail, Fintech…"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={caseStudyForm.description}
                  onChange={(e) => setCaseStudyForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Short overview of the case study."
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Techniques (comma separated)</Label>
                  <Textarea
                    rows={2}
                    value={caseStudyForm.techniques}
                    onChange={(e) => setCaseStudyForm((prev) => ({ ...prev, techniques: e.target.value }))}
                    placeholder="Random Forest, XGBoost, SQL"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Key Outcomes (one per line)</Label>
                  <Textarea
                    rows={2}
                    value={caseStudyForm.outcomes}
                    onChange={(e) => setCaseStudyForm((prev) => ({ ...prev, outcomes: e.target.value }))}
                    placeholder={"• 89% accuracy\n• 15% churn reduction"}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dataset URL</Label>
                  <Input
                    value={caseStudyForm.datasetUrl}
                    onChange={(e) => setCaseStudyForm((prev) => ({ ...prev, datasetUrl: e.target.value }))}
                    placeholder="https://"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notebook URL</Label>
                  <Input
                    value={caseStudyForm.notebookUrl}
                    onChange={(e) => setCaseStudyForm((prev) => ({ ...prev, notebookUrl: e.target.value }))}
                    placeholder="https://"
                  />
                </div>
                <div className="space-y-2">
                  <Label>PDF URL</Label>
                  <Input
                    value={caseStudyForm.pdfUrl}
                    onChange={(e) => setCaseStudyForm((prev) => ({ ...prev, pdfUrl: e.target.value }))}
                    placeholder="https://"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Analysis URL</Label>
                  <Input
                    value={caseStudyForm.viewUrl}
                    onChange={(e) => setCaseStudyForm((prev) => ({ ...prev, viewUrl: e.target.value }))}
                    placeholder="https://"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cover Emoji (optional)</Label>
                <Input
                  value={caseStudyForm.coverEmoji}
                  onChange={(e) => setCaseStudyForm((prev) => ({ ...prev, coverEmoji: e.target.value }))}
                  placeholder="📊"
                />
              </div>
              <Button onClick={handleSaveCaseStudy} disabled={isSavingCaseStudy}>
                {isSavingCaseStudy ? "Saving..." : editingCaseStudy ? "Save changes" : "Publish case study"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {caseStudies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No case studies yet.</p>
        ) : (
          caseStudies.map((study) => (
            <div key={study.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">{study.industry}</p>
                  <p className="text-lg font-semibold">{study.title}</p>
                  <p className="text-sm text-muted-foreground">{study.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => openCaseStudyDialog(study)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDeleteCaseStudy(study.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {study.techniques.map((tech) => (
                  <Badge key={tech} variant="outline">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );

  const renderProjectsSection = () => (
    <GlassCard className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div></div>
        <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openProjectDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{editingProject ? "Edit Project" : "Add Project"}</DialogTitle>
              <DialogDescription>Add a project with images, PDFs, and drive links.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Heading / Title *</Label>
                  <Input
                    value={projectForm.title}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Project Title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    rows={2}
                    value={projectForm.description}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description..."
                  />
                </div>
              </div>

              {/* Multiple Google Drive Links */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Google Drive Links *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProjectForm((prev) => ({ ...prev, driveLinks: [...prev.driveLinks, ""] }))}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Link
                  </Button>
                </div>
                {projectForm.driveLinks.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={link}
                      onChange={(e) => {
                        const newLinks = [...projectForm.driveLinks];
                        newLinks[index] = e.target.value;
                        setProjectForm((prev) => ({ ...prev, driveLinks: newLinks }));
                      }}
                      placeholder={`Drive link ${index + 1}`}
                    />
                    {projectForm.driveLinks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newLinks = projectForm.driveLinks.filter((_, i) => i !== index);
                          setProjectForm((prev) => ({ ...prev, driveLinks: newLinks }));
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Multiple Images Upload */}
              <div className="space-y-2">
                <Label>Images (up to 4)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(0, 4);
                    setProjectImageFiles(files);
                  }}
                />
                {projectImageFiles.length > 0 && (
                  <p className="text-xs text-primary">Selected: {projectImageFiles.map(f => f.name).join(", ")}</p>
                )}
                {projectForm.imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {projectForm.imageUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={url} alt={`Image ${idx + 1}`} className="w-16 h-16 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => {
                            const newUrls = projectForm.imageUrls.filter((_, i) => i !== idx);
                            setProjectForm((prev) => ({ ...prev, imageUrls: newUrls }));
                          }}
                          className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Multiple PDFs Upload */}
              <div className="space-y-2">
                <Label>PDFs (up to 4)</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []).slice(0, 4);
                    setProjectPdfFiles(files);
                  }}
                />
                {projectPdfFiles.length > 0 && (
                  <p className="text-xs text-primary">Selected: {projectPdfFiles.map(f => f.name).join(", ")}</p>
                )}
                {projectForm.pdfUrls.length > 0 && (
                  <div className="space-y-1">
                    {projectForm.pdfUrls.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">
                          PDF {idx + 1}
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const newUrls = projectForm.pdfUrls.filter((_, i) => i !== idx);
                            setProjectForm((prev) => ({ ...prev, pdfUrls: newUrls }));
                          }}
                          className="text-destructive hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleSaveProject} disabled={isSavingProject} className="w-full">
                {isSavingProject ? "Saving..." : editingProject ? "Save changes" : "Add Project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects published yet.</p>
        ) : (
          projects.map((project) => {
            const images = project.imageUrls || (project.imageUrl ? [project.imageUrl] : []);
            const pdfs = project.pdfUrls || [];
            const links = project.driveLinks || (project.driveLink ? [project.driveLink] : []);
            
            return (
              <div key={project.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex gap-4">
                  {images.length > 0 && (
                    <div className="flex gap-1 flex-shrink-0">
                      {images.slice(0, 2).map((url, idx) => (
                        <img 
                          key={idx}
                          src={url} 
                          alt={`${project.title} ${idx + 1}`} 
                          className="w-16 h-16 object-cover rounded"
                        />
                      ))}
                      {images.length > 2 && (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          +{images.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold">{project.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {links.map((link, idx) => (
                        <a 
                          key={idx}
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Drive Link {links.length > 1 ? idx + 1 : ""} →
                        </a>
                      ))}
                      {pdfs.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {pdfs.length} PDF{pdfs.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {images.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {images.length} Image{images.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="icon" variant="outline" onClick={() => openProjectDialog(project)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => handleDeleteProject(project.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </GlassCard>
  );

  const renderBlogSection = () => (
    <GlassCard className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div></div>
        <Dialog open={isBlogDialogOpen} onOpenChange={setIsBlogDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openBlogDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Blog Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{editingBlog ? "Edit Blog Post" : "Add Blog Post"}</DialogTitle>
              <DialogDescription>
                Add a blog post that links to your Medium article.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blog-title">Title *</Label>
                  <Input
                    id="blog-title"
                    placeholder="Enter blog post title"
                    value={blogForm.title}
                    onChange={(e) => setBlogForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog-category">Category</Label>
                  <Input
                    id="blog-category"
                    placeholder="e.g. Data Science, Tutorial"
                    value={blogForm.category}
                    onChange={(e) => setBlogForm((prev) => ({ ...prev, category: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-excerpt">Excerpt *</Label>
                <Textarea
                  id="blog-excerpt"
                  placeholder="Short description or excerpt of the blog post"
                  value={blogForm.excerpt}
                  onChange={(e) => setBlogForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blog-date">Date</Label>
                  <Input
                    id="blog-date"
                    placeholder="e.g. January 15, 2024"
                    value={blogForm.date}
                    onChange={(e) => setBlogForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog-readTime">Read Time</Label>
                  <Input
                    id="blog-readTime"
                    placeholder="e.g. 5 min read"
                    value={blogForm.readTime}
                    onChange={(e) => setBlogForm((prev) => ({ ...prev, readTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-url">Medium URL *</Label>
                <Input
                  id="blog-url"
                  type="url"
                  placeholder="https://medium.com/@tushar_datascience/..."
                  value={blogForm.url}
                  onChange={(e) => setBlogForm((prev) => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setBlogImageFile(e.target.files?.[0] || null)}
                    />
                    {blogImageFile && (
                      <p className="text-xs text-primary mt-1">Selected: {blogImageFile.name}</p>
                    )}
                  </div>
                  <Input
                    placeholder="Or paste image URL"
                    value={blogForm.imageUrl}
                    onChange={(e) => setBlogForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  />
                </div>
                {!blogImageFile && blogForm.imageUrl && (
                  <p className="text-xs text-muted-foreground">Current: {blogForm.imageUrl.substring(0, 40)}...</p>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="blog-featured"
                    checked={blogForm.featured}
                    onCheckedChange={(checked) => setBlogForm((prev) => ({ ...prev, featured: checked === true }))}
                  />
                  <Label htmlFor="blog-featured" className="text-sm font-normal cursor-pointer">
                    Mark as featured
                  </Label>
                </div>
                <Button onClick={handleSaveBlog} disabled={isSavingBlog}>
                  {isSavingBlog ? "Saving..." : editingBlog ? "Save changes" : "Add blog post"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Blog Order Section */}
      {blogPosts.length > 1 && (
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Arrange Blog Posts</h3>
            <Button size="sm" onClick={handleSaveBlogOrder}>
              Save Order
            </Button>
          </div>
          <div className="space-y-2">
            {blogPosts.map((blog, index) => (
              <div key={blog.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <span className="w-6 text-center text-sm text-muted-foreground">{index + 1}</span>
                <span className="flex-1 text-sm truncate">{blog.title}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleMoveBlogUp(index)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleMoveBlogDown(index)}
                  disabled={index === blogPosts.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {blogPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blog posts yet. Add your first blog post.</p>
        ) : (
          blogPosts.map((blog) => (
            <div key={blog.id} className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                {blog.imageUrl && (
                  <img 
                    src={blog.imageUrl} 
                    alt={blog.title} 
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={blog.featured ? "default" : "outline"}>
                      {blog.featured ? "Featured" : blog.category || "General"}
                    </Badge>
                    {blog.featured && <Badge variant="outline">{blog.category || "General"}</Badge>}
                  </div>
                  <p className="text-lg font-semibold">{blog.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{blog.excerpt}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {blog.date && <span>{blog.date}</span>}
                    {blog.readTime && <span>{blog.readTime}</span>}
                    {blog.url && (
                      <a
                        href={blog.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View on Medium →
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => openBlogDialog(blog)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDeleteBlog(blog.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );

  const renderCoursesSection = () => (
    <GlassCard className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div></div>
        <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openCourseDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCourse ? "Edit Course" : "Add Course"}</DialogTitle>
              <DialogDescription>
                Add a course that will be displayed on the Courses page.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Course Title *</Label>
                <Input
                  placeholder="e.g. Full-Stack Data Science with GenAI"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  rows={3}
                  placeholder="Brief description of the course..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Highlights (one per line)</Label>
                <Textarea
                  rows={4}
                  placeholder="Full-stack data science curriculum&#10;Hands-on labs&#10;Interview preparation"
                  value={courseForm.highlights}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, highlights: e.target.value }))}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Input
                    placeholder="e.g. Udemy, Coursera"
                    value={courseForm.platform}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, platform: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Platform Label</Label>
                  <Input
                    placeholder="e.g. Udemy · Lifetime access"
                    value={courseForm.platformLabel}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, platformLabel: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Course URL *</Label>
                  <Input
                    placeholder="https://udemy.com/course/..."
                    value={courseForm.courseUrl}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, courseUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price (optional)</Label>
                  <Input
                    placeholder="e.g. ₹499 or Free"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm((prev) => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCourseImageFile(e.target.files?.[0] || null)}
                />
                {courseImageFile && <p className="text-xs text-primary">Selected: {courseImageFile.name}</p>}
                {!courseImageFile && courseForm.imageUrl && (
                  <p className="text-xs text-muted-foreground">Current: {courseForm.imageUrl.substring(0, 40)}...</p>
                )}
                <Input
                  placeholder="Or paste image URL"
                  value={courseForm.imageUrl}
                  onChange={(e) => setCourseForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="course-featured"
                  checked={courseForm.featured}
                  onCheckedChange={(checked) => setCourseForm((prev) => ({ ...prev, featured: checked === true }))}
                />
                <Label htmlFor="course-featured" className="text-sm font-normal cursor-pointer">
                  Mark as featured
                </Label>
              </div>
              <Button onClick={handleSaveCourse} disabled={isSavingCourse} className="w-full">
                {isSavingCourse ? "Saving..." : editingCourse ? "Save Changes" : "Add Course"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No courses yet. Add your first course.
          </p>
        ) : (
          courses.map((course) => (
            <div key={course.id} className="border border-border rounded-lg p-4">
              <div className="flex items-start gap-4">
                {course.imageUrl && (
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {course.featured && <Badge>Featured</Badge>}
                    {course.platform && <Badge variant="outline">{course.platform}</Badge>}
                    {course.price && <Badge variant="secondary">{course.price}</Badge>}
                  </div>
                  <p className="text-lg font-semibold">{course.title}</p>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
                  {course.courseUrl && (
                    <a
                      href={course.courseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-2 inline-block"
                    >
                      View Course →
                    </a>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="icon" variant="outline" onClick={() => openCourseDialog(course)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDeleteCourse(course.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );

  const renderAboutSection = () => (
    <GlassCard className="p-8 space-y-6">
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              placeholder="Your name"
              value={aboutForm.name}
              onChange={(e) => setAboutForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Title / Role</Label>
            <Input
              placeholder="e.g. Data Scientist | Mentor | Educator"
              value={aboutForm.title}
              onChange={(e) => setAboutForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Avatar Image</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setAboutAvatarFile(e.target.files?.[0] || null)}
          />
          {aboutAvatarFile && <p className="text-xs text-primary">Selected: {aboutAvatarFile.name}</p>}
          {aboutForm.avatarUrl && (
            <div className="flex items-center gap-4">
              <img src={aboutForm.avatarUrl} alt="Current avatar" className="w-16 h-16 rounded-full object-cover" />
              <Input
                placeholder="Or paste image URL"
                value={aboutForm.avatarUrl}
                onChange={(e) => setAboutForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Story / Bio *</Label>
          <Textarea
            rows={6}
            placeholder="Write your story here..."
            value={aboutForm.story}
            onChange={(e) => setAboutForm((prev) => ({ ...prev, story: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Skills (comma-separated)</Label>
          <Input
            placeholder="Python, SQL, Machine Learning, Deep Learning, NLP"
            value={aboutForm.skills}
            onChange={(e) => setAboutForm((prev) => ({ ...prev, skills: e.target.value }))}
          />
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Experience Timeline</Label>
            <Button size="sm" variant="outline" onClick={addTimelineItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Entry
            </Button>
          </div>
          {aboutForm.timeline.map((item, index) => (
            <div key={index} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Entry {index + 1}</span>
                <Button size="icon" variant="ghost" onClick={() => removeTimelineItem(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Year (e.g. 2024)"
                  value={item.year}
                  onChange={(e) => updateTimelineItem(index, "year", e.target.value)}
                />
                <Input
                  placeholder="Title (e.g. Senior Data Scientist)"
                  value={item.title}
                  onChange={(e) => updateTimelineItem(index, "title", e.target.value)}
                />
                <Input
                  placeholder="Company"
                  value={item.company}
                  onChange={(e) => updateTimelineItem(index, "company", e.target.value)}
                />
                <Input
                  placeholder="Description"
                  value={item.desc}
                  onChange={(e) => updateTimelineItem(index, "desc", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Achievements</Label>
            <Button size="sm" variant="outline" onClick={addAchievementItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Achievement
            </Button>
          </div>
          {aboutForm.achievements.map((item, index) => (
            <div key={index} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Achievement {index + 1}</span>
                <Button size="icon" variant="ghost" onClick={() => removeAchievementItem(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Select
                  value={item.icon}
                  onValueChange={(value) => updateAchievementItem(index, "icon", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Icon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Award">Award</SelectItem>
                    <SelectItem value="Briefcase">Briefcase</SelectItem>
                    <SelectItem value="GraduationCap">GraduationCap</SelectItem>
                    <SelectItem value="Users">Users</SelectItem>
                    <SelectItem value="Code">Code</SelectItem>
                    <SelectItem value="Brain">Brain</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Value (e.g. 500+)"
                  value={item.value}
                  onChange={(e) => updateAchievementItem(index, "value", e.target.value)}
                />
                <Input
                  placeholder="Label (e.g. Students Mentored)"
                  value={item.label}
                  onChange={(e) => updateAchievementItem(index, "label", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleSaveAbout} disabled={isSavingAbout} className="w-full">
          {isSavingAbout ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save About Page"
          )}
        </Button>
      </div>
    </GlassCard>
  );

  const renderServicesSection = () => (
    <GlassCard className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div></div>
        <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openServiceDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
              <DialogDescription>
                Create or edit a service that will be displayed on the Services page.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service-icon">Icon</Label>
                  <Select
                    value={serviceForm.icon}
                    onValueChange={(value) => setServiceForm((prev) => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger id="service-icon">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Briefcase">Briefcase</SelectItem>
                      <SelectItem value="LineChart">LineChart</SelectItem>
                      <SelectItem value="Users">Users</SelectItem>
                      <SelectItem value="Lightbulb">Lightbulb</SelectItem>
                      <SelectItem value="Code">Code</SelectItem>
                      <SelectItem value="Brain">Brain</SelectItem>
                      <SelectItem value="BookOpen">BookOpen</SelectItem>
                      <SelectItem value="TrendingUp">TrendingUp</SelectItem>
                      <SelectItem value="Database">Database</SelectItem>
                      <SelectItem value="BarChart3">BarChart3</SelectItem>
                      <SelectItem value="Zap">Zap</SelectItem>
                      <SelectItem value="Target">Target</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-price">Price</Label>
                  <Input
                    id="service-price"
                    placeholder="e.g. Starting from ₹50,000"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-title">Title *</Label>
                <Input
                  id="service-title"
                  placeholder="e.g. Freelance Data Science"
                  value={serviceForm.title}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-description">Description *</Label>
                <Textarea
                  id="service-description"
                  placeholder="Short description of the service"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-features">Features (one per line) *</Label>
                <Textarea
                  id="service-features"
                  placeholder="Data analysis and visualization&#10;Machine learning model development&#10;Predictive analytics"
                  value={serviceForm.features}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, features: e.target.value }))}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">Enter each feature on a new line</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service-cta-label">CTA Button Label</Label>
                  <Input
                    id="service-cta-label"
                    placeholder="e.g. Get Started, Contact Us"
                    value={serviceForm.ctaLabel}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-cta-url">CTA Button URL (optional)</Label>
                  <Input
                    id="service-cta-url"
                    type="url"
                    placeholder="https://"
                    value={serviceForm.ctaUrl}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, ctaUrl: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={handleSaveService} disabled={isSavingService}>
                {isSavingService ? "Saving..." : editingService ? "Save changes" : "Add service"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No services yet. Add your first service.</p>
        ) : (
          services.map((service) => {
            const IconComponent = {
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
            }[service.icon] || Briefcase;
            return (
              <div key={service.id} className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-lg font-semibold">{service.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                    {service.price && (
                      <p className="text-sm font-semibold text-primary mb-2">{service.price}</p>
                    )}
                    <ul className="text-xs text-muted-foreground space-y-1 mb-2">
                      {service.features.slice(0, 3).map((feature, i) => (
                        <li key={i}>• {feature}</li>
                      ))}
                      {service.features.length > 3 && (
                        <li>... and {service.features.length - 3} more</li>
                      )}
                    </ul>
                    {service.ctaUrl && (
                      <a
                        href={service.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        CTA: {service.ctaLabel || "Get Started"} →
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => openServiceDialog(service)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="destructive" onClick={() => handleDeleteService(service.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </GlassCard>
  );

  const renderTestimonialsSection = () => (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Testimonials</h2>
              <p className="text-sm text-muted-foreground">
                Collect social proof to showcase on the homepage. {testimonials.length} testimonial
                {testimonials.length !== 1 && "s"} published.
              </p>
            </div>
            <Button onClick={() => openTestimonialDialog()} className="self-start sm:self-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Testimonial
            </Button>
          </div>

          {testimonials.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
              No testimonials added yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {testimonials.map((testimonial) => (
                <GlassCard key={testimonial.id} className="p-5 space-y-4 border border-border/60 h-full flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{testimonial.name}</p>
                      {(testimonial.role || testimonial.company) && (
                        <p className="text-sm text-muted-foreground">
                          {[testimonial.role, testimonial.company].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {testimonial.highlight && (
                        <p className="text-sm text-primary mt-2 font-medium">{testimonial.highlight}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => openTestimonialDialog(testimonial)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteTestimonial(testimonial.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground flex-1 whitespace-pre-wrap">{testimonial.message}</p>
                  {testimonial.avatarUrl && (
                    <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                      <img
                        src={testimonial.avatarUrl}
                        alt={`${testimonial.name} avatar`}
                        className="h-10 w-10 rounded-full object-cover border border-border"
                      />
                      <div>
                        <p className="text-sm font-medium">{testimonial.name}</p>
                        {(testimonial.role || testimonial.company) && (
                          <p className="text-xs text-muted-foreground">
                            {[testimonial.role, testimonial.company].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      <Dialog
        open={isTestimonialDialogOpen}
        onOpenChange={(open) => {
          setIsTestimonialDialogOpen(open);
          if (!open) {
            setEditingTestimonial(null);
            resetTestimonialForm();
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingTestimonial ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription>
              Testimonials appear on the homepage to build trust with new learners.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testimonial-name">Name</Label>
                <Input
                  id="testimonial-name"
                  value={testimonialForm.name}
                  onChange={(e) => setTestimonialForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Ananya Sharma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testimonial-role">Role</Label>
                <Input
                  id="testimonial-role"
                  value={testimonialForm.role}
                  onChange={(e) => setTestimonialForm((prev) => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g. Data Scientist @ Google"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-company">Company</Label>
              <Input
                id="testimonial-company"
                value={testimonialForm.company}
                onChange={(e) => setTestimonialForm((prev) => ({ ...prev, company: e.target.value }))}
                placeholder="e.g. Google"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-highlight">Short highlight</Label>
              <Input
                id="testimonial-highlight"
                value={testimonialForm.highlight}
                onChange={(e) => setTestimonialForm((prev) => ({ ...prev, highlight: e.target.value }))}
                placeholder="e.g. Cracked 3 FAANG offers"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-message">Feedback</Label>
              <Textarea
                id="testimonial-message"
                rows={5}
                value={testimonialForm.message}
                onChange={(e) => setTestimonialForm((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Describe their experience..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-avatar">Avatar URL (optional)</Label>
              <Input
                id="testimonial-avatar"
                type="url"
                value={testimonialForm.avatarUrl}
                onChange={(e) => setTestimonialForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                placeholder="https://images..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-linkedin">LinkedIn URL (optional)</Label>
              <Input
                id="testimonial-linkedin"
                type="url"
                value={testimonialForm.linkedinUrl}
                onChange={(e) => setTestimonialForm((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <Button onClick={handleSaveTestimonial} disabled={isSavingTestimonial} className="w-full">
              {isSavingTestimonial ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingTestimonial ? (
                "Update Testimonial"
              ) : (
                "Add Testimonial"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderUsersSection = () => (
    <GlassCard className="p-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div></div>
        <Input
          placeholder="Search by name or email..."
          className="w-full md:w-72"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          filteredUsers.map((user) => {
            const hasGlobalAccess = user.hasGlobalAccess || user.isPaid;
            const purchasedModules = user.purchasedModules || {};
            const purchasedModuleKeys = Object.keys(purchasedModules).filter(key => purchasedModules[key]);
            const hasAnyPayment = hasGlobalAccess || purchasedModuleKeys.length > 0;
            
            // Convert module pricing doc IDs to readable module names
            const purchasedModuleNames = purchasedModuleKeys.map(docId => 
              getModuleNameFromDocId(docId)
            );

            return (
              <div
                key={user.id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.createdAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Joined: {user.createdAt.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge 
                      variant={hasAnyPayment ? "default" : "outline"} 
                      className="uppercase tracking-wide"
                    >
                      {hasGlobalAccess ? "Global Access" : hasAnyPayment ? "Module Access" : "Free Access"}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleUserPaidStatus(user)}
                      disabled={updatingUserId === user.id}
                    >
                      {updatingUserId === user.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : user.isPaid ? (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Revoke Premium
                        </>
                      ) : (
                        <>
                          <Unlock className="mr-2 h-4 w-4" />
                          Grant Premium
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Payment Information */}
                {hasAnyPayment && (
                  <div className="pt-3 border-t border-border/50 space-y-2">
                    {hasGlobalAccess && (
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-primary text-primary-foreground">
                          Global Access
                        </Badge>
                        <span className="text-xs text-muted-foreground">Access to all modules</span>
                      </div>
                    )}
                    {purchasedModuleNames.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Purchased Modules:</p>
                        <div className="flex flex-wrap gap-2">
                          {purchasedModuleNames.map((moduleName, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {moduleName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Dialog for Premium Access Toggle */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {userToUpdate?.isPaid ? "Revoke Premium Access" : "Grant Premium Access"}
            </DialogTitle>
            <DialogDescription>
              {userToUpdate?.isPaid ? (
                <>
                  Are you sure you want to revoke premium access for <strong>{userToUpdate?.displayName || userToUpdate?.email}</strong>? 
                  They will lose access to premium content.
                </>
              ) : (
                <>
                  Are you sure you want to grant premium access to <strong>{userToUpdate?.displayName || userToUpdate?.email}</strong>? 
                  They will gain access to all premium content.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setUserToUpdate(null);
              }}
              disabled={updatingUserId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmToggleUserPaidStatus}
              disabled={updatingUserId !== null}
            >
              {updatingUserId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : userToUpdate?.isPaid ? (
                "Revoke Premium"
              ) : (
                "Grant Premium"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );

  const renderModuleOrderSection = () => {
    const handleMoveUp = (index: number) => {
      if (index === 0) return;
      const newOrder = [...moduleOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setModuleOrder(newOrder);
    };

    const handleMoveDown = (index: number) => {
      if (index === moduleOrder.length - 1) return;
      const newOrder = [...moduleOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setModuleOrder(newOrder);
    };

    const handleSaveOrder = async () => {
      setSavingModuleOrder(true);
      try {
        const orderDocRef = doc(db, "moduleOrder", "order");
        await setDoc(orderDocRef, {
          order: moduleOrder,
          updatedAt: serverTimestamp(),
        });
        toast({
          title: "Module order saved",
          description: "The new order will be reflected on the Interview Prep page.",
        });
      } catch (error: any) {
        toast({
          title: "Failed to save order",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        setSavingModuleOrder(false);
      }
    };

    return (
      <GlassCard className="p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Module Display Order</h2>
          <p className="text-sm text-muted-foreground">
            Drag modules up or down to change their display order on the Interview Prep page. Click "Save Order" to apply changes.
          </p>
        </div>

        {moduleOrder.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No modules found. Add questions with module titles first.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {moduleOrder.map((moduleTitle, index) => (
                <div
                  key={moduleTitle}
                  className="flex items-center gap-3 p-4 border border-border rounded-lg bg-background/50 hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-5 w-5" />
                    <span className="text-sm font-medium w-8 text-center">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{moduleTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Price: ₹{modulePricing[moduleTitle] ?? DEFAULT_MODULE_PRICE}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="h-8 w-8"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === moduleOrder.length - 1}
                      className="h-8 w-8"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveOrder}
                disabled={savingModuleOrder}
                className="bg-gradient-primary hover:shadow-glow-primary"
              >
                {savingModuleOrder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Layers className="mr-2 h-4 w-4" />
                    Save Order
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </GlassCard>
    );
  };

  const renderQuestionOrderSection = () => {
    // Get questions for selected module
    const moduleQuestions = selectedModuleForQuestionOrder
      ? questions
          .filter((q) => (q.title?.trim() || DEFAULT_TITLE) === selectedModuleForQuestionOrder)
          .sort((a, b) => {
            // Sort by order if available, otherwise by createdAt
            if (a.order !== undefined && b.order !== undefined) {
              return a.order - b.order;
            }
            if (a.order !== undefined) return -1;
            if (b.order !== undefined) return 1;
            // Fall back to createdAt
            if (a.createdAt && b.createdAt) {
              return a.createdAt.getTime() - b.createdAt.getTime();
            }
            return 0;
          })
      : [];

    // Get ordered questions based on local state or original order
    const getOrderedQuestions = () => {
      if (questionOrderMap[selectedModuleForQuestionOrder]) {
        return questionOrderMap[selectedModuleForQuestionOrder]
          .map((id) => moduleQuestions.find((q) => q.id === id))
          .filter(Boolean) as InterviewQuestion[];
      }
      return moduleQuestions;
    };

    const handleMoveToPosition = (currentIndex: number, newPosition: number) => {
      const currentOrdered = getOrderedQuestions();
      if (newPosition < 1 || newPosition > currentOrdered.length) return;
      if (currentIndex === newPosition - 1) return; // Same position
      
      const newOrder = [...currentOrdered];
      const [movedItem] = newOrder.splice(currentIndex, 1);
      newOrder.splice(newPosition - 1, 0, movedItem);
      
      setQuestionOrderMap((prev) => ({
        ...prev,
        [selectedModuleForQuestionOrder]: newOrder.map((q) => q.id),
      }));
    };

    const handleMoveQuestionUp = (index: number) => {
      if (index === 0) return;
      handleMoveToPosition(index, index); // Move to position = index (0-indexed becomes 1-indexed - 1)
    };

    const handleMoveQuestionDown = (index: number) => {
      const currentOrdered = getOrderedQuestions();
      if (index === currentOrdered.length - 1) return;
      handleMoveToPosition(index, index + 2); // Move to next position
    };

    const handleMoveToTop = (index: number) => {
      if (index === 0) return;
      handleMoveToPosition(index, 1);
    };

    const handleMoveToBottom = (index: number) => {
      const currentOrdered = getOrderedQuestions();
      if (index === currentOrdered.length - 1) return;
      handleMoveToPosition(index, currentOrdered.length);
    };

    const handleSaveQuestionOrder = async () => {
      if (!selectedModuleForQuestionOrder) return;
      
      setSavingQuestionOrder(true);
      try {
        // Get the current order from questionOrderMap or use moduleQuestions order
        const orderedIds = questionOrderMap[selectedModuleForQuestionOrder] || moduleQuestions.map((q) => q.id);
        
        // Update each question with its new order
        const updatePromises = orderedIds.map((questionId, index) => {
          const questionRef = doc(db, "interviewQuestions", questionId);
          return updateDoc(questionRef, { order: index });
        });
        
        await Promise.all(updatePromises);
        
        toast({
          title: "Question order saved",
          description: `Updated order for ${orderedIds.length} questions in "${selectedModuleForQuestionOrder}".`,
        });
      } catch (error: any) {
        toast({
          title: "Failed to save order",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        setSavingQuestionOrder(false);
      }
    };

    const orderedQuestions = getOrderedQuestions();

    return (
      <GlassCard className="p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Question Display Order</h2>
          <p className="text-sm text-muted-foreground">
            Select a module and reorder questions. Use the position input to move questions directly to any position,
            or use the arrow buttons. Click the double arrows to move to top/bottom.
          </p>
        </div>

        {/* Module Selector */}
        <div className="space-y-2">
          <Label>Select Module</Label>
          <Select
            value={selectedModuleForQuestionOrder}
            onValueChange={(value) => {
              setSelectedModuleForQuestionOrder(value);
              // Clear local order state when switching modules
              setQuestionOrderMap((prev) => {
                const newMap = { ...prev };
                delete newMap[value];
                return newMap;
              });
            }}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Choose a module..." />
            </SelectTrigger>
            <SelectContent>
              {uniqueTitles.map((title) => (
                <SelectItem key={title} value={title}>
                  {title} ({questions.filter((q) => (q.title?.trim() || DEFAULT_TITLE) === title).length} questions)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedModuleForQuestionOrder ? (
          <div className="text-center py-12">
            <GripVertical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Select a module to manage question order.</p>
          </div>
        ) : orderedQuestions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No questions in this module.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {orderedQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex items-center gap-3 p-4 border border-border rounded-lg bg-background/50 hover:bg-background transition-colors"
                >
                  {/* Position Input */}
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                    <Input
                      type="number"
                      min={1}
                      max={orderedQuestions.length}
                      value={index + 1}
                      onChange={(e) => {
                        const newPos = parseInt(e.target.value, 10);
                        if (!isNaN(newPos) && newPos >= 1 && newPos <= orderedQuestions.length) {
                          handleMoveToPosition(index, newPos);
                        }
                      }}
                      className="w-16 h-8 text-center text-sm font-medium"
                    />
                    <span className="text-xs text-muted-foreground">/ {orderedQuestions.length}</span>
                  </div>
                  
                  {/* Question Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {question.questionTitle || question.question?.substring(0, 50) || "Untitled"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={question.tier === "paid" ? "default" : "secondary"} className="text-xs">
                        {question.tier}
                      </Badge>
                      {question.difficulty && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            question.difficulty === "easy" && "border-green-500 text-green-500",
                            question.difficulty === "medium" && "border-yellow-500 text-yellow-500",
                            question.difficulty === "hard" && "border-red-500 text-red-500"
                          )}
                        >
                          {question.difficulty}
                        </Badge>
                      )}
                      {question.company && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CompanyLogo companyName={question.company} size={12} />
                          {question.company}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Move Controls */}
                  <div className="flex items-center gap-1">
                    {/* Move to Top */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveToTop(index)}
                      disabled={index === 0}
                      className="h-8 w-8"
                      title="Move to top"
                    >
                      <ChevronsUp className="h-4 w-4" />
                    </Button>
                    {/* Move Up */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleMoveQuestionUp(index)}
                      disabled={index === 0}
                      className="h-8 w-8"
                      title="Move up one"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    {/* Move Down */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleMoveQuestionDown(index)}
                      disabled={index === orderedQuestions.length - 1}
                      className="h-8 w-8"
                      title="Move down one"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    {/* Move to Bottom */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveToBottom(index)}
                      disabled={index === orderedQuestions.length - 1}
                      className="h-8 w-8"
                      title="Move to bottom"
                    >
                      <ChevronsDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSaveQuestionOrder}
                disabled={savingQuestionOrder}
                className="bg-gradient-primary hover:shadow-glow-primary"
              >
                {savingQuestionOrder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <GripVertical className="mr-2 h-4 w-4" />
                    Save Question Order
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </GlassCard>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return renderDashboardSection();
      case "questions":
        return renderQuestionsSection();
      case "theory-questions":
        return renderTheoryQuestionsSection();
      case "case-studies":
        return renderCaseStudiesSection();
      case "projects":
        return renderProjectsSection();
      case "blog":
        return renderBlogSection();
      case "courses":
        return renderCoursesSection();
      case "about":
        return renderAboutSection();
      case "services":
        return renderServicesSection();
      case "testimonials":
        return renderTestimonialsSection();
      case "users":
        return renderUsersSection();
      case "module-order":
        return renderModuleOrderSection();
      case "question-order":
        return renderQuestionOrderSection();
      default:
        return renderDashboardSection();
    }
  };

  // Sidebar content component (reusable for desktop and mobile)
  const SidebarContent = () => (
    <>
      {/* Logo/Header */}
      <div className="p-4 lg:p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
          <h2 className="text-lg lg:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Admin Panel
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">Site Control Center</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                if (isMobile) setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium text-sm lg:text-base">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:w-64 lg:bg-card lg:border-r lg:border-border lg:flex lg:flex-col lg:z-50">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Mobile Menu Button */}
          <div className="lg:hidden mb-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
          </div>
          
          <div className="mb-4 lg:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold">
              {navigationItems.find((item) => item.id === activeSection)?.label || "Dashboard"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {getSectionDescription(activeSection)}
            </p>
          </div>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;

