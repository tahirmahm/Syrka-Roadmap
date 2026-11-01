import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "@/odyssey/styles.css";
import "@/living/styles.css";
import "@/living/constellation.css";
export const metadata: Metadata = {
  title: "Syrka Roadmaps · The Living Career Tree",
  description:
    "Evidence-aware career pathways. Explore your capabilities, understand your next steps and find your direction.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme =
    (await cookies()).get("syrka_roadmaps_theme")?.value === "dark"
      ? "dark"
      : "light";
  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
