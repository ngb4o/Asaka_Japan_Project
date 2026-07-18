import {
  HeroSection,
  AboutSection,
  WhyChooseSection,
  StatsSection,
  FeaturedProductsSection,
  ManufacturingSection,
  TestimonialsSection,
  NewsSection,
  BecomeDealerSection,
} from "@/components/sections";

export default function HomePage() {
  return (
    <main id="main-content">
      <HeroSection />
      <AboutSection />
      <WhyChooseSection />
      <StatsSection />
      <FeaturedProductsSection />
      <ManufacturingSection />
      <TestimonialsSection />
      <NewsSection />
      <BecomeDealerSection />
    </main>
  );
}
