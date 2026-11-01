import { notFound } from "next/navigation";
import { OdysseyApp } from "@/odyssey/components/app";
export default async function Page({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (
    ![
      "tree",
      "overview",
      "roadmap",
      "roadmaps",
      "discover",
      "profile",
      "capabilities",
      "compare",
      "progress",
      "opportunities",
    ].includes(view)
  )
    notFound();
  return <OdysseyApp initialView={view} />;
}
