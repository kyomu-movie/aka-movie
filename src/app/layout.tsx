import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Script Motion Studio",
  description: "台本から図解ステップ動画を生成するローカルツール"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
