// Auth Context for managing user authentication state
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  profile: UserProfile | null;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setUserPaidStatus: (userId: string, isPaid: boolean) => Promise<void>;
  updateProfile: (userId: string, data: { displayName?: string; linkedinUrl?: string }) => Promise<void>;
}

interface UserProfile {
  displayName?: string | null;
  email?: string | null;
  isPaid: boolean;
  xp?: number; // Experience points
  linkedinUrl?: string; // LinkedIn profile URL
  createdAt?: Date;
  updatedAt?: Date;
  purchasedModules?: Record<string, boolean>;
  hasGlobalAccess?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  const getErrorMessage = (error: any): string => {
    const code = error?.code;
    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered. Please sign in instead.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/operation-not-allowed":
        return "Email/password accounts are not enabled. Please contact support.";
      case "auth/weak-password":
        return "Password is too weak. Please use at least 6 characters.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact support.";
      case "auth/user-not-found":
        return "No account found with this email address.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/invalid-credential":
        return "Invalid email or password. Please check your credentials and try again.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed. Please try again.";
      case "auth/cancelled-popup-request":
        return "Only one popup request is allowed at a time.";
      case "auth/popup-blocked":
        return "Popup was blocked by your browser. Please allow popups and try again.";
      default:
        return error?.message || "An error occurred. Please try again.";
    }
  };

  const ensureUserProfile = async (user: User) => {
    if (!user?.uid) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(userRef);
      if (snapshot.exists()) {
        await setDoc(
          userRef,
          {
            displayName: user.displayName ?? snapshot.data().displayName ?? "",
            email: user.email ?? snapshot.data().email ?? "",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } else {
        await setDoc(userRef, {
          displayName: user.displayName ?? "",
          email: user.email ?? "",
          isPaid: false,
          hasGlobalAccess: false,
          purchasedModules: {},
          xp: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error: any) {
      // Log error but don't throw - authentication succeeded even if profile update fails
      console.error("Error ensuring user profile:", error);
      // Don't throw - user is still authenticated, profile can be updated later
    }
  };

  const signup = async (email: string, password: string, displayName?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
      await ensureUserProfile(userCredential.user);
      toast({
        title: "Account created!",
        description: "Your account has been successfully created.",
      });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      // Ensure profile but don't fail login if profile update has issues
      // This runs in background and won't throw errors
      ensureUserProfile(credential.user).catch((err) => {
        console.error("Background profile update failed:", err);
      });
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      return credential.user;
    } catch (error: any) {
      // Only show error for actual authentication failures
      const errorCode = error?.code;
      if (errorCode && errorCode.startsWith('auth/')) {
        const errorMessage = getErrorMessage(error);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to log out";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureUserProfile(result.user);
      toast({
        title: "Welcome!",
        description: "You have successfully logged in with Google.",
      });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password reset email sent",
        description: "Check your inbox for password reset instructions.",
      });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const setUserPaidStatus = async (userId: string, isPaid: boolean) => {
    try {
      await setDoc(
        doc(db, "users", userId),
        {
          isPaid,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast({
        title: "User updated",
        description: `The user has been marked as ${isPaid ? "paid" : "free"}.`,
      });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProfile = async (userId: string, data: { displayName?: string; linkedinUrl?: string }) => {
    try {
      const updateData: any = {
        updatedAt: serverTimestamp(),
      };
      if (data.displayName !== undefined) {
        updateData.displayName = data.displayName;
      }
      if (data.linkedinUrl !== undefined) {
        updateData.linkedinUrl = data.linkedinUrl || null;
      }
      await setDoc(
        doc(db, "users", userId),
        updateData,
        { merge: true },
      );
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as UserProfile);
      } else {
        setProfile(null);
      }
    });

    return unsubscribe;
  }, [currentUser]);

  const value: AuthContextType = {
    currentUser,
    loading,
    profile,
    signup,
    login,
    logout,
    loginWithGoogle,
    resetPassword,
    setUserPaidStatus,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

