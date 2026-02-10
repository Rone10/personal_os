import { Fraunces, Alegreya_Sans } from "next/font/google";
import "./study.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-study-display",
  weight: ["400", "600", "700"],
});

const alegreyaSans = Alegreya_Sans({
  subsets: ["latin"],
  variable: "--font-study-body",
  weight: ["400", "500", "700"],
});

export default function StudyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${fraunces.variable} ${alegreyaSans.variable} study-root h-full`}
    >
      {children}
    </div>
  );
}
