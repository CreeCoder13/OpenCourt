export const primaryNavigation = [
  ["Timeline", "/timeline"],
  ["Cases", "/cases"],
  ["Laws", "/laws"],
  ["Indigenous Communities", "/communities"],
  ["Legal Definitions", "/topics"],
  ["Treaties", "/treaties"],
] as const;

export const homeSectionLinks = {
  allCases: "/cases",
  allDefinitions: "/topics",
} as const;

export const casePath = (slug: string) => `/cases/${slug}` as const;
