import { CheckCircle, XCircle } from "@phosphor-icons/react/dist/ssr";
import { formatNumber } from "@/lib/format";

type DecisionCriteriaProps = {
  minimumCashRecovery: number;
  minimumReuseRate: number;
  maximumPickupRounds: number;
  cashRecovery: number;
  reuseRate: number;
  pickupRounds: number;
};

export function DecisionCriteria(props: DecisionCriteriaProps) {
  const criteria = [
    {
      label: `매각 대금 ${formatNumber(props.minimumCashRecovery)}만 원 이상`,
      passed: props.cashRecovery >= props.minimumCashRecovery,
    },
    {
      label: `재사용률 ${formatNumber(props.minimumReuseRate)}% 이상`,
      passed: props.reuseRate >= props.minimumReuseRate,
    },
    {
      label: `수거 ${props.maximumPickupRounds}회 이하`,
      passed: props.pickupRounds <= props.maximumPickupRounds,
    },
  ];

  return (
    <section className="card criteria-card" aria-labelledby="criteria-title">
      <h2 id="criteria-title">배분안 확정 기준</h2>
      <ul>
        {criteria.map((criterion) => {
          const Icon = criterion.passed ? CheckCircle : XCircle;
          return (
            <li className={criterion.passed ? "criterion-passed" : "criterion-failed"} key={criterion.label}>
              <Icon aria-hidden="true" size={21} weight="fill" />
              <span>{criterion.label}</span>
              <strong>{criterion.passed ? "통과" : "미달"}</strong>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
