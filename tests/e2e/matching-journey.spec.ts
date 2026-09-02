import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const demoProjectPath = "/projects/project-seongsu-relocation";
const useProductionBuild = process.env.PLAYWRIGHT_USE_PRODUCTION === "true";

test.describe.configure({ mode: "serial" });

async function demoLogin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "초기 상태로 데모 열기" }).click();
  await expect(page).toHaveURL("/projects");
}

async function fetchJsonFromPage(page: Page, url: string) {
  return page.evaluate(async (requestUrl) => {
    const response = await fetch(requestUrl);
    return { status: response.status, body: await response.json() };
  }, url);
}

test("공개 제품 개발 사례가 가설과 가상 데이터 분석의 한계를 명확히 보여준다", async ({ page, request }) => {
  await page.context().clearCookies();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "사무 자산 처분안을 한눈에 비교하고 결정합니다." })).toBeVisible();
  await expect(page.getByText("실제 고객 검증 전", { exact: true })).toBeVisible();
  await expect(page.getByText(/아래 수치는 실제 고객 조사나 운영 결과가 아닙니다/)).toBeVisible();
  await expect(page.getByText("예시 결과의 유료 파일럿 참여", { exact: true })).toBeVisible();
  await expect(page.getByText(/데모를 열 때 샘플 작업 공간을 초기 상태로 되돌립니다/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /100% 직접 수행했습니다/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const report = await request.get("/reports/validation-simulation.html");
  expect(report.status()).toBe(200);
  expect(await report.text()).toContain("REROUTE 가상 데이터 분석 보고서");

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByRole("navigation", { name: "제품 개발 사례 메뉴" })).toBeVisible();
  await expect(page.getByRole("link", { name: "제품 흐름" })).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole("navigation", { name: "제품 개발 사례 메뉴" })).toBeVisible();
  await expect(page.locator(".portfolio-nav-demo")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "초기 상태로 데모 열기" }).first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "모바일 빠른 탐색" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "모바일 빠른 탐색" }).getByRole("link", { name: "제품 흐름" })).toBeVisible();
});

