// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectAction } from "@/app/actions/projects";
import { ProjectCreateForm } from "./project-create-form";

vi.mock("@/app/actions/projects", () => ({ createProjectAction: vi.fn() }));
vi.mock("@phosphor-icons/react", () => ({ DownloadSimple: () => null, FileCsv: () => null, Plus: () => null }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const organizations = [
  { id: "organization-1", name: "첫 번째 조직", role: "MANAGER" as const },
  { id: "organization-2", name: "두 번째 조직", role: "APPROVER" as const },
];

describe("ProjectCreateForm", () => {
  it("preserves every input and the selected CSV after an error, then submits the corrected values", async () => {
    const user = userEvent.setup();
    vi.mocked(createProjectAction).mockResolvedValue({ status: "error", message: "CSV 필수 열을 확인해 주세요." });
    render(<ProjectCreateForm organizations={organizations} />);

    fireEvent.change(screen.getByLabelText("조직"), { target: { value: "organization-2" } });
    fireEvent.change(screen.getByLabelText("프로젝트명"), { target: { value: "판교 오피스 이전" } });
    fireEvent.change(screen.getByLabelText("위치"), { target: { value: "경기 성남시 분당구" } });
    fireEvent.change(screen.getByLabelText(/자산 묶음 설명/), { target: { value: "가구 15개" } });
    const minimumCashRecovery = screen.getByRole("spinbutton", { name: /최소 매각 금액/ });
    const minimumReuseRate = screen.getByRole("spinbutton", { name: /최소 재사용률/ });
    const maximumPickupRounds = screen.getByRole("spinbutton", { name: /최대 수거 횟수/ });
    fireEvent.change(minimumCashRecovery, { target: { value: "120" } });
    fireEvent.change(minimumReuseRate, { target: { value: "82.5" } });
    fireEvent.change(maximumPickupRounds, { target: { value: "2" } });
    const fileInput = screen.getByLabelText(/자산 CSV 파일 선택/) as HTMLInputElement;
    const invalidFile = new File(["name,quantity\n책상,15"], "invalid-assets.csv", { type: "text/csv" });
    await user.upload(fileInput, invalidFile);

    // jsdom's native file validation does not read userEvent.upload's FileList.
    fireEvent.submit(fileInput.form!);
    expect(await screen.findByRole("alert")).toHaveTextContent("CSV 필수 열을 확인해 주세요.");
    expect(screen.getByLabelText("조직")).toHaveValue("organization-2");
    expect(screen.getByLabelText("프로젝트명")).toHaveValue("판교 오피스 이전");
    expect(screen.getByLabelText("위치")).toHaveValue("경기 성남시 분당구");
    expect(screen.getByLabelText(/자산 묶음 설명/)).toHaveValue("가구 15개");
    expect(minimumCashRecovery).toHaveValue(120);
    expect(minimumReuseRate).toHaveValue(82.5);
    expect(maximumPickupRounds).toHaveValue(2);
    expect(fileInput.files?.[0]).toBe(invalidFile);

    const correctedFile = new File(["corrected fixture"], "corrected-assets.csv", { type: "text/csv" });
    await user.upload(fileInput, correctedFile);
    fireEvent.change(minimumCashRecovery, { target: { value: "123" } });
    fireEvent.submit(fileInput.form!);
    await waitFor(() => expect(createProjectAction).toHaveBeenCalledTimes(2));
    const submitted = vi.mocked(createProjectAction).mock.calls[1][1];
    expect(Object.fromEntries(submitted)).toMatchObject({
      organizationId: "organization-2",
      name: "판교 오피스 이전",
      location: "경기 성남시 분당구",
      batchLabel: "가구 15개",
      minimumCashRecovery: "123",
      minimumReuseRate: "82.5",
      maximumPickupRounds: "2",
    });
    expect(fileInput.files?.[0]).toBe(correctedFile);
  });

  it("accepts integer recovery amounts that are not multiples of ten", () => {
    render(<ProjectCreateForm organizations={organizations} />);
    const amount = screen.getByRole("spinbutton", { name: /최소 매각 금액/ });

    fireEvent.change(amount, { target: { value: "123" } });
    expect(amount).toBeValid();

    fireEvent.change(amount, { target: { value: "123.5" } });
    expect(amount).toBeInvalid();
  });
});
