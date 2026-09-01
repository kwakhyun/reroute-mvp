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
      <ContentHeader backHref="/projects" description="프로젝트 정보와 자산 목록을 입력해 가설 검증에 사용할 작업 공간을 만듭니다." eyebrow="프로젝트 만들기" title="새 프로젝트" />
      <ProjectCreateForm organizations={organizations} />
    </div>
  );
}
