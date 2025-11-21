import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Crown, Linkedin, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AuthModal from "@/components/AuthModal";

const Profile = () => {
  const { currentUser, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    linkedinUrl: "",
  });

  useEffect(() => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    if (profile) {
      setFormData({
        displayName: profile.displayName || currentUser.displayName || "",
        linkedinUrl: profile.linkedinUrl || "",
      });
    }
  }, [currentUser, profile]);

  const handleSave = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    try {
      await updateProfile(currentUser.uid, {
        displayName: formData.displayName.trim() || null,
        linkedinUrl: formData.linkedinUrl.trim() || null,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <>
        <div className="min-h-screen py-20 flex items-center justify-center">
          <GlassCard className="p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
            <p className="text-muted-foreground mb-6">
              You need to be signed in to view your profile.
            </p>
            <Button onClick={() => setAuthModalOpen(true)}>
              Sign In
            </Button>
          </GlassCard>
        </div>
        <AuthModal 
          open={authModalOpen} 
          onOpenChange={setAuthModalOpen}
          defaultMode="login"
        />
      </>
    );
  }

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 lg:px-6 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Profile</h1>
            <p className="text-muted-foreground">
              Manage your account information and preferences.
            </p>
          </div>

          {/* Profile Information Card */}
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Account Information</h2>
              <Badge variant={profile?.isPaid ? "default" : "outline"} className="gap-1.5">
                {profile?.isPaid ? (
                  <>
                    <Crown className="h-3 w-3" />
                    Paid Account
                  </>
                ) : (
                  "Free Account"
                )}
              </Badge>
            </div>

            <div className="space-y-4">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Name
                </Label>
                <Input
                  id="displayName"
                  placeholder="Enter your name"
                  value={formData.displayName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                />
              </div>

              {/* Email Field (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={currentUser.email || ""}
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>

              {/* LinkedIn URL Field */}
              <div className="space-y-2">
                <Label htmlFor="linkedinUrl" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn Profile URL (Optional)
                </Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  placeholder="https://www.linkedin.com/in/yourprofile"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Add your LinkedIn profile URL to display it on the leaderboard.
                </p>
              </div>

              {/* XP Display */}
              {profile?.xp !== undefined && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Experience Points (XP)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {profile.xp || 0} XP
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Earn 25 XP for each completed question!
                    </p>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gradient-primary hover:shadow-glow-primary"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Profile;

