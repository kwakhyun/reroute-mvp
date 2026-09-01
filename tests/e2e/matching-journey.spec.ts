import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const demoProjectPath = "/projects/project-seongsu-relocation";

test.describe.configure({ mode: "serial" });

async function demoLogin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "포트폴리오 데모 바로 열기" }).click();
  await expect(page).toHaveURL("/projects");
}

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
  expect(scriptNonces.every(Boolean)).toBe(true);

  await page.getByRole("button", { name: "포트폴리오 데모 바로 열기" }).click();
  const foreignPage = await page.goto("/projects/project-foreign-audit/matching");
  expect(foreignPage?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "요청한 화면을 찾을 수 없습니다." })).toBeVisible();
});

test("시드 매칭안의 회수 하한과 배정 근거를 읽기 전용으로 검증한다", async ({ page }) => {
  await demoLogin(page);
  await page.goto(`${demoProjectPath}/matching`);
  await expect(page.getByRole("heading", { name: "성수 오피스 이전" })).toBeVisible();

  const summary = page.getByRole("region", { name: "추천 매칭안 결과" });
  await expect(summary).toContainText("1,840");
  await expect(summary).toContainText("300");
  await expect(summary).toContainText("2,140");
  await expect(summary).toContainText("86.9");
  await expect(page.getByText("현금 회수 1,740만 원 이상")).toBeVisible();

  const proposal = page.getByRole("region", { name: "추천 매칭안 표" });
  await expect(proposal.getByRole("columnheader", { name: "자산군" })).toBeVisible();
  for (const asset of ["회의용 의자", "모니터 암", "이동 서랍", "라운지 테이블"]) {
    await expect(proposal.getByText(asset, { exact: true })).toBeVisible();
  }

  const summaryResponse = await page.request.get(`/api/v1${demoProjectPath}/summary`);
  expect(summaryResponse.status()).toBe(200);
  const payload = await summaryResponse.json();
  expect(payload.data.bidCount).toBe(11);
  expect(payload.data.allocations).toHaveLength(4);
  expect(payload.data.allocations.every((allocation: { assetGroupId?: string; assetGroupName?: string }) => allocation.assetGroupId && allocation.assetGroupName)).toBe(true);

  await page.getByRole("link", { name: "입찰 11건 보기" }).click();
  await expect(page.getByRole("heading", { name: "입찰 11건" })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(11);
  await expect(page.locator("tr.bid-selected")).toHaveCount(4);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "CSV 내보내기" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("project-seongsu-relocation-bids.csv");
});

test("새 프로젝트를 입찰 가져오기부터 확정과 운영 인계까지 독립적으로 완주한다", async ({ page }, testInfo) => {
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

  const createdSummary = await page.request.get(`/api/v1/projects/${projectId}/summary`);
  const createdPayload = await createdSummary.json();
  expect(createdPayload.data.project.minimumCashRecovery).toBe(1740);
  expect(createdPayload.data.bidCount).toBe(0);
  expect(createdPayload.data.plan).toBeNull();
  const assets = createdPayload.data.assets as Array<{ id: string; name: string; quantity: number; minimumRecovery: number }>;

  await page.getByRole("link", { name: "입찰" }).click();
  await expect(page.getByRole("heading", { name: "입찰 0건" })).toBeVisible();
  const bidHeader = [
    "assetGroupId", "assetGroupName", "partnerName", "partnerType", "verificationLabel",
    "verificationReference", "verificationExpiresOn", "quantity", "cashRecovery", "costSavings",
    "reuseQuantity", "performanceLabel", "performanceRate", "pickupDate",
  ].join(",");
  const bidRows = assets.map((asset, index) => [
    asset.id,
    asset.name,
    `파일럿 수요처 ${index + 1}`,
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
  await page.getByRole("button", { name: "검증 후 교체" }).click();
  await expect(page.getByText("입찰 4건을 검증 근거와 함께 가져왔습니다. 이제 매칭안을 계산할 수 있습니다.")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(4);

  await page.getByRole("link", { name: "매칭" }).click();
  await expect(page.getByText("아직 계산된 매칭안이 없습니다.")).toBeVisible();
  await page.getByRole("button", { name: "조건 다시 계산" }).click();
  const recalculation = page.getByRole("dialog", { name: "매칭 조건 다시 계산" });
  await expect(recalculation.getByLabel("최소 현금 회수액")).toHaveValue("1740");
  await recalculation.getByRole("button", { name: "새 조건으로 계산" }).click();
  await expect(recalculation.getByText("새 매칭안을 계산했습니다.")).toBeVisible();
  await recalculation.getByRole("button", { name: "결과 확인" }).click();

  const result = page.getByRole("region", { name: "추천 매칭안 결과" });
  await expect(result).toContainText("1,740");
  await expect(result).toContainText("100.0");
  await page.getByRole("button", { name: "매칭안 확정" }).click();
  const confirmation = page.getByRole("dialog", { name: "이 매칭안을 확정할까요?" });
  await expect(confirmation.getByText("자산군 배정 4건")).toBeVisible();
  for (const asset of assets) await expect(confirmation.getByText(asset.name, { exact: true })).toBeVisible();
  await confirmation.getByRole("button", { name: "확정하고 운영 인계" }).click();
  await expect(confirmation.getByText("매칭안이 확정되었습니다.", { exact: true })).toBeVisible();
  await confirmation.getByRole("button", { name: "확정 결과 보기" }).click();

  await page.getByRole("link", { name: "수거 운영 보기" }).click();
  await expect(page.getByRole("heading", { name: "수거 운영 1회" })).toBeVisible();
  await expect(page.locator("article.pickup-round")).toHaveCount(1);
  await page.getByRole("link", { name: "정산" }).click();
  await expect(page.getByText("결제사 미연동", { exact: true })).toBeVisible();

  const audit = await page.request.get(`/api/v1/projects/${projectId}/audit`);
  expect(audit.status()).toBe(200);
  const auditPayload = await audit.json();
  expect(auditPayload.data.map((entry: { action: string }) => entry.action)).toEqual(
    expect.arrayContaining(["PROJECT_CREATED", "BIDS_IMPORTED", "MATCH_PLAN_RECALCULATED", "MATCH_PLAN_CONFIRMED"]),
  );
});
