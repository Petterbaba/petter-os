import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { lesTema, TEMA_COOKIE } from "@/lib/tema";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "petter-os",
  description: "Personlig kontrollrom: styrke, investeringer, metrikker og journal.",
};

// Mobilnettleser-chromen (adressefelt o.l.) skal følge temaet. Verdiene
// speiler --color-bg i globals.css – CSS-tokens kan ikke leses her.
export async function generateViewport(): Promise<Viewport> {
  const tema = lesTema((await cookies()).get(TEMA_COOKIE)?.value);
  return { themeColor: tema === "lys" ? "#f0eee6" : "#0d0d0c" };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Settes server-side så riktig tema er med i HTML-en fra første byte
  // (ingen FOUC). Mørk er standard uten cookie – se globals.css.
  const tema = lesTema((await cookies()).get(TEMA_COOKIE)?.value);
  return (
    <html
      lang="nb"
      data-theme={tema}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
