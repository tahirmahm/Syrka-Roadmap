import type { Metadata } from "next";
import "./globals.css";
import "@/odyssey/styles.css";
export const metadata: Metadata = {
  title: "Syrka Roadmaps · Find your direction",
  description:
    "Evidence-aware career pathways. Explore your capabilities, understand your next steps and find your direction.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
