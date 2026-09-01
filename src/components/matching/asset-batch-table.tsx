import Image from "next/image";
import { formatNumber } from "@/lib/format";

type Asset = {
  id: string;
  name: string;
  quantity: number;
  conditionGrade: string;
  conditionLabel: string;
  minimumRecovery: number;
  imagePath: string;
};

export function AssetBatchTable({ assets }: { assets: Asset[] }) {
  const totalQuantity = assets.reduce((sum, asset) => sum + asset.quantity, 0);
  const totalMinimum = assets.reduce((sum, asset) => sum + asset.minimumRecovery, 0);

  return (
    <div className="asset-column">
      <section className="card data-card asset-card" aria-labelledby="asset-batch-title">
        <h2 id="asset-batch-title">배치 요약 (총 {formatNumber(totalQuantity)}개)</h2>
        <p aria-hidden="true" className="table-scroll-hint">표를 좌우로 밀어 전체 항목을 확인하세요.</p>
        <div aria-label="자산 배치 표" className="table-scroll" role="region" tabIndex={0}>
          <table className="asset-table">
            <colgroup>
              <col className="asset-col-name" />
              <col className="asset-col-quantity" />
              <col className="asset-col-condition" />
              <col className="asset-col-recovery" />
            </colgroup>
          <thead>
            <tr>
              <th scope="col">자산</th>
              <th scope="col">수량</th>
              <th scope="col">상태</th>
              <th scope="col">회수 기준액</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>
                  <div className="asset-name-cell">
                    <Image
                      alt=""
                      className="asset-thumbnail"
                      height={70}
                      sizes="70px"
                      src={asset.imagePath}
                      width={70}
                    />
                    <strong>{asset.name}</strong>
                  </div>
                </td>
                <td className="numeric-cell">{formatNumber(asset.quantity)}개</td>
                <td>
                  <span className={`condition-grade condition-${asset.conditionGrade.replace("+", "plus").toLowerCase()}`}>
                    {asset.conditionGrade}
                  </span>
                  <small className="condition-label">{asset.conditionLabel}</small>
                </td>
                <td className="numeric-cell recovery-goal">{formatNumber(asset.minimumRecovery)}만 원</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">합계</th>
              <td className="numeric-cell">{formatNumber(totalQuantity)}개</td>
              <td />
              <td className="numeric-cell">{formatNumber(totalMinimum)}만 원 이상</td>
            </tr>
          </tfoot>
          </table>
        </div>
      </section>
      <p className="table-note">* 자산군별 회수 기준액의 합계가 배치 현금 회수 하한으로 적용됩니다.</p>
    </div>
  );
}
