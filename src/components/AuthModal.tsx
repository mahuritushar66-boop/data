import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getAnalyticsInstance } from "@/lib/firebase";
import { logEvent } from "firebase/analytics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import GlassCard from "@/components/GlassCard";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "login" | "signup";
}

const AuthModal = ({ open, onOpenChange, defaultMode = "login" }: AuthModalProps) => {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const { signup, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      const analytics = getAnalyticsInstance();
      if (analytics) {
        logEvent(analytics, "login", { method: "email" });
      }
      // Close modal on successful login
      onOpenChange(false);
      loginForm.reset();
    } catch (error: any) {
      console.error("Login error:", error);
      // Don't close modal on error - let user see the error message
    } finally {
      setIsLoading(false);
    }
  };

  const onSignupSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signup(data.email, data.password, data.name);
      const analytics = getAnalyticsInstance();
      if (analytics) {
        logEvent(analytics, "sign_up", { method: "email" });
      }
      onOpenChange(false);
      signupForm.reset();
    } catch (error: any) {
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      if (mode === "login") {
        await loginWithGoogle();
        const analytics = getAnalyticsInstance();
        if (analytics) {
          logEvent(analytics, "login", { method: "google" });
        }
      } else {
        await loginWithGoogle();
        const analytics = getAnalyticsInstance();
        if (analytics) {
          logEvent(analytics, "sign_up", { method: "google" });
        }
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error("Google auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "login" ? (
              <span className="bg-gradient-primary bg-clip-text text-transparent">Welcome Back</span>
            ) : (
              <span className="bg-gradient-primary bg-clip-text text-transparent">Create Account</span>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "Sign in to access the compiler and view answers"
              : "Sign up to get started with your journey"}
          </DialogDescription>
        </DialogHeader>

        {mode === "login" ? (
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10"
                  {...loginForm.register("email")}
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...loginForm.register("password")}
                />
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:shadow-glow-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="John Doe"
                  className="pl-10"
                  {...signupForm.register("name")}
                />
              </div>
              {signupForm.formState.errors.name && (
                <p className="text-sm text-destructive">{signupForm.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10"
                  {...signupForm.register("email")}
                />
              </div>
              {signupForm.formState.errors.email && (
                <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...signupForm.register("password")}
                />
              </div>
              {signupForm.formState.errors.password && (
                <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="signup-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...signupForm.register("confirmPassword")}
                />
              </div>
              {signupForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {signupForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:shadow-glow-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>
        )}

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleAuth}
          disabled={isLoading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {mode === "login" ? "Sign in with Google" : "Sign up with Google"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;

