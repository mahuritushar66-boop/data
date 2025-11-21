import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Shield, ArrowLeft } from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_GLOBAL_PRICE,
  DEFAULT_MODULE_PRICE,
  GLOBAL_PRICING_DOC,
  MODULE_PRICING_COLLECTION,
  getModulePricingDocId,
} from "@/constants/pricing";

const PaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, currentUser } = useAuth();
  
  const moduleSlug = searchParams.get("module");
  const moduleTitle = moduleSlug ? decodeURIComponent(moduleSlug) : "";
  const modulePricingDocId = moduleTitle ? getModulePricingDocId(moduleTitle) : "";

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

  const [modulePrice, setModulePrice] = useState<number>(DEFAULT_MODULE_PRICE);
  const [globalPrice, setGlobalPrice] = useState<number>(DEFAULT_GLOBAL_PRICE);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"module" | "global" | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const hasGlobalAccess = Boolean(profile?.hasGlobalAccess || profile?.isPaid);
  const hasModuleAccess = Boolean(profile?.purchasedModules && profile.purchasedModules[modulePricingDocId]);

  useEffect(() => {
    if (!moduleTitle) {
      navigate("/interview-prep");
      return;
    }
    // If user is not logged in, show auth modal
    if (!currentUser) {
      setIsAuthModalOpen(true);
    }
  }, [moduleTitle, navigate, currentUser]);

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
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [toast]);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        if (modulePricingDocId) {
          const moduleDoc = await getDoc(doc(db, MODULE_PRICING_COLLECTION, modulePricingDocId));
          setModulePrice(moduleDoc.exists() ? moduleDoc.data().price : DEFAULT_MODULE_PRICE);
        }

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
    if (modulePricingDocId) {
      fetchPricing();
    }
  }, [modulePricingDocId, toast]);

  const handleCheckout = async (mode: "module" | "global") => {
    if (!currentUser) {
      toast({
        title: "Sign in required",
        description: "Please sign in to purchase premium access.",
        variant: "destructive",
      });
      navigate("/");
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
        title: "Payment system not ready",
        description: "Please wait for the payment system to load.",
        variant: "destructive",
      });
      return;
    }

    setPaymentMode(mode);
    const amount = mode === "module" ? modulePrice : globalPrice;

    try {
      const response = await fetch(`${API_BASE_URL}/api/razorpay/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount * 100, // Convert to paise
          currency: "INR",
          mode,
          moduleId: mode === "module" ? modulePricingDocId : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      const { orderId } = await response.json();

      const razorpayOptions = {
        key: RAZORPAY_KEY_ID,
        amount: amount * 100,
        currency: "INR",
        name: "BytesOfData",
        description: mode === "module" ? `Unlock ${moduleTitle}` : "Unlock All Modules",
        order_id: orderId,
        handler: async (response: any) => {
          try {
            const verifyResponse = await fetch(`${API_BASE_URL}/api/razorpay/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: currentUser.uid,
                mode,
                moduleId: mode === "module" ? modulePricingDocId : undefined,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error("Payment verification failed");
            }

            toast({
              title: "Payment successful!",
              description: mode === "module" ? `You now have access to ${moduleTitle}` : "You now have access to all modules!",
            });

            // Redirect back to module page
            navigate(`/interview-prep/module/${encodeURIComponent(moduleTitle)}`);
          } catch (error: any) {
            console.error("Verification error:", error);
            toast({
              title: "Payment verification failed",
              description: error.message || "Please contact support.",
              variant: "destructive",
            });
          } finally {
            setPaymentMode(null);
          }
        },
        prefill: {
          email: currentUser.email || "",
          name: currentUser.displayName || "",
        },
        theme: {
          color: "#6366f1",
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

  if (!moduleTitle) {
    return null;
  }

  return (
    <div className="min-h-screen pb-20 pt-4">
      <div className="container mx-auto px-2 lg:px-6 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" className="px-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <GlassCard className="p-6 md:p-8 border-primary/30 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Premium Access
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Unlock premium questions for this module or get access to every module at once.
              </p>
            </div>
          </div>

          {!currentUser ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">Please sign in to view pricing options.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* MODULE ACCESS */}
              <div className="rounded-xl border border-border/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Unlock {moduleTitle}</p>
                    <p className="text-xs text-muted-foreground">Access premium questions in this module.</p>
                  </div>
                  <span className="text-2xl font-bold">₹{modulePrice}</span>
                </div>

                <Button
                  disabled={paymentMode === "module" || pricingLoading || hasModuleAccess}
                  onClick={() => handleCheckout("module")}
                  className="w-full"
                >
                {paymentMode === "module" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : hasModuleAccess ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Already Owned
                  </>
                ) : (
                  "Unlock module"
                )}
              </Button>

              {hasModuleAccess && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> You already own this module.
                </p>
              )}
            </div>

            {/* GLOBAL ACCESS */}
            <div className="rounded-xl border border-border/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Unlock All Modules</p>
                  <p className="text-xs text-muted-foreground">Full access to every premium question.</p>
                </div>
                <span className="text-2xl font-bold text-primary">₹{globalPrice}</span>
              </div>

              <Button
                variant="secondary"
                disabled={paymentMode === "global" || pricingLoading || hasGlobalAccess}
                onClick={() => handleCheckout("global")}
                className="w-full"
              >
                {paymentMode === "global" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : hasGlobalAccess ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Already Owned
                  </>
                ) : (
                  "Unlock all modules"
                )}
              </Button>

              {hasGlobalAccess && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> You already unlocked all modules.
                </p>
              )}
            </div>
          </div>
          )}
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

export default PaymentPage;

