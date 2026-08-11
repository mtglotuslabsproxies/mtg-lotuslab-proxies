import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://mtg-lotuslab-proxies-roan.vercel.app';
  const locales = ['en', 'fr', 'es', 'de', 'it', 'pt', 'ja', 'ko', 'zhs'];

  return locales.map((locale) => ({
    url: `${baseUrl}/${locale}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: locale === 'en' ? 1 : 0.8,
  }));
}
