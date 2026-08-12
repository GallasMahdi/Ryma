import { Hero } from '@/components/sections/Hero';
import { BodyMap } from '@/components/sections/BodyMap';
import { ServicesHub } from '@/components/sections/ServicesHub';
import { BeforeAfterGallery } from '@/components/sections/BeforeAfterGallery';
import { TestimonialsSection } from '@/components/sections/TestimonialsSection';
import { BlogPreview } from '@/components/sections/BlogPreview';
import { CTABanner } from '@/components/sections/CTABanner';

export default function HomePage() {
  return (
    <>
      <Hero />
      <BodyMap />
      <ServicesHub />
      <BeforeAfterGallery />
      <TestimonialsSection />
      <CTABanner />
    </>
  );
}
