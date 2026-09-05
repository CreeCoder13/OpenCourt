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

export const caseSummaryPath = (slug: string) => `${casePath(slug)}#analysis` as const;

export const lawPath = (slug: string) => `/laws/${slug}` as const;
