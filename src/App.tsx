import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import InterviewPrep from "./pages/InterviewPrep";
import Mentorship from "./pages/Mentorship";
import Services from "./pages/Services";
import Courses from "./pages/Courses";
import CaseStudies from "./pages/CaseStudies";
import Projects from "./pages/Projects";
import Blog from "./pages/Blog";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import InterviewModule from "./pages/InterviewModule";
import QuestionDetail from "./pages/QuestionDetail";
import QuestionHint from "./pages/QuestionHint";
import TheoryQuestionDetail from "./pages/TheoryQuestionDetail";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import PaymentPage from "./pages/PaymentPage";
import { AdminRoute } from "./components/AdminRoute";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  
  // Hide footer on interview prep sub-pages (but show on main interview prep page) and theory questions
  const hideFooter = (location.pathname.startsWith("/interview-prep") && location.pathname !== "/interview-prep") || location.pathname.startsWith("/theory-question");
  
  // Hide navbar padding on question pages (they have their own custom header)
  const isQuestionPage = location.pathname.startsWith("/interview-prep/question") && !location.pathname.includes("/hint");
  const mainPaddingTop = isQuestionPage ? "pt-0" : "pt-16";
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className={`flex-1 ${mainPaddingTop}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/interview-prep" element={<InterviewPrep />} />
          <Route path="/interview-prep/module/:moduleSlug" element={<InterviewModule />} />
          <Route path="/interview-prep/question/:questionId" element={<QuestionDetail />} />
          <Route path="/interview-prep/question/:questionId/hint" element={<QuestionHint />} />
          <Route path="/theory-question/:questionId" element={<TheoryQuestionDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/mentorship" element={<Mentorship />} />
          <Route path="/services" element={<Services />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/case-studies" element={<CaseStudies />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route path="*" element={<AppContent />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
