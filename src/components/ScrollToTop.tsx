import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Force a small delay to ensure DOM is ready
    setTimeout(() => {
      // Scroll main content area to top
      const scrollableContent = document.querySelector(".scrollable-content");
      if (scrollableContent) {
        scrollableContent.scrollTop = 0;
      }
      
      // Also scroll window to top as fallback
      window.scrollTo(0, 0);
    }, 0);
  }, [pathname]);

  return null;
}
