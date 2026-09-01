import { redirect } from "next/navigation";
import { getProject } from "@/server/services/dashboard";
import { projectPageData } from "./project-page-data";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  await projectPageData(getProject(projectId));
  redirect(`/projects/${projectId}/matching`);
}
