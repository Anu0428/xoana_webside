export interface GalleryImage {
  src: string;
  alt: string;
  fit: 'cover' | 'contain';
}

export const DEFAULT_GALLERY_IMAGES: GalleryImage[] = [
  { src: '/gallery/xoana-gallery-01-blue-character.jpg', alt: 'XOANA 蓝色人物指板板面', fit: 'cover' },
  { src: '/gallery/xoana-gallery-02-orange-character.jpg', alt: 'XOANA 橙色人物指板板面', fit: 'cover' },
  { src: '/gallery/xoana-gallery-03-green-deck.jpg', alt: 'XOANA 绿色水珠指板板面', fit: 'contain' },
  { src: '/gallery/xoana-gallery-04-blue-deck.jpg', alt: 'XOANA 蓝色手写标识指板板面', fit: 'contain' },
  { src: '/gallery/xoana-gallery-05-brown-deck.jpg', alt: 'XOANA 棕色手写标识指板板面', fit: 'contain' },
  { src: '/gallery/xoana-gallery-06-yellow-deck.jpg', alt: 'XOANA 金黄色手写标识指板板面', fit: 'contain' },
  { src: '/gallery/xoana-gallery-07-orange-deck.jpg', alt: 'XOANA 橙色手写标识指板板面', fit: 'contain' },
  { src: '/gallery/xoana-gallery-08-green-water-deck.jpg', alt: 'XOANA 绿色水珠细节指板板面', fit: 'contain' },
  { src: '/gallery/xoana-gallery-09-collection.jpg', alt: 'XOANA 四色指板板面合集', fit: 'contain' },
];

// An empty array is intentional; only absent/null data uses the legacy gallery.
export function getGalleryImages(settings: Record<string, unknown>): GalleryImage[] {
  if (Array.isArray(settings.galleryImages)) {
    return settings.galleryImages.map((image: GalleryImage) => ({
      src: image.src,
      alt: image.alt || 'XOANA Gallery',
      fit: image.fit === 'contain' ? 'contain' : 'cover',
    }));
  }
  const legacyImages = [1, 2, 3, 4, 5]
    .map(index => settings[`galleryImage${index}`])
    .filter((src): src is string => typeof src === 'string' && src.trim().length > 0)
    .map((src, index): GalleryImage => ({ src, alt: `XOANA Gallery ${index + 1}`, fit: 'cover' }));
  return [...DEFAULT_GALLERY_IMAGES, ...legacyImages];
}

export function galleryImageUrl(src: string): string {
  if (!src.startsWith('/uploads/')) return src;
  const base = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
  return `${base.replace(/\/$/, '')}${src}`;
}
