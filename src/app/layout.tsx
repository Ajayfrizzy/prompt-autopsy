import "./globals.css";
export const metadata = { title: "Prompt Autopsy", description: "Evidence-backed review of AI coding failures" };
export default function Layout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
