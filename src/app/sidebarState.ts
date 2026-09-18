import { useEffect, useState } from "react";

export type SidebarMode = "expanded" | "compact" | "drawer";

export function resolveSidebarMode(width: number, userCollapsed: boolean): SidebarMode {
  if (width < 768) return "drawer";
  if (width < 1024) return "compact";
  return userCollapsed ? "compact" : "expanded";
}

export function useSidebarMode(userCollapsed: boolean): SidebarMode {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1120 : window.innerWidth,
  );

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return resolveSidebarMode(width, userCollapsed);
}
