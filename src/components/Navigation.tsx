/* eslint-disable @typescript-eslint/no-unused-vars */
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, ArrowLeft, Trophy } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "./AuthModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage = ["/admin/login"].includes(location.pathname);
  const isAdminPage = location.pathname.startsWith("/admin");
  const isPracticePage =
    location.pathname.startsWith("/interview-prep/module") ||
    location.pathname.startsWith("/interview-prep/question");
  const isInterviewPrepPage = location.pathname === "/interview-prep";
  const hideNavLinks = isAuthPage || isAdminPage || isPracticePage;
  const showBackButton = isPracticePage || isInterviewPrepPage;

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/interview-prep", label: "Interview Prep" },
    { to: "/mentorship", label: "Mentorship" },
    { to: "/services", label: "Services" },
    { to: "/courses", label: "Courses" },
    { to: "/case-studies", label: "Case Studies" },
    { to: "/projects", label: "Projects" },
    { to: "/blog", label: "Blog" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <img 
              src="/logo.jpg" 
              alt="BytesOfData Logo" 
              className="h-20  w-16 object-contain group-hover:opacity-80 transition-opacity"
            />
          </Link>

          {/* Desktop Navigation */}
          {!hideNavLinks && (
            <div className="hidden lg:flex items-center space-x-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link key={link.to} to={link.to}>
                    <Button 
                      variant="ghost" 
                      className={`relative text-foreground/80 hover:text-primary transition-all duration-300 ${
                        isActive ? 'text-primary' : ''
                      }`}
                    >
                      {link.label}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-primary animate-fade-in" />
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Auth Buttons & Theme Toggle */}
          <div className="hidden lg:flex items-center space-x-4">
            {showBackButton && isPracticePage && (
              <Button
                variant="ghost"
                onClick={() => navigate("/interview-prep")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to modules
              </Button>
            )}
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
              !isAuthPage && !isAdminPage && (
                <Button
                  variant="ghost"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  Sign In
                </Button>
              )
            )}
          </div>

          {/* Mobile Menu Button / Back Button */}
          {showBackButton && isPracticePage ? (
            <div className="lg:hidden flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/interview-prep")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">Modules</span>
              </Button>
            </div>
          ) : !hideNavLinks ? (
            <button
              className="lg:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
            </button>
          ) : null}
        </div>

        {/* Mobile Menu */}
        {!hideNavLinks && isMenuOpen && (
          <div className="lg:hidden py-4 animate-fade-in">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Button variant="ghost" className="w-full justify-start text-foreground/80">
                    {link.label}
                  </Button>
                </Link>
              ))}
              <div className="flex flex-col space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <ThemeToggle />
                  {currentUser ? (
                    <div className="flex items-center space-x-2 flex-1 ml-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                          {getInitials(currentUser.displayName || currentUser.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground/80 flex-1 truncate">
                        {currentUser.displayName || currentUser.email}
                      </span>
                    </div>
                  ) : null}
                </div>
                {currentUser ? (
                  <>
                    <Link to="/leaderboard" className="w-full">
                      <Button variant="outline" className="w-full justify-start">
                        <Trophy className="mr-2 h-4 w-4" />
                        Leaderboard
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultMode="login"
      />
    </nav>
  );
};

export default Navigation;