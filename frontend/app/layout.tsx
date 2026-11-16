import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Pixelify_Sans } from "next/font/google";
import "../styles/pixel.css";

const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap", weight: ["400", "500", "600", "700"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Whiteout",
  description: "A blizzard roguelike where the chain can’t see you die. Fog of war on Zama’s FHEVM.",
  icons: { icon: "/sprites/lantern.png" },
  openGraph: {
    title: "Whiteout",
    description: "The chain can’t see you die. Position, moves, map and death stay encrypted until the run ends.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Whiteout title screen: a pilgrim and a mountain temple at night" }],
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Whiteout", description: "The chain can’t see you die.", images: ["/og.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e1029" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixel.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
