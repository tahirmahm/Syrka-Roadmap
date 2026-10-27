import { notFound } from "next/navigation";
import { App, type View } from "@/components/app";
export default async function ViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (
    ![
      "roadmap",
      "discover",
      "capabilities",
      "opportunities",
      "progress",
      "compare",
    ].includes(view)
  )
    notFound();
  return <App initialView={view as View} />;
}
