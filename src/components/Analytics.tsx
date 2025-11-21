// Analytics component to track page views and user activity
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { logEvent, setUserId, setUserProperties } from "firebase/analytics";
import { getAnalyticsInstance } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

const AnalyticsComponent = () => {
  const location = useLocation();
  const { currentUser } = useAuth();

  // Track page views
  useEffect(() => {
    const analytics = getAnalyticsInstance();
    if (analytics) {
      logEvent(analytics, "page_view", {
        page_path: location.pathname,
        page_title: document.title,
      });
    }
  }, [location]);

  // Set user ID and properties when user logs in
  useEffect(() => {
    const analytics = getAnalyticsInstance();
    if (analytics && currentUser) {
      setUserId(analytics, currentUser.uid);
      setUserProperties(analytics, {
        email: currentUser.email || undefined,
        display_name: currentUser.displayName || undefined,
      });
    }
  }, [currentUser]);

  return null;
};

export default AnalyticsComponent;

