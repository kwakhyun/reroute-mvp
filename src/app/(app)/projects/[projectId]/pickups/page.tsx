import { CalendarCheck, MapPin, Truck, UserCircle } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { ProjectPreparation } from "@/components/app/project-preparation";
import { ContentHeader } from "@/components/app/content-header";
import { PartnerMark } from "@/components/matching/partner-mark";
import { PickupOperationForm } from "@/components/operations/pickup-operation-form";
import { formatKoreanDate, formatNumber } from "@/lib/format";
import { toSeoulDateKey } from "@/lib/date";
import { getPickupDashboard, getPickupOperations } from "@/server/services/dashboard";
import { projectPageData } from "../project-page-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "수거" };

const statusLabel = {
  PLANNED: "계획",
  READY: "준비 완료",
  IN_TRANSIT: "수거 중",
  INSPECTED: "검수 완료",
  FAILED: "확인 필요",
} as const;

export default async function PickupsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [dashboard, operations] = await projectPageData(Promise.all([getPickupDashboard(projectId), getPickupOperations(projectId)]));
  if (!dashboard.plan) return <ProjectPreparation projectId={projectId} projectName={dashboard.project.name} title="수거 일정" />;
  const confirmed = dashboard.plan.status === "CONFIRMED";
  const canEdit = dashboard.membershipRole === "MANAGER" || dashboard.membershipRole === "APPROVER";
  const operationByDate = new Map(operations.map((operation) => [toSeoulDateKey(operation.pickupDate), operation]));
  const groups = new Map<string, typeof dashboard.allocations>();
  for (const allocation of dashboard.allocations) {
    const date = toSeoulDateKey(allocation.pickupDate);
    groups.set(date, [...(groups.get(date) ?? []), allocation]);
  }

  return (
    <div className="section-page">
      <ContentHeader backHref={`/projects/${projectId}/matching`} description="배분안에 정한 날짜별로 수거 장소, 담당자와 진행 상태를 기록합니다." eyebrow={dashboard.project.name} title={`수거 일정 ${dashboard.plan.pickupRounds}회`} />
      {!confirmed ? (
        <div className="notice-banner"><CalendarCheck aria-hidden="true" size={20} /><span><strong>아직 확정되지 않은 일정입니다.</strong> 배분안을 확정하면 수거 장소와 담당자 정보를 기록할 수 있습니다.</span></div>
      ) : null}
      <div className="pickup-timeline">
        {[...groups.entries()].map(([date, allocations], index) => {
          const operation = operationByDate.get(date);
          return (
            <article className="card pickup-round" key={date}>
              <div className="pickup-round-index"><Truck aria-hidden="true" size={23} /><span>{index + 1}회차</span></div>
              <div className="pickup-round-body">
                <header><div><span>수거일</span><h2>{formatKoreanDate(`${date}T09:00:00+09:00`)}</h2></div><span className={`status-badge ${operation?.status === "INSPECTED" ? "status-confirmed" : operation?.status === "FAILED" ? "status-danger" : "status-progress"}`}>{operation ? statusLabel[operation.status] : confirmed ? "아직 기록 없음" : "확정 대기"}</span></header>
                {operation ? (
                  <div className="operation-facts"><span><MapPin aria-hidden="true" size={15} /> {operation.address || "수거지 미입력"}{operation.timeWindow ? `, ${operation.timeWindow}` : ""}</span><span><UserCircle aria-hidden="true" size={15} /> {operation.operatorName || "담당자 미지정"}{operation.vehicleLabel ? `, ${operation.vehicleLabel}` : ""}</span></div>
                ) : null}
                <ul>
                  {allocations.map((allocation) => (
                    <li key={allocation.id}><PartnerMark type={allocation.partnerType} /><div><strong>{allocation.partnerName}</strong><span>{allocation.isVerified ? `${allocation.verificationLabel} 완료` : "인수처 확인 필요"}</span></div><b>{formatNumber(allocation.quantity)}개</b></li>
                  ))}
                </ul>
                {operation && canEdit ? <PickupOperationForm operation={operation} projectId={projectId} version={operation.updatedAt} /> : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
