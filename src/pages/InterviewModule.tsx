// --------------- FULL WORKING FILE WITH FIXED RECEIPT -----------------

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import CompanyLogo from "@/components/CompanyLogo";
import AuthModal from "@/components/AuthModal";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DEFAULT_GLOBAL_PRICE,
  DEFAULT_MODULE_PRICE,
  DEFAULT_MODULE_TITLE,
  GLOBAL_PRICING_DOC,
  MODULE_PRICING_COLLECTION,
  getModulePricingDocId,
} from "@/constants/pricing";

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
};

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

const DEFAULT_TITLE = DEFAULT_MODULE_TITLE;

const InterviewModule = () => {
  const { moduleSlug } = useParams<{ moduleSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, currentUser } = useAuth();

  const moduleTitle = decodeURIComponent(moduleSlug ?? DEFAULT_TITLE) || DEFAULT_TITLE;
  const modulePricingDocId = getModulePricingDocId(moduleTitle);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());
  const [modulePrice, setModulePrice] = useState<number>(DEFAULT_MODULE_PRICE);
  const [globalPrice, setGlobalPrice] = useState<number>(DEFAULT_GLOBAL_PRICE);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"module" | "global" | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const hasGlobalAccess = Boolean(profile?.hasGlobalAccess || profile?.isPaid);
  const hasModuleAccess = Boolean(profile?.purchasedModules && profile.purchasedModules[modulePricingDocId]);
  const hasAnyPremiumAccess = hasGlobalAccess || hasModuleAccess;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [moduleSlug]);

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    script.onerror = () => {
      toast({
        title: "Unable to load Razorpay",
        description: "Please check your network connection and try again.",
        variant: "destructive",
      });
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [toast]);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const moduleDoc = await getDoc(doc(db, MODULE_PRICING_COLLECTION, modulePricingDocId));
        setModulePrice(moduleDoc.exists() ? moduleDoc.data().price : DEFAULT_MODULE_PRICE);

        const globalDoc = await getDoc(doc(db, MODULE_PRICING_COLLECTION, GLOBAL_PRICING_DOC));
        setGlobalPrice(globalDoc.exists() ? globalDoc.data().price : DEFAULT_GLOBAL_PRICE);
      } catch (error: any) {
        console.error("Pricing error:", error);
        toast({
          title: "Unable to load pricing",
          description: error.message || "Using default pricing values.",
        });
      } finally {
        setPricingLoading(false);
      }
    };
    fetchPricing();
  }, [modulePricingDocId, toast]);

  useEffect(() => {
    const questionQuery = query(collection(db, "interviewQuestions"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      questionQuery,
      (snapshot) => {
        const filtered = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              question: data.question,
              answer: data.answer,
              tier: data.tier ?? "free",
              createdAt: data.createdAt?.toDate?.(),
              title: data.title,
              questionTitle: data.questionTitle,
              expectedOutput: data.expectedOutput,
              difficulty: data.difficulty,
              company: data.company,
            };
          })
          .filter((item) => (item.title?.trim() || DEFAULT_TITLE) === moduleTitle);

        setQuestions(filtered);
        setLoading(false);
      },
      (error) => {
        console.error("Firebase error:", error);
        toast({
          title: "Unable to load questions",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [moduleTitle, toast]);

  useEffect(() => {
    if (!currentUser) {
      setCompletedQuestions(new Set());
      return;
    }

    const userSubmissionsQuery = query(collection(db, "userQuestionSubmissions"), orderBy("completedAt", "desc"));

    const unsubscribe = onSnapshot(userSubmissionsQuery, (snapshot) => {
      const completed = new Set<string>();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.userId === currentUser.uid && data.status === "completed") {
          completed.add(data.questionId);
        }
      });
      setCompletedQuestions(completed);
    });

    return unsubscribe;
  }, [currentUser]);

  const companyOptions = useMemo(() => {
    const values = new Set<string>();
    questions.forEach((q) => {
      if (q.company) {
        values.add(q.company);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [questions]);

  const hasCompanyless = useMemo(() => questions.some((q) => !q.company), [questions]);

  const difficultyOptions = useMemo(() => {
    const values = new Set<string>();
    questions.forEach((q) => {
      if (q.difficulty) {
        values.add(q.difficulty);
      }
    });
    return Array.from(values);
  }, [questions]);

  const hasDifficultyless = useMemo(() => questions.some((q) => !q.difficulty), [questions]);

  const filteredQuestions = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return questions.filter((question) => {
      const normalizedTitle = (question.questionTitle || "Untitled Question").toLowerCase();
      const matchesSearch = !search || normalizedTitle.includes(search);
      const matchesCompany =
        companyFilter === "all" ||
        (question.company ? question.company === companyFilter : companyFilter === "none");
      const matchesDifficulty =
        difficultyFilter === "all" ||
        (question.difficulty ? question.difficulty === difficultyFilter : difficultyFilter === "none");
      const matchesTier = tierFilter === "all" || question.tier === tierFilter;

      const isLocked = question.tier === "paid" && !hasAnyPremiumAccess;
      const isCompleted = completedQuestions.has(question.id);
      const derivedStatus = isLocked ? "locked" : isCompleted ? "completed" : "available";
      const matchesStatus = statusFilter === "all" || derivedStatus === statusFilter;

      return matchesSearch && matchesCompany && matchesDifficulty && matchesTier && matchesStatus;
    });
  }, [questions, searchTerm, companyFilter, difficultyFilter, tierFilter, statusFilter, hasAnyPremiumAccess, completedQuestions]);

  const handleQuestionClick = (question: InterviewQuestion) => {
    // If it's a paid question and user doesn't have access
    if (question.tier === "paid" && !hasAnyPremiumAccess) {
      // Check if user is logged in
      if (!currentUser) {
        // Show auth modal if not logged in
        setIsAuthModalOpen(true);
        return;
      }
      // If logged in but no access, redirect to payment page
      navigate(`/payment?module=${encodeURIComponent(moduleTitle)}`);
      return;
    }
    // Navigate to question if free or user has access
    navigate(`/interview-prep/question/${question.id}`);
  };

  const handleCheckout = async (mode: "module" | "global") => {
    if (!currentUser) {
      toast({
        title: "Sign in required",
        description: "Please sign in to purchase premium access.",
        variant: "destructive",
      });
      return;
    }
    if (!RAZORPAY_KEY_ID) {
      toast({
        title: "Missing Razorpay key",
        description: "Set VITE_RAZORPAY_KEY_ID in your environment variables.",
        variant: "destructive",
      });
      return;
    }
    if (!razorpayReady) {
      toast({
        title: "Payment not ready",
        description: "Razorpay checkout failed to load.",
        variant: "destructive",
      });
      return;
    }

    const amount = mode === "module" ? modulePrice : globalPrice;

    setPaymentMode(mode);

    try {
      const createOrderResponse = await fetch(`${API_BASE_URL}/api/razorpay/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "INR",

          // --------------- FIXED RECEIPT (under 40 chars) -----------------
          receipt: `r_${Date.now()}`,
        }),
      });

      const orderData = await createOrderResponse.json();

      if (!createOrderResponse.ok || !orderData?.id) {
        throw new Error(orderData?.message || "Failed to initialize payment.");
      }

      const razorpayOptions = {
        key: RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Interview Prep Hub",
        description: mode === "module" ? `Unlock ${moduleTitle}` : "Unlock all modules",
        order_id: orderData.id,
        prefill: {
          name: currentUser.displayName || currentUser.email || "Learner",
          email: currentUser.email || undefined,
        },
        theme: {
          color: "#6366f1",
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/razorpay/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error("Payment verification failed.");
            }

            const userRef = doc(db, "users", currentUser.uid);

            if (mode === "module") {
              await setDoc(
                userRef,
                {
                  [`purchasedModules.${modulePricingDocId}`]: true,
                  updatedAt: serverTimestamp(),
                },
                { merge: true },
              );
            } else {
              await setDoc(
                userRef,
                {
                  hasGlobalAccess: true,
                  isPaid: true,
                  updatedAt: serverTimestamp(),
                },
                { merge: true },
              );
            }

            toast({
              title: "Payment successful",
              description: mode === "module" ? `${moduleTitle} unlocked!` : "All modules unlocked!",
            });
          } catch (error: any) {
            toast({
              title: "Verification failed",
              description: error.message,
              variant: "destructive",
            });
          } finally {
            setPaymentMode(null);
          }
        },
      };

      const razorpay = new window.Razorpay!(razorpayOptions);
      razorpay.open();
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment error",
        description: error.message || "Unable to start payment.",
        variant: "destructive",
      });
      setPaymentMode(null);
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-4">
      <div className="container mx-auto px-2 lg:px-6 space-y-8 max-w-[95%] lg:max-w-7xl xl:max-w-[1600px]">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.4em] text-primary font-semibold">Module</p>
          <h1 className="text-4xl font-bold">{moduleTitle}</h1>
          <p className="text-muted-foreground">
            {questions.length} curated interview question{questions.length !== 1 && "s"} covering real whiteboard challenges and take-home assignments.
          </p>
        </div>

        {/* Questions Table */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-2xl font-semibold">Questions</h2>
              <p className="text-sm text-muted-foreground">
                Showing {filteredQuestions.length} of {questions.length} question{questions.length !== 1 && "s"}
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Company</p>
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All companies</SelectItem>
                    {hasCompanyless && <SelectItem value="none">No company info</SelectItem>}
                    {companyOptions.map((company) => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Difficulty</p>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All difficulties</SelectItem>
                    {hasDifficultyless && <SelectItem value="none">No difficulty info</SelectItem>}
                    {difficultyOptions.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Access type</p>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All access types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Status</p>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Available</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredQuestions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="text-center text-muted-foreground py-6">
                        No questions match your filters.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {filteredQuestions.map((question) => {
                  const isCompleted = completedQuestions.has(question.id);
                  const isLocked = question.tier === "paid" && !hasAnyPremiumAccess;

                  return (
                    <TableRow key={question.id} className="hover:bg-muted/50">
                      <TableCell>
                        {question.company ? (
                          <Badge variant="secondary" className="gap-1.5">
                            <CompanyLogo companyName={question.company} size={12} />
                            {question.company}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell
                        className={`font-medium ${
                          isLocked
                            ? "text-muted-foreground cursor-not-allowed"
                            : "cursor-pointer hover:text-primary hover:underline"
                        }`}
                        onClick={() => handleQuestionClick(question)}
                      >
                        {question.questionTitle || "Untitled Question"}
                        {question.tier === "paid" && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Premium
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        {question.difficulty ? (
                          <Badge
                            variant="outline"
                            className={`gap-1.5 ${
                              question.difficulty === "easy"
                                ? "border-green-500/50 text-green-500 bg-green-500/10"
                                : question.difficulty === "medium"
                                ? "border-yellow-500/50 text-yellow-500 bg-yellow-500/10"
                                : "border-red-500/50 text-red-500 bg-red-500/10"
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-current" />
                            {question.difficulty[0].toUpperCase() + question.difficulty.slice(1)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {isLocked ? (
                          <Badge variant="outline" className="gap-1.5 border-red-500/40 text-red-500">
                            <Lock className="h-3 w-3" />
                            Locked
                          </Badge>
                        ) : isCompleted ? (
                          <Badge
                            variant="default"
                            className="gap-1.5 bg-green-500/20 text-green-500 border-green-500/50"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </GlassCard>
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultMode="login"
      />
    </div>
  );
};

export default InterviewModule;
