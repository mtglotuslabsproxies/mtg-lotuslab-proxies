import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import "./globals.css";
import "@saeris/typeface-beleren-bold";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";

const inter = Inter({ subsets: ["latin"] });
const ebGaramond = EB_Garamond({ subsets: ["latin"], variable: "--font-mplantin" });

export const metadata: Metadata = {
  title: "MTG LotusLab Proxies",
  description: "High quality French MTG proxy generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} ${ebGaramond.variable} antialiased min-h-screen bg-background`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="fixed inset-0 -z-50 pointer-events-none opacity-[0.15] bg-[url('/images/bg_texture.jpg')] bg-cover bg-center bg-no-repeat bg-fixed mix-blend-overlay"></div>
          <I18nProvider>
            {children}
          </I18nProvider>
          <a
            href="https://ko-fi.com/S4Z724NAYM"
            target="_blank"
            rel="noopener noreferrer"
            className="group fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-zinc-800/80 hover:bg-[#72a4f2] text-zinc-300 hover:text-white px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 shadow-md backdrop-blur-sm border border-white/5"
            title="Support the project on Ko-fi"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
              <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.57s1.902.145 2.24 2.959c.214 1.814-1.2 2.68-2.128 2.683z"/>
            </svg>
            <span className="whitespace-nowrap">Support me</span>
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-[max-width] duration-300 ease-in-out">
              <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 italic block">
                - Thank you! ❤️
              </span>
            </span>
          </a>
        </ThemeProvider>
      </body>
    </html>
  );
}
