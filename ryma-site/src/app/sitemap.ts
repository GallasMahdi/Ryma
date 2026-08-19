import { MetadataRoute } from 'next';
import { SERVICES } from '@/data/services';
import { BLOG_POSTS } from '@/data/blog-posts';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://digitalclinica.pt';
  const lastModified = new Date();

  const staticPages = [
    { url: baseUrl, priority: 1.0 },
    { url: `${baseUrl}/a-propos`, priority: 0.8 },
    { url: `${baseUrl}/services`, priority: 0.9 },
    { url: `${baseUrl}/tarifs`, priority: 0.8 },
    { url: `${baseUrl}/blog`, priority: 0.7 },
    { url: `${baseUrl}/avis`, priority: 0.7 },
    { url: `${baseUrl}/contact`, priority: 0.8 },
    { url: `${baseUrl}/rendez-vous`, priority: 0.9 },
  ].map(p => ({ ...p, lastModified, changeFrequency: 'monthly' as const }));

  const servicePages = SERVICES.map(s => ({
    url: `${baseUrl}/services/${s.slug}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const blogPages = BLOG_POSTS.map(p => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...servicePages, ...blogPages];
}
