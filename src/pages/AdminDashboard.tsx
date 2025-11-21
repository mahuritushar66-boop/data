import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, LogOut, Plus, Edit, Trash2, Lock, Unlock, Briefcase, LineChart, Users, Lightbulb, Code, Brain, BookOpen, TrendingUp, Database, BarChart3, Zap, Target, LayoutDashboard, FileText, FolderOpen, Newspaper, Settings, UserCheck, Loader2, Layers, Menu, Quote } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
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
};

type ManagedUser = {
  id: string;
  displayName?: string;
  email?: string;
  isPaid?: boolean;
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
  category: string;
  techStack: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  badge?: string;
  coverEmoji?: string;
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
type AdminSection = "questions" | "case-studies" | "projects" | "blog" | "services" | "users" | "testimonials";

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
  const [activeSection, setActiveSection] = useState<AdminSection>("questions");
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
  const [userSearch, setUserSearch] = useState("");
  const [questionSearch, setQuestionSearch] = useState("");
  const [titleSearchOpen, setTitleSearchOpen] = useState(false);
  const [expectedOutputHelperOpen, setExpectedOutputHelperOpen] = useState(false);
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
    category: "",
    techStack: "",
    ctaLabel: "",
    ctaUrl: "",
    badge: "",
    coverEmoji: "",
  });
  const [projectFile, setProjectFile] = useState<File | null>(null);
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
  });
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
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapped = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          displayName: data.displayName || "Unknown user",
          email: data.email,
          isPaid: data.isPaid ?? false,
          createdAt: data.createdAt?.toDate?.(),
        } as ManagedUser;
      });
      setUsers(mapped);
    });
    return unsubscribe;
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
            category: data.category || "Project",
            techStack: Array.isArray(data.techStack) ? data.techStack : [],
            ctaLabel: data.ctaLabel,
            ctaUrl: data.ctaUrl,
            badge: data.badge,
            coverEmoji: data.coverEmoji,
          } as ProjectResource;
        }),
      );
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "blogPosts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBlogPosts(
        snapshot.docs.map((docSnap) => {
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
          } as BlogPost;
        }),
      );
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

  // Get unique titles for combobox
  const uniqueTitles = useMemo(() => {
    const titles = new Set<string>();
    questions.forEach((q) => {
      if (q.title?.trim()) {
        titles.add(q.title.trim());
      }
    });
    return Array.from(titles).sort();
  }, [questions]);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    if (!questionSearch.trim()) return questions;
    const term = questionSearch.toLowerCase();
    return questions.filter((q) => {
      return (
        q.title?.toLowerCase().includes(term) ||
        q.question?.toLowerCase().includes(term) ||
        q.answer?.toLowerCase().includes(term) ||
        q.company?.toLowerCase().includes(term) ||
        q.difficulty?.toLowerCase().includes(term)
      );
    });
  }, [questionSearch, questions]);

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
      setProjectForm({
        title: project.title,
        description: project.description,
        category: project.category,
        techStack: project.techStack.join(", "),
        ctaLabel: project.ctaLabel || "",
        ctaUrl: project.ctaUrl || "",
        badge: project.badge || "",
        coverEmoji: project.coverEmoji || "",
      });
      setProjectFile(null);
    } else {
      setEditingProject(null);
      setProjectForm({
        title: "",
        description: "",
        category: "",
        techStack: "",
        ctaLabel: "",
        ctaUrl: "",
        badge: "",
        coverEmoji: "",
      });
      setProjectFile(null);
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
    if (!projectForm.title.trim() || !projectForm.description.trim() || !projectForm.category.trim()) {
      toast({
        title: "Missing information",
        description: "Title, description, and category are required.",
        variant: "destructive",
      });
      return;
    }

    const techStack = projectForm.techStack
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    let ctaUrl = projectForm.ctaUrl.trim();
    let ctaLabel = projectForm.ctaLabel.trim() || (projectFile ? "Download" : "");

    setIsSavingProject(true);
    try {
      if (projectFile) {
        const fileRef = ref(storage, `projects/${Date.now()}_${projectFile.name}`);
        await uploadBytes(fileRef, projectFile);
        ctaUrl = await getDownloadURL(fileRef);
        if (!ctaLabel) {
          ctaLabel = "Download";
        }
      }

      if (!ctaUrl) {
        toast({
          title: "Missing download link",
          description: "Provide a file or a download URL.",
          variant: "destructive",
        });
        setIsSavingProject(false);
        return;
      }

      if (editingProject) {
        await updateDoc(doc(db, "projects", editingProject.id), {
          ...projectForm,
          techStack,
          ctaUrl,
          ctaLabel,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Project updated" });
      } else {
        await addDoc(collection(db, "projects"), {
          ...projectForm,
          techStack,
          ctaUrl,
          ctaLabel,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Project added" });
      }
      setIsProjectDialogOpen(false);
      setEditingProject(null);
      setProjectFile(null);
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
      });
    }
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
      if (editingBlog) {
        await updateDoc(doc(db, "blogPosts", editingBlog.id), {
          title: blogForm.title.trim(),
          excerpt: blogForm.excerpt.trim(),
          category: blogForm.category.trim() || "General",
          readTime: blogForm.readTime.trim() || undefined,
          date: blogForm.date.trim() || undefined,
          featured: blogForm.featured,
          url: blogForm.url.trim(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Blog post updated" });
      } else {
        await addDoc(collection(db, "blogPosts"), {
          title: blogForm.title.trim(),
          excerpt: blogForm.excerpt.trim(),
          category: blogForm.category.trim() || "General",
          readTime: blogForm.readTime.trim() || undefined,
          date: blogForm.date.trim() || undefined,
          featured: blogForm.featured,
          url: blogForm.url.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Blog post added" });
      }
      setIsBlogDialogOpen(false);
      setEditingBlog(null);
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

  const navigationItems = [
    { id: "questions" as AdminSection, label: "Interview Questions", icon: FileText },
    { id: "case-studies" as AdminSection, label: "Case Studies", icon: FolderOpen },
    { id: "projects" as AdminSection, label: "Projects", icon: Briefcase },
    { id: "blog" as AdminSection, label: "Blog Posts", icon: Newspaper },
    { id: "services" as AdminSection, label: "Services", icon: Settings },
    { id: "testimonials" as AdminSection, label: "Testimonials", icon: Quote },
    { id: "users" as AdminSection, label: "Learner Access", icon: UserCheck },
  ];

  const getSectionDescription = (section: AdminSection): string => {
    switch (section) {
      case "questions":
        return "Create, edit, or remove questions from the public repository.";
      case "case-studies":
        return "Publish detailed case studies to showcase real-world projects.";
      case "projects":
        return "Upload project resources so users can download them.";
      case "blog":
        return "Manage blog posts that link to your Medium articles.";
      case "services":
        return "Manage services that appear on the Services page.";
      case "testimonials":
        return "Collect and curate learner testimonials shown on the homepage.";
      case "users":
        return "Toggle premium access for any user after payment confirmation.";
      default:
        return "";
    }
  };

  // Define render functions before renderContent
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
          <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <div className="p-6 pb-4 flex-shrink-0 border-b border-border">
              <DialogHeader>
                <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
                <DialogDescription>Provide the prompt, answer, and whether it is free or premium.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="space-y-4 overflow-y-auto flex-1 px-6 py-4 custom-scrollbar">
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
              {(questionForm.title?.toLowerCase().includes("sql") || questionForm.title?.toLowerCase().includes("mysql")) && (
                <div className="space-y-2">
                  <Label htmlFor="sqlTableNames">SQL Table Names (optional)</Label>
                  <Input
                    id="sqlTableNames"
                    placeholder="e.g., customers, orders, products"
                    value={questionForm.sqlTableNames}
                    onChange={(e) => setQuestionForm((prev) => ({ ...prev, sqlTableNames: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of table names used in this SQL question. These will be used to create tables in the compiler. If not specified, table names will be extracted from the question text or JSON.
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
                  {(questionForm.title?.toLowerCase().includes("sql") || questionForm.title?.toLowerCase().includes("mysql")) && (
                    <Collapsible open={expectedOutputHelperOpen} onOpenChange={setExpectedOutputHelperOpen}>
                      <CollapsibleTrigger asChild>
                        <Button type="button" variant="ghost" size="sm" className="h-auto py-1 text-xs">
                          {expectedOutputHelperOpen ? "Hide" : "Show"} SQL Format Helper
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
                    (questionForm.title?.toLowerCase().includes("sql") || questionForm.title?.toLowerCase().includes("mysql"))
                      ? 'JSON format: {"columns": ["col1", "col2"], "values": [[val1, val2], [val3, val4]]}'
                      : 'For Python/JavaScript: exact output text. For SQL: JSON format with columns and values arrays.'
                  }
                  value={questionForm.expectedOutput}
                  onChange={(e) => setQuestionForm((prev) => ({ ...prev, expectedOutput: e.target.value }))}
                  rows={4}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  {((questionForm.title?.toLowerCase().includes("sql") || questionForm.title?.toLowerCase().includes("mysql"))) ? (
                    <>
                      <strong>SQL/MySQL:</strong> Provide JSON with <code className="bg-background/60 px-1 py-0.5 rounded">columns</code> and <code className="bg-background/60 px-1 py-0.5 rounded">values</code> arrays matching the table structure. Click "Show SQL Format Helper" above for examples.
                    </>
                  ) : (
                    <>
                      <strong>Python/JavaScript:</strong> Provide the exact expected output text. <strong>SQL/MySQL:</strong> Provide JSON with columns and values arrays. This will be used to validate user solutions. Leave empty if validation is not needed.
                    </>
                  )}
                </p>
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
      </div>

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
      </GlassCard>
    </div>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProject ? "Edit Project" : "Publish Project"}</DialogTitle>
              <DialogDescription>Provide resource details and download link.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={projectForm.title}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="EDA Template Notebook"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={projectForm.category}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="Datasets, Templates, Guides…"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Short description of the resource."
                />
              </div>
              <div className="space-y-2">
                <Label>Tech stack / tags (comma separated)</Label>
                <Textarea
                  rows={2}
                  value={projectForm.techStack}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, techStack: e.target.value }))}
                  placeholder="Python, SQL, Streamlit"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CTA Label</Label>
                  <Input
                    value={projectForm.ctaLabel}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                    placeholder="Download"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA URL</Label>
                  <Input
                    value={projectForm.ctaUrl}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, ctaUrl: e.target.value }))}
                    placeholder="https://"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Badge (optional)</Label>
                  <Input
                    value={projectForm.badge}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, badge: e.target.value }))}
                    placeholder="New, Free, Pro…"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cover Emoji (optional)</Label>
                  <Input
                    value={projectForm.coverEmoji}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, coverEmoji: e.target.value }))}
                    placeholder="📦"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Upload file (optional)</Label>
                <Input
                  type="file"
                  accept=".zip,.pdf,.ipynb,.py,.csv,.xlsx,.txt,.ppt,.pptx"
                  onChange={(e) => setProjectFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Uploading a file will automatically generate the download link.
                </p>
                {projectFile && (
                  <p className="text-xs text-primary">Selected: {projectFile.name}</p>
                )}
              </div>
              <Button onClick={handleSaveProject} disabled={isSavingProject}>
                {isSavingProject ? "Saving..." : editingProject ? "Save changes" : "Publish project"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects published yet.</p>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="border border-border rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">{project.category}</p>
                  <p className="text-lg font-semibold">{project.title}</p>
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => openProjectDialog(project)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDeleteProject(project.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {project.techStack.map((tech) => (
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingBlog ? "Edit Blog Post" : "Add Blog Post"}</DialogTitle>
              <DialogDescription>
                Add a blog post that links to your Medium article. The URL should point to your Medium post.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
                <Label htmlFor="blog-excerpt">Excerpt *</Label>
                <Textarea
                  id="blog-excerpt"
                  placeholder="Short description or excerpt of the blog post"
                  value={blogForm.excerpt}
                  onChange={(e) => setBlogForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blog-category">Category</Label>
                  <Input
                    id="blog-category"
                    placeholder="e.g. Data Science, Tutorial, Career"
                    value={blogForm.category}
                    onChange={(e) => setBlogForm((prev) => ({ ...prev, category: e.target.value }))}
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
                <Label htmlFor="blog-date">Date</Label>
                <Input
                  id="blog-date"
                  placeholder="e.g. January 15, 2024"
                  value={blogForm.date}
                  onChange={(e) => setBlogForm((prev) => ({ ...prev, date: e.target.value }))}
                />
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
                <p className="text-xs text-muted-foreground">
                  Link to your Medium article. Example: https://medium.com/@tushar_datascience/article-title
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="blog-featured"
                  checked={blogForm.featured}
                  onCheckedChange={(checked) => setBlogForm((prev) => ({ ...prev, featured: checked === true }))}
                />
                <Label htmlFor="blog-featured" className="text-sm font-normal cursor-pointer">
                  Mark as featured (will appear in Featured section)
                </Label>
              </div>
              <Button onClick={handleSaveBlog} disabled={isSavingBlog}>
                {isSavingBlog ? "Saving..." : editingBlog ? "Save changes" : "Add blog post"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {blogPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blog posts yet. Add your first blog post.</p>
        ) : (
          blogPosts.map((blog) => (
            <div key={blog.id} className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
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
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <p className="font-semibold">{user.displayName}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={user.isPaid ? "default" : "outline"} className="uppercase tracking-wide">
                  {user.isPaid ? "Paid Access" : "Free Access"}
                </Badge>
                <Button 
                  variant="outline" 
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
          ))
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

  const renderContent = () => {
    switch (activeSection) {
      case "questions":
        return renderQuestionsSection();
      case "case-studies":
        return renderCaseStudiesSection();
      case "projects":
        return renderProjectsSection();
      case "blog":
        return renderBlogSection();
      case "services":
        return renderServicesSection();
      case "testimonials":
        return renderTestimonialsSection();
      case "users":
        return renderUsersSection();
      default:
        return renderQuestionsSection();
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

