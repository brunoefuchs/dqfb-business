import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { ModulesGrid } from '@/components/sections/ModulesGrid';
import { QuoteSection } from '@/components/sections/QuoteSection';

export default function Home() {
  return (
    <>
      <Header />
      <main
        id="main-content"
        className="flex-grow max-w-[1920px] mx-auto w-full px-8 py-12 flex flex-col justify-center md:px-8"
      >
        <HeroSection />
        <ModulesGrid />
        <QuoteSection />
      </main>
      <Footer />
    </>
  );
}
