import { IdentificationBadge, ShieldCheck, Truck } from "@phosphor-icons/react/dist/ssr";

const trustItems = [
  { title: "수요처 검증", body: "확인 근거와 시각, 만료일 기록", icon: IdentificationBadge },
  { title: "외부 정산 확인", body: "연동 전에는 수동 확인 결과 기록", icon: ShieldCheck },
  { title: "검수 후 지급 확인", body: "모든 회차의 검수가 끝난 뒤 지급 결과 확인", icon: Truck },
];

export function TrustStrip() {
  return (
    <section className="card trust-strip" aria-label="거래 검증 정책">
      {trustItems.map((item) => {
        const Icon = item.icon;
        return (
          <div className="trust-item" key={item.title}>
            <span className="trust-icon">
              <Icon aria-hidden="true" size={29} weight="thin" />
            </span>
            <div>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
