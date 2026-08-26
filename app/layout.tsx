import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://opencourt-canada.t98ymftg9z.chatgpt.site"),
  title: "OpenCourt | Indigenous Case Database",
  description: "Plain-language guides to Canadian court cases involving Indigenous rights, treaties, land, governance, consultation and title.",
  openGraph: {
    title: "Understand Indigenous Court Cases in Canada | OpenCourt",
    description: "Explore verified court decisions and the relationships between them, explained in plain language.",
    type: "website",
    url: "/",
    siteName: "OpenCourt",
    images: [{ url: "/og.png", width: 1743, height: 907, alt: "Understand Indigenous Court Cases in Canada — OpenCourt" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Understand Indigenous Court Cases in Canada | OpenCourt",
    description: "Explore verified court decisions and the relationships between them, explained in plain language.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