test("준비 상태와 보호 경계를 검증한다", async ({ page, request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  await expect(health.json()).resolves.toMatchObject({ status: "ready", database: "ready" });

  const anonymous = await request.get(`/api/v1${demoProjectPath}/summary`);
  expect(anonymous.status()).toBe(401);
  await expect(anonymous.json()).resolves.toEqual({ error: "unauthorized" });

  const loginResponse = await page.goto("/login");
  const csp = loginResponse?.headers()["content-security-policy"] ?? "";
  const scriptDirective = csp.split(";").find((directive) => directive.trim().startsWith("script-src"));
  expect(scriptDirective).toContain("'nonce-");
  expect(scriptDirective).not.toContain("'unsafe-inline'");
  const scriptNonces = await page.locator("script").evaluateAll((scripts) => scripts.map((script) => script.nonce));
  expect(scriptNonces.length).toBeGreaterThan(0);
  expect(scriptNonces.some(Boolean)).toBe(true);
  if (useProductionBuild) {
    expect(scriptNonces.every(Boolean)).toBe(true);
  }

  await page.getByRole("button", { name: "초기 상태로 데모 열기" }).click();
  await expect(page).toHaveURL("/projects");
  const foreignApi = await fetchJsonFromPage(page, "/api/v1/projects/project-foreign-audit/summary");
  expect(foreignApi).toEqual({ status: 404, body: { error: "not_found" } });

  await page.goto("/projects/project-foreign-audit/matching");
  await expect(page.getByRole("heading", { name: "요청한 화면을 찾을 수 없습니다." })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
});

test("프로젝트 목록에서도 최근 프로젝트의 하위 메뉴로 이동한다", async ({ page }) => {
  await demoLogin(page);

  const expectedRoutes = {
    자산: `${demoProjectPath}/assets`,
    매칭: `${demoProjectPath}/matching`,
    입찰: `${demoProjectPath}/bids`,
    수거: `${demoProjectPath}/pickups`,
    정산: `${demoProjectPath}/settlements`,
  };

  for (const [label, href] of Object.entries(expectedRoutes)) {
    await expect(page.getByRole("link", { name: `성수 오피스 이전 프로젝트의 ${label}` })).toHaveAttribute("href", href);
  }

  await page.getByRole("link", { name: "성수 오피스 이전 프로젝트의 자산" }).click();
  await expect(page).toHaveURL(`${demoProjectPath}/assets`);
  await expect(page.getByRole("heading", { name: "자산 목록" })).toBeVisible();
});

test("시드 배분안의 최소 매각 금액 기준과 배정 근거를 읽기 전용으로 검증한다", async ({ page }) => {
  await demoLogin(page);
  await page.goto(`${demoProjectPath}/matching`);
  await expect(page.getByRole("heading", { name: "성수 오피스 이전" })).toBeVisible();

  const summary = page.getByRole("region", { name: /^(추천|확정) 결과$/ });
  await expect(summary).toContainText("1,840");
  await expect(summary).toContainText("300");
  await expect(summary).toContainText("2,140");
  await expect(summary).toContainText("86.9");
  await expect(page.getByText("매각 대금 1,740만 원 이상")).toBeVisible();

  const proposal = page.getByRole("region", { name: "자산 배분안 표" });
  await expect(proposal.getByRole("columnheader", { name: "자산 항목" })).toBeVisible();
  for (const asset of ["회의용 의자", "모니터 암", "이동 서랍", "라운지 테이블"]) {
    await expect(proposal.getByText(asset, { exact: true })).toBeVisible();
  }

  const summaryResponse = await fetchJsonFromPage(page, `/api/v1${demoProjectPath}/summary`);
  expect(summaryResponse.status).toBe(200);
  const payload = summaryResponse.body;
  expect(payload.data.bidCount).toBe(11);
  expect(payload.data.allocations).toHaveLength(4);
  expect(payload.data.allocations.every((allocation: { assetGroupId?: string; assetGroupName?: string }) => allocation.assetGroupId && allocation.assetGroupName)).toBe(true);

  await page.getByRole("link", { name: "입찰 11건 보기" }).click();
  await expect(page.getByRole("heading", { name: "인수처 입찰 11건" })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(11);
  await expect(page.locator("tr.bid-selected")).toHaveCount(4);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "CSV 내보내기" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("project-seongsu-relocation-bids.csv");
});

test("새 프로젝트를 입찰 가져오기부터 확정과 수거 등록까지 독립적으로 완주한다", async ({ page }, testInfo) => {
  await demoLogin(page);
  await page.getByRole("link", { name: "새 프로젝트" }).click();
  const projectName = `판교 연구소 이전 ${Date.now()}-${testInfo.retry}`;
  await page.getByLabel("프로젝트명").fill(projectName);
  await page.getByLabel("위치").fill("경기 성남시 분당구");
  await page.locator('input[name="assetFile"]').setInputFiles(path.resolve(process.cwd(), "public/templates/asset-groups-template.csv"));
  await page.getByRole("button", { name: "프로젝트 생성" }).click();
  await expect(page).toHaveURL(/\/projects\/project-[^/]+\/matching$/);
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
  const projectId = new URL(page.url()).pathname.split("/")[2];

  const createdSummary = await fetchJsonFromPage(page, `/api/v1/projects/${projectId}/summary`);
  expect(createdSummary.status).toBe(200);
  const createdPayload = createdSummary.body;
  expect(createdPayload.data.project.minimumCashRecovery).toBe(1740);
  expect(createdPayload.data.bidCount).toBe(0);
  expect(createdPayload.data.plan).toBeNull();
  const assets = createdPayload.data.assets as Array<{ id: string; name: string; quantity: number; minimumRecovery: number }>;

  await page.getByRole("link", { name: "입찰", exact: true }).click();
  await expect(page.getByRole("heading", { name: "인수처 입찰 0건" })).toBeVisible();
  const bidHeader = [
    "assetGroupId", "assetGroupName", "partnerName", "partnerType", "verificationLabel",
    "verificationReference", "verificationExpiresOn", "quantity", "cashRecovery", "costSavings",
    "reuseQuantity", "performanceLabel", "performanceRate", "pickupDate",
  ].join(",");
  const bidRows = assets.map((asset, index) => [
    asset.id,
    asset.name,
    `파일럿 인수처 ${index + 1}`,
    "BUSINESS",
    "사업자 서류 확인",
    `e2e-evidence-${projectId}-${index + 1}`,
    "2027-09-01",
    asset.quantity,
    asset.minimumRecovery,
    0,
    asset.quantity,
    "재사용",
    100,
    "2026-09-15",
  ].join(","));
  await page.locator('input[name="bidFile"]').setInputFiles({
    name: "bids.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(`\uFEFF${bidHeader}\n${bidRows.join("\n")}`),
  });
  await page.getByRole("button", { name: "CSV 확인 후 가져오기" }).click();
  await expect(page.getByText("확인 자료가 포함된 인수처 입찰 4건을 가져왔습니다. 이제 배분안을 계산할 수 있습니다.")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(4);

  await page.getByRole("link", { name: "매칭", exact: true }).click();
  await expect(page.getByText("아직 계산된 배분안이 없습니다.")).toBeVisible();
  const recalculateTrigger = page.getByRole("button", { name: "조건 다시 계산" });
  await recalculateTrigger.click();
  await page.getByRole("dialog", { name: "매칭 조건 다시 계산" }).getByRole("button", { name: "취소" }).click();
  await expect(recalculateTrigger).toBeFocused();
  await recalculateTrigger.click();
  const recalculation = page.getByRole("dialog", { name: "매칭 조건 다시 계산" });
  await expect(recalculation.getByLabel("최소 매각 금액")).toHaveValue("1740");
  await recalculation.getByRole("button", { name: "새 조건으로 계산" }).click();
  await expect(recalculation.getByText("새 배분안을 계산했습니다.")).toBeVisible();
  await recalculation.getByRole("button", { name: "결과 확인" }).click();
  await expect(recalculateTrigger).toBeFocused();

  const result = page.getByRole("region", { name: "추천 결과" });
  await expect(result).toContainText("1,740");
  await expect(result).toContainText("100.0");
  await page.getByRole("button", { name: "배분안 확정" }).click();
  const confirmation = page.getByRole("dialog", { name: "이 배분안을 확정할까요?" });
  await expect(confirmation.getByText("자산 항목 4개 배정")).toBeVisible();
  for (const asset of assets) await expect(confirmation.getByText(asset.name, { exact: true })).toBeVisible();
  await confirmation.getByRole("button", { name: "확정하고 수거 일정 만들기" }).click();
  await expect(confirmation.getByText("배분안이 확정되었습니다.", { exact: true })).toBeVisible();
  await confirmation.getByRole("button", { name: "확정 결과 보기" }).click();

  await page.getByRole("link", { name: "수거 일정 보기" }).click();
  await expect(page.getByRole("heading", { name: "수거 일정 1회" })).toBeVisible();
  const pickupRound = page.locator("article.pickup-round");
  await expect(pickupRound).toHaveCount(1);
  await pickupRound.getByLabel("상태").selectOption("READY");
  await pickupRound.getByRole("button", { name: "수거 정보 저장" }).click();
  await expect(pickupRound.getByLabel("수거지")).toBeFocused();
  await pickupRound.getByLabel("수거지").fill("경기 성남시 분당구 판교로 242");
  await pickupRound.getByLabel("시간대").fill("09:00–11:00");
  await pickupRound.getByLabel("차량").fill("경기 12가 3456");
  await pickupRound.getByLabel("담당자").fill("김운영");
  await pickupRound.getByRole("button", { name: "수거 정보 저장" }).click();
  await expect(pickupRound.getByText("수거 진행 상태를 저장했습니다.")).toBeVisible();
  await expect(pickupRound.locator(".status-badge")).toHaveText("준비 완료");
  await expect(pickupRound.getByLabel("상태")).toHaveValue("READY");
  await page.getByRole("link", { name: "정산", exact: true }).click();
  await expect(page.locator("strong.settlement-state-label")).toHaveText("결제사 미연동");
  await page.getByLabel("확인 상태").selectOption("PENDING");
  await page.getByRole("button", { name: "확인 결과 저장" }).click();
  await expect(page.getByText("결제사에서 확인한 정산 상태를 저장했습니다.")).toBeVisible();
  await expect(page.locator("strong.settlement-state-label")).toHaveText("입금 확인 중");
  await expect(page.getByLabel("확인 상태")).toHaveValue("PENDING");

  const audit = await fetchJsonFromPage(page, `/api/v1/projects/${projectId}/audit`);
  expect(audit.status).toBe(200);
  const auditPayload = audit.body;
  expect(auditPayload.data.map((entry: { action: string }) => entry.action)).toEqual(
    expect.arrayContaining([
      "PROJECT_CREATED",
      "BIDS_IMPORTED",
      "MATCH_PLAN_RECALCULATED",
      "MATCH_PLAN_CONFIRMED",
      "PICKUP_OPERATION_UPDATED",
      "SETTLEMENT_STATUS_UPDATED",
    ]),
  );
});
