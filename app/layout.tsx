import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenCourt | Indigenous Case Database",
  description: "Plain-language guides to Canadian court cases involving Indigenous rights, treaties, land, governance, consultation and title.",
  openGraph: { title: "Understand Indigenous Court Cases in Canada | OpenCourt", description: "Explore verified court decisions and the relationships between them, explained in plain language.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
