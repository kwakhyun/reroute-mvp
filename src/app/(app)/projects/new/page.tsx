import type { Metadata } from "next";
import { ContentHeader } from "@/components/app/content-header";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { getProjectCreationOrganizations } from "@/server/services/dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "새 프로젝트" };

export default async function NewProjectPage() {
  const organizations = await getProjectCreationOrganizations();
  return (
    <div className="section-page">
      <ContentHeader backHref="/projects" description="프로젝트 정보와 자산 배치를 입력해 검증 가능한 워크스페이스를 만듭니다." eyebrow="NEW PROJECT" title="새 프로젝트" />
      <ProjectCreateForm organizations={organizations} />
    </div>
  );
}
