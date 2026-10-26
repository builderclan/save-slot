import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { SidebarCategoryFilter } from "../sidebar-category-filter";
import { SidebarHorizonFilter } from "../sidebar-horizon-filter";
import type { EventCategory } from "@/types/database";

describe("Sidebar Filters Components", () => {
  const mockCategories: EventCategory[] = [
    "Tech",
    "Arts",
    "Sports",
    "Career",
    "Academic",
    "Social",
    "Workshop",
  ];

  describe("SidebarCategoryFilter", () => {
    it("renders category items with live counts", () => {
      const counts: Record<string, number> = {
        Tech: 5,
        Arts: 2,
        Sports: 0,
      };

      const html = renderToString(
        <SidebarCategoryFilter
          categories={mockCategories}
          selectedCategories={["Tech", "Arts"]}
          onToggleCategory={vi.fn()}
          onSelectAll={vi.fn()}
          onClear={vi.fn()}
          onSelectOnly={vi.fn()}
          categoryCounts={counts}
        />
      );

      expect(html).toContain("Calendars");
      expect(html).toContain("Tech");
      expect(html).toContain("Arts");
      expect(html).toContain("Sports");
      expect(html).toContain("5");
      expect(html).toContain("2");
      expect(html).toContain("0");
      expect(html).toContain("Only");
    });

    it("disables 'All' action when all categories are selected", () => {
      const html = renderToString(
        <SidebarCategoryFilter
          categories={mockCategories}
          selectedCategories={[...mockCategories]}
          onToggleCategory={vi.fn()}
          onSelectAll={vi.fn()}
          onClear={vi.fn()}
          onSelectOnly={vi.fn()}
        />
      );

      expect(html).toContain("disabled=\"\"");
    });
  });

  describe("SidebarHorizonFilter", () => {
    it("renders horizon options and label", () => {
      const html = renderToString(
        <SidebarHorizonFilter
          selectedHorizon="today"
          onChangeHorizon={vi.fn()}
        />
      );

      expect(html).toContain("Time Horizon");
      expect(html).toContain("Today");
      expect(html).toContain("7 Days");
      expect(html).toContain("Weekend");
    });
  });
});
