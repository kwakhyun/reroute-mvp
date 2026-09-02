import { formatNumber } from "@/lib/format";

type KpiSummaryProps = {
  cashRecovery: number;
  costSavings: number;
  netImpact: number;
  reuseRate: number;
  confirmed: boolean;
};

export function KpiSummary({ cashRecovery, costSavings, netImpact, reuseRate, confirmed }: KpiSummaryProps) {
  const items = [
    { label: "매각 대금", value: formatNumber(cashRecovery), unit: "만 원", accent: true },
    { label: "폐기비와 운반비 절감액", value: formatNumber(costSavings), unit: "만 원", accent: false },
    { label: "매각 대금과 비용 절감액 합계", value: formatNumber(netImpact), unit: "만 원", accent: true },
    { label: "재사용률", value: reuseRate.toFixed(1), unit: "%", accent: true },
  ];

  return (
    <section className="card kpi-card" aria-labelledby="kpi-title">
      <h2 id="kpi-title">{confirmed ? "확정 결과" : "추천 결과"}</h2>
      <dl className="kpi-list">
        {items.map((item) => (
          <div className="kpi-item" key={item.label}>
            <dt>{item.label}</dt>
            <dd className={item.accent ? "kpi-value kpi-value-accent" : "kpi-value"}>
              <span>{item.value}</span>
              <small>{item.unit}</small>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
