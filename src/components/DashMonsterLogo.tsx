"use client";

import { useTheme } from "next-themes";

interface DashMonsterLogoProps {
  /** Size in px (width = height). Default 32. */
  size?: number;
  className?: string;
}

export function DashMonsterLogo({ size = 32, className = "" }: DashMonsterLogoProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 159.01 159.01"
      width={size}
      height={size}
      className={className}
      aria-label="DashMonster logo"
    >
      <path
        fill={isDark ? "#ffffff" : "#313491"}
        d="M152.46,0H6.55C2.93,0,0,2.93,0,6.55v145.91c0,3.62,2.93,6.55,6.55,6.55h145.91c3.62,0,6.55-2.93,6.55-6.55V6.55c0-3.62-2.93-6.55-6.55-6.55ZM35.42,42.61l27.48,6.57,8.36,2.09c-5.29,8.11-15.85,11.45-24.76,6.9-5.96-3.05-9.96-8.79-11.07-15.55ZM106.33,100.73c-4.28,9.27-13.15,15.18-23.36,15.63l-12.19.03c-3.41-6.67-1.04-12.54-1.32-13.28-.12-.33-.66-.82-1.23-.57-5.02,2.2-7.91,8.27-8.88,13.83l-5.93.03-.06-47.79c1.79-.46,3.51-.26,5.47-.1.66,2.67,1.35,5.19,2.72,7.61,2.09,3.69,6.49,7.66,7.71,6.4.75-.77-1.7-4.64-.02-9.6l1.51-4.46,17.08-.05c1.09,2.34,1.8,4.68,2.11,7.2.5,3.94-1.63,6.67-.35,7.09.25.08.79.06,1.15-.15,5.08-2.9,7.97-7.99,9-13.98l6.39-.11c4.16,9.2,4.37,23.22.19,32.27ZM109.12,59.45c-8.3,2.42-16.66-1.2-21.38-8.23l18.73-4.61,17.12-3.92c-1.37,7.77-6.68,14.49-14.47,16.76Z"
      />
    </svg>
  );
}
