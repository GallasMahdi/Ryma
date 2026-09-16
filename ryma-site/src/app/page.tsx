import { Hero } from '@/components/sections/Hero';
import { UnifiedServicesExplorer } from '@/components/sections/UnifiedServicesExplorer';
import { BeforeAfterGallery } from '@/components/sections/BeforeAfterGallery';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { BlogPreview } from '@/components/sections/BlogPreview';
import { CTABanner } from '@/components/sections/CTABanner';

export default function HomePage() {
  return (
    <>
      <Hero />
      <UnifiedServicesExplorer />
      <BeforeAfterGallery />
      <TestimonialsSection />
      <CTABanner />
    </>
  );
}
