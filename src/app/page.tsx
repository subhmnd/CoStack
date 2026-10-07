import { Navbar } from "@/components/layout/Navbar";
import { HeroSearch } from "@/components/landing/HeroSearch";

export const metadata = {
  title: "Co.Stack — Search what you want to install",
  description: "Deterministic visual infrastructure stack builder. Minimal, verified, and instant.",
};

export default function HomePage() {
  return (
    <main className="relative min-h-screen w-full bg-white dark:bg-black selection:bg-purple-500/20">
      <Navbar />
      <HeroSearch />
    </main>
  );
}
