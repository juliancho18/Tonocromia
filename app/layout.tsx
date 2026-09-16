import type { Metadata } from "next";
import { Inria_Serif, Lexend_Zetta, Inter, Unbounded } from "next/font/google";
import "./globals.css";

const inriaSerif = Inria_Serif({
  variable: "--font-inria-serif",
  weight: ["300", "400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const lexendZetta = Lexend_Zetta({
  variable: "--font-lexend-zetta",
  weight: ["200", "300"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["200", "300", "400"],
  subsets: ["latin"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  weight: ["400", "600", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tonocromía",
  description: "Escúchalo en colores",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      data-skin="futurista"
      className={`${inriaSerif.variable} ${lexendZetta.variable} ${inter.variable} ${unbounded.variable}`}
    >
      <body>
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
