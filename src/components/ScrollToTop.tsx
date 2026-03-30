import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll main content area to top
    const scrollableContent = document.querySelector(".scrollable-content");
    if (scrollableContent) {
      scrollableContent.scrollTop = 0;
    }
    
    // Fallback: scroll window to top
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
