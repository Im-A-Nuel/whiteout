import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Pixelify_Sans } from "next/font/google";
import "../styles/pixel.css";

const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap", weight: ["400", "500", "600", "700"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Whiteout",
  description: "A blizzard roguelike where the chain can't see you die. Fog of war on Zama's FHEVM.",
  icons: { icon: "/sprites/lantern.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e1029" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pixel.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
