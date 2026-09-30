import * as React from "react";
import CalendarHomePage from "@/app/page";
import type { Metadata } from "next";

interface CampusRouteProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CampusRouteProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Campus Events (${slug}) — Campus Calendar`,
    description: `Discover all official student events, hackathons, and activities at ${slug}.`,
  };
}

export default async function CampusCalendarPage({ params }: CampusRouteProps) {
  const { slug } = await params;
  return <CalendarHomePage campusSlug={slug} />;
}
