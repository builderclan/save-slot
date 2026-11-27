import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { SidebarCategoryFilter } from "../sidebar-category-filter";
import { SidebarHorizonFilter } from "../sidebar-horizon-filter";
import { SidebarOriginFilter } from "../sidebar-origin-filter";
import { EventOriginBadge, getEventHostLabel } from "../event-origin-badge";
import type { CampusEvent, Department, EventCategory } from "@/types/database";

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

  describe("SidebarOriginFilter", () => {
    const mockDepartments: Department[] = [
      { id: "dept-cse", name: "Computer Science", code: "CSE", is_acting_hod_active: false, is_active: true },
      { id: "dept-ece", name: "Electronics", code: "ECE", is_acting_hod_active: false, is_active: true },
    ];

    it("renders all origin pills and department options", () => {
      const html = renderToString(
        <SidebarOriginFilter
          selectedOrigin="community_external"
          onChangeOrigin={vi.fn()}
          selectedDepartmentId="dept-cse"
          onChangeDepartmentId={vi.fn()}
          departments={mockDepartments}
          idPrefix="test"
        />
      );

      const text = html.replace(/<!-- -->/g, "");
      expect(text).toContain("Host Origin");
      expect(text).toContain("College");
      expect(text).toContain("Department");
      expect(text).toContain("Community · Internal");
      expect(text).toContain("Community · External");
      expect(text).toContain("CSE — Computer Science");
      expect(text).toContain("ECE — Electronics");
    });
  });

  describe("EventOriginBadge & getEventHostLabel", () => {
    it("renders College, Dept, Internal, and External badges", () => {
      const collegeEv = { origin_type: "college" } as CampusEvent;
      const deptEv = { origin_type: "department", department: { id: "d1", name: "CSE", code: "CSE" } } as CampusEvent;
      const internalEv = { origin_type: "community", community: { id: "c1", name: "Coding Club", scope: "internal" } } as CampusEvent;
      const externalEv = { origin_type: "community", community: { id: "c2", name: "IEEE SB", scope: "external" } } as CampusEvent;

      expect(getEventHostLabel(collegeEv)).toBe("College Event");
      expect(getEventHostLabel(deptEv)).toBe("CSE");
      expect(renderToString(<EventOriginBadge event={collegeEv} />)).toContain("College");
      expect(renderToString(<EventOriginBadge event={deptEv} />).replace(/<!-- -->/g, "")).toContain("Dept · CSE");
      expect(renderToString(<EventOriginBadge event={internalEv} />)).toContain("Internal");
      expect(renderToString(<EventOriginBadge event={externalEv} />)).toContain("External");
    });
  });
});
