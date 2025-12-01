import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Linkedin, ArrowLeft, Crown, User } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type LeaderboardUser = {
  id: string;
  displayName?: string;
  email?: string;
  xp: number;
  linkedinUrl?: string;
  isPaid?: boolean;
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, profile } = useAuth();
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [allUsers, setAllUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  // Fetch top 3 users
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      orderBy("xp", "desc"),
      limit(3)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const users = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              displayName: data.displayName || "Anonymous",
              email: data.email,
              xp: data.xp || 0,
              linkedinUrl: data.linkedinUrl,
              isPaid: data.isPaid || false,
            } as LeaderboardUser;
          })
          .filter((user) => user.xp > 0); // Only show users with XP

        setTopUsers(users);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching leaderboard:", error);
        toast({
          title: "Unable to load leaderboard",
          description: error.message || "Please try again later.",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [toast]);

  // Fetch all users to calculate current user's rank
  useEffect(() => {
    if (!currentUser) {
      setCurrentUserRank(null);
      return;
    }

    const q = query(
      collection(db, "users"),
      orderBy("xp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const users = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              displayName: data.displayName || "Anonymous",
              email: data.email,
              xp: data.xp || 0,
              linkedinUrl: data.linkedinUrl,
              isPaid: data.isPaid || false,
            } as LeaderboardUser;
          })
          .filter((user) => user.xp > 0);

        setAllUsers(users);

        // Find current user's rank
        const userIndex = users.findIndex((u) => u.id === currentUser.uid);
        if (userIndex !== -1) {
          setCurrentUserRank(userIndex + 1);
        } else {
          setCurrentUserRank(null);
        }
      },
      (error) => {
        console.error("Error fetching all users:", error);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-8 w-8 text-yellow-500" />;
      case 2:
        return <Medal className="h-8 w-8 text-gray-400" />;
      case 3:
        return <Award className="h-8 w-8 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white";
      case 2:
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
      case 3:
        return "bg-gradient-to-r from-amber-600 to-amber-700 text-white";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 lg:px-6 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="px-0" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Trophy className="h-10 w-10 text-yellow-500" />
              Leaderboard
            </h1>
            <p className="text-muted-foreground">
              Top 3 performers based on experience points (XP) earned from completing questions.
            </p>
          </div>

          {/* Leaderboard Cards */}
          {loading ? (
            <GlassCard className="p-12 text-center">
              <p className="text-muted-foreground">Loading leaderboard...</p>
            </GlassCard>
          ) : topUsers.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No Rankings Yet</h3>
              <p className="text-muted-foreground">
                Complete questions to earn XP and appear on the leaderboard!
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {topUsers.map((user, index) => {
                const rank = index + 1;
                return (
                  <GlassCard
                    key={user.id}
                    className={`p-6 relative overflow-hidden ${
                      rank === 1 ? "border-2 border-yellow-500/50" : ""
                    }`}
                  >
                    {/* Decorative gradient for top rank */}
                    {rank === 1 && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500" />
                    )}

                    <div className="flex items-center gap-6">
                      {/* Rank Icon */}
                      <div className="flex-shrink-0">
                        {getRankIcon(rank)}
                      </div>

                      {/* Rank Badge */}
                      <div className="flex-shrink-0">
                        <Badge
                          className={`${getRankBadge(rank)} text-lg font-bold px-4 py-2`}
                        >
                          #{rank}
                        </Badge>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-xl font-bold">
                            {user.displayName || "Anonymous"}
                          </h3>
                          {user.isPaid && (
                            <Badge variant="default" className="gap-1.5">
                              <Crown className="h-3 w-3" />
                              Premium
                            </Badge>
                          )}
                        </div>
                        {user.email && (
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                        {user.linkedinUrl && (
                          <a
                            href={user.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <Linkedin className="h-4 w-4" />
                            View LinkedIn Profile
                          </a>
                        )}
                      </div>

                      {/* XP Score */}
                      <div className="flex-shrink-0 text-right">
                        <div className="text-3xl font-bold text-primary">
                          {user.xp}
                        </div>
                        <div className="text-sm text-muted-foreground uppercase tracking-wide">
                          XP
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}

          {/* Current User's Rank (if not in top 3) */}
          {currentUser && currentUserRank && currentUserRank > 3 && (
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm font-medium">Your Ranking</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <GlassCard className="p-6 border-2 border-primary/30 bg-primary/5">
                <div className="flex items-center gap-6">
                  {/* User Icon */}
                  <div className="flex-shrink-0">
                    <User className="h-8 w-8 text-primary" />
                  </div>

                  {/* Rank Badge */}
                  <div className="flex-shrink-0">
                    <Badge
                      className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-lg font-bold px-4 py-2"
                    >
                      #{currentUserRank}
                    </Badge>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-bold">
                        {profile?.displayName || "You"}
                      </h3>
                      {profile?.isPaid && (
                        <Badge variant="default" className="gap-1.5">
                          <Crown className="h-3 w-3" />
                          Premium
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Keep solving questions to climb the ranks!
                    </p>
                  </div>

                  {/* XP Score */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-3xl font-bold text-primary">
                      {profile?.xp || 0}
                    </div>
                    <div className="text-sm text-muted-foreground uppercase tracking-wide">
                      XP
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* Message for logged in users with no XP */}
          {currentUser && profile && (profile.xp === undefined || profile.xp === 0) && (
            <div className="mt-8">
              <GlassCard className="p-6 text-center border-dashed">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Start Your Journey!</h3>
                <p className="text-muted-foreground text-sm">
                  Complete questions to earn XP and appear on the leaderboard.
                  <br />
                  <span className="text-primary font-medium">Easy: 10 XP • Medium: 20 XP • Hard: 25 XP</span>
                </p>
                <Button className="mt-4" onClick={() => navigate("/interview-prep")}>
                  Start Practicing
                </Button>
              </GlassCard>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

