"use client";

import { useEffect, useState } from "react";
import "@/lib/i18n";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by only rendering children after mount (or just render children, i18n doesn't strictly block)
  // But since we use client-side detection, rendering immediately might cause a flash of English on server render.
  // Returning children is fine since it's a client side app mostly anyway.
  return <>{children}</>;
}
