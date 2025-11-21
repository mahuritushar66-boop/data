import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout, profile, currentUser, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (currentUser && profile?.isAdmin) {
      const redirectPath = location.state?.from?.pathname || "/admin";
      navigate(redirectPath, { replace: true });
    }
  }, [currentUser, profile, loading, navigate, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Trim email and password to avoid whitespace issues
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    try {
      const user = await login(trimmedEmail, trimmedPassword);
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const isAdmin = userDoc.exists() ? userDoc.data().isAdmin : false;
      if (!isAdmin) {
        await logout();
        setError("This account does not have admin access.");
      } else {
        const redirectPath = location.state?.from?.pathname || "/admin";
        navigate(redirectPath, { replace: true });
      }
    } catch (err: any) {
      console.error("Login error:", err);
      // Get user-friendly error message
      let errorMessage = "Failed to log in. Please try again.";
      
      // Check for Firebase error code
      const errorCode = err?.code || err?.error?.code;
      
      if (errorCode) {
        switch (errorCode) {
          case "auth/user-not-found":
            errorMessage = "No account found with this email address.";
            break;
          case "auth/wrong-password":
            errorMessage = "Incorrect password. Please try again.";
            break;
          case "auth/invalid-credential":
            errorMessage = "Invalid email or password. Please check your credentials and try again.";
            break;
          case "auth/invalid-email":
            errorMessage = "Invalid email address format.";
            break;
          case "auth/user-disabled":
            errorMessage = "This account has been disabled.";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many failed attempts. Please try again later.";
            break;
          case "auth/operation-not-allowed":
            errorMessage = "Email/password authentication is not enabled. Please contact support.";
            break;
          case "auth/network-request-failed":
            errorMessage = "Network error. Please check your connection and try again.";
            break;
          default:
            errorMessage = err?.message || err?.error?.message || "Failed to log in. Please check your credentials and try again.";
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-20 px-4">
      <div className="w-full max-w-md">
        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary h-12 w-12 mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-primary bg-clip-text text-transparent">Admin Portal</span>
            </h1>
            <p className="text-muted-foreground">Sign in with your admin credentials to continue.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  className="pl-10 bg-background/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 bg-background/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Access Admin Dashboard"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Need help? Contact the site owner to request admin credentials.
          </p>
          <Button
            variant="ghost"
            className="mt-4 w-full text-primary hover:text-primary/80"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to main site
          </Button>
        </GlassCard>
      </div>
    </div>
  );
};

export default AdminLogin;

