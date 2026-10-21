// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DecisionCriteria } from "./decision-criteria";

vi.mock("@phosphor-icons/react/dist/ssr", () => ({ CheckCircle: () => null, XCircle: () => null }));

afterEach(cleanup);

describe("decision criteria", () => {
  it.each([[99_999, "미달"], [100_000, "통과"]] as const)(
    "judges %i reused assets against the exact 100%% requirement",
    (reuseQuantity, expected) => {
      render(<DecisionCriteria
        minimumCashRecovery={0}
        minimumReuseRate={100}
        maximumPickupRounds={1}
        cashRecovery={0}
        reuseQuantity={reuseQuantity}
        assetCount={100_000}
        pickupRounds={1}
      />);
      const row = screen.getByText("재사용률 100% 이상").closest("li")!;
      expect(within(row).getByText(expected)).toBeVisible();
    },
  );
});
