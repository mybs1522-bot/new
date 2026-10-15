import * as React from 'react';
import {
  FloatingIconsHero,
  type FloatingIconsHeroProps,
} from '@/components/ui/floating-icons-hero-section';

// --- 16 Bespoke Crochet Design SVG Icons ---

// 1. Yarn Ball with Trailing Thread
export const IconYarnBall = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" fill="#EC4899" fillOpacity="0.2" stroke="#EC4899" strokeWidth="1.8" />
    <path d="M5.5 8C8.5 6.5 14.5 7 18 10.5" stroke="#F472B6" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M4 12C7.5 11 15 11.5 19 14.5" stroke="#F472B6" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M6 16C9 15.5 14.5 16 17.5 18" stroke="#F472B6" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M12 3C11 7 11.5 16 13 21" stroke="#DB2777" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M18 19C19 21 21 21.5 22 20.5" stroke="#EC4899" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// 2. Ergonomic Crochet Hook
export const IconCrochetHook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 20L13.5 10.5" stroke="#A855F7" strokeWidth="3" strokeLinecap="round" />
    <path d="M13.5 10.5L19 5C19.5 4.5 20.5 4 21 4.5C21.5 5 21 6 20.5 6.5L18.5 8.5C18 9 17 9 16.5 8.5" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 21C2.5 20.5 3 19 4 20Z" fill="#7E22CE" />
  </svg>
);

// 3. Traditional Granny Square Motif
export const IconGrannySquare = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="#6366F1" strokeWidth="1.8" fill="#6366F1" fillOpacity="0.15" />
    <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" stroke="#818CF8" strokeWidth="1.5" />
    <rect x="10" y="10" width="4" height="4" rx="0.5" fill="#4F46E5" />
    <circle cx="12" cy="5" r="1" fill="#818CF8" />
    <circle cx="12" cy="19" r="1" fill="#818CF8" />
    <circle cx="5" cy="12" r="1" fill="#818CF8" />
    <circle cx="19" cy="12" r="1" fill="#818CF8" />
  </svg>
);

// 4. Amigurumi Teddy Bear Head
export const IconAmigurumiBear = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="6" cy="6" r="3" fill="#F59E0B" fillOpacity="0.4" stroke="#D97706" strokeWidth="1.5" />
    <circle cx="18" cy="6" r="3" fill="#F59E0B" fillOpacity="0.4" stroke="#D97706" strokeWidth="1.5" />
    <circle cx="12" cy="13" r="8" fill="#FBBF24" fillOpacity="0.25" stroke="#D97706" strokeWidth="1.8" />
    <circle cx="9.5" cy="11.5" r="1" fill="#78350F" />
    <circle cx="14.5" cy="11.5" r="1" fill="#78350F" />
    <ellipse cx="12" cy="15" rx="2.5" ry="1.8" fill="#FEF3C7" stroke="#D97706" strokeWidth="1" />
    <path d="M11 14.5C11.5 15 12.5 15 13 14.5" stroke="#78350F" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// 5. Puffy Crochet Heart
export const IconCrochetHeart = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 20.5S3 14.5 3 8.5A5.5 5.5 0 0 1 12 5.09A5.5 5.5 0 0 1 21 8.5C21 14.5 12 20.5 12 20.5Z"
      fill="#F43F5E"
      fillOpacity="0.25"
      stroke="#F43F5E"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M7 8C7.5 9.5 9 11 12 12" stroke="#FB7185" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1 2" />
    <path d="M17 8C16.5 9.5 15 11 12 12" stroke="#FB7185" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1 2" />
  </svg>
);

// 6. Vintage Stork Embroidery Scissors
export const IconStorkScissors = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="6" cy="18" r="3" stroke="#F59E0B" strokeWidth="1.6" />
    <circle cx="12" cy="18" r="3" stroke="#F59E0B" strokeWidth="1.6" />
    <path d="M8 15L15 4L16 5L10 16" stroke="#D97706" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M15 4L20 8" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// 7. Yarn Skein with Product Band
export const IconYarnSkein = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="12" rx="9" ry="5.5" fill="#10B981" fillOpacity="0.2" stroke="#10B981" strokeWidth="1.8" />
    <rect x="9.5" y="6.5" width="5" height="11" rx="1" fill="#047857" fillOpacity="0.4" stroke="#059669" strokeWidth="1.2" />
    <path d="M5 10C5.5 12 5.5 13 5 14" stroke="#34D399" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M19 10C18.5 12 18.5 13 19 14" stroke="#34D399" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// 8. Crochet Sunflower Applique
export const IconCrochetSunflower = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="4" fill="#92400E" stroke="#78350F" strokeWidth="1.5" />
    <circle cx="12" cy="5" r="2.2" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />
    <circle cx="12" cy="19" r="2.2" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />
    <circle cx="5" cy="12" r="2.2" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />
    <circle cx="19" cy="12" r="2.2" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />
    <circle cx="7" cy="7" r="2" fill="#FCD34D" />
    <circle cx="17" cy="7" r="2" fill="#FCD34D" />
    <circle cx="7" cy="17" r="2" fill="#FCD34D" />
    <circle cx="17" cy="17" r="2" fill="#FCD34D" />
  </svg>
);

// 9. Locking Stitch Marker
export const IconStitchMarker = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 4C8.5 4 6 7 6 11C6 16 11 20 12 21C13 20 18 16 18 11C18 7 15.5 4 12 4Z"
      fill="#06B6D4"
      fillOpacity="0.25"
      stroke="#0891B2"
      strokeWidth="1.8"
    />
    <circle cx="12" cy="10" r="2" fill="#22D3EE" />
  </svg>
);

// 10. Crochet Pom-Pom Beanie
export const IconCrochetBeanie = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="4" r="2.2" fill="#EC4899" stroke="#BE185D" strokeWidth="1.4" />
    <path
      d="M5 17C5 10 7.5 6 12 6C16.5 6 19 10 19 17"
      fill="#F472B6"
      fillOpacity="0.25"
      stroke="#DB2777"
      strokeWidth="1.8"
    />
    <rect x="4" y="17" width="16" height="4" rx="2" fill="#BE185D" />
    <line x1="8" y1="17" x2="8" y2="21" stroke="#FCE7F3" strokeWidth="1" />
    <line x1="12" y1="17" x2="12" y2="21" stroke="#FCE7F3" strokeWidth="1" />
    <line x1="16" y1="17" x2="16" y2="21" stroke="#FCE7F3" strokeWidth="1" />
  </svg>
);

// 11. Amigurumi Frog
export const IconAmigurumiFrog = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="14" rx="8" ry="6" fill="#10B981" fillOpacity="0.3" stroke="#059669" strokeWidth="1.8" />
    <circle cx="7" cy="8" r="2.5" fill="#34D399" stroke="#059669" strokeWidth="1.5" />
    <circle cx="17" cy="8" r="2.5" fill="#34D399" stroke="#059669" strokeWidth="1.5" />
    <circle cx="7" cy="8" r="1" fill="#064E3B" />
    <circle cx="17" cy="8" r="1" fill="#064E3B" />
    <path d="M8 15C10 17 14 17 16 15" stroke="#065F46" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// 12. Tapestry / Yarn Needle
export const IconTapestryNeedle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 21L19 5" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" />
    <ellipse cx="19" cy="5" rx="1.5" ry="3" transform="rotate(-45 19 5)" stroke="#64748B" strokeWidth="1.2" fill="#CBD5E1" />
    <path d="M19 5C17 2 13 2 11 4" stroke="#F43F5E" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
  </svg>
);

// 13. Baby Crochet Bootie
export const IconCrochetBootie = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6 5H11V11C11 11 16 11 18 13C20 15 20 18 18 19C16 20 6 20 5 19C4 18 4 14 6 12V5Z"
      fill="#38BDF8"
      fillOpacity="0.25"
      stroke="#0284C7"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="11" r="1.5" fill="#F472B6" />
  </svg>
);

// 14. Crochet Magic Ring Diagram
export const IconMagicRing = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="7" stroke="#A855F7" strokeWidth="1.8" strokeDasharray="3 3" />
    <circle cx="12" cy="12" r="3" fill="#C084FC" fillOpacity="0.4" stroke="#7E22CE" strokeWidth="1.4" />
    <path d="M12 5V2" stroke="#A855F7" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M19 12H22" stroke="#A855F7" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M12 19V22" stroke="#A855F7" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M5 12H2" stroke="#A855F7" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// 15. Flexible Measuring Tape
export const IconMeasuringTape = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="12" r="6" fill="#FDE047" fillOpacity="0.3" stroke="#CA8A04" strokeWidth="1.8" />
    <path d="M10 18H20C21 18 22 17 22 16V14C22 13 21 12 20 12H16" stroke="#CA8A04" strokeWidth="1.6" />
    <line x1="17" y1="12" x2="17" y2="14" stroke="#854D0E" strokeWidth="1" />
    <line x1="19" y1="12" x2="19" y2="15" stroke="#854D0E" strokeWidth="1" />
  </svg>
);

// 16. Chunky Mesh Market Bag
export const IconCrochetBag = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 8V5C8 3.5 10 3 12 3C14 3 16 3.5 16 5V8" stroke="#FB923C" strokeWidth="1.8" strokeLinecap="round" />
    <path
      d="M5 8H19L18 20C18 21 17 22 16 22H8C7 22 6 21 6 20L5 8Z"
      fill="#F97316"
      fillOpacity="0.2"
      stroke="#EA580C"
      strokeWidth="1.8"
    />
    <path d="M8 12L16 16M16 12L8 16" stroke="#FB923C" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// 16 Custom Positioned Crochet Icons
export const crochetHeroIcons: FloatingIconsHeroProps['icons'] = [
  { id: 1, icon: IconYarnBall, className: 'top-[8%] left-[8%]' },
  { id: 2, icon: IconCrochetHook, className: 'top-[16%] right-[8%]' },
  { id: 3, icon: IconGrannySquare, className: 'top-[78%] left-[8%]' },
  { id: 4, icon: IconAmigurumiBear, className: 'bottom-[10%] right-[10%]' },
  { id: 5, icon: IconCrochetHeart, className: 'top-[4%] left-[28%]' },
  { id: 6, icon: IconStorkScissors, className: 'top-[4%] right-[28%]' },
  { id: 7, icon: IconYarnSkein, className: 'bottom-[12%] left-[22%]' },
  { id: 8, icon: IconCrochetSunflower, className: 'top-[42%] left-[6%]' },
  { id: 9, icon: IconStitchMarker, className: 'top-[75%] right-[24%]' },
  { id: 10, icon: IconCrochetBeanie, className: 'top-[86%] left-[64%]' },
  { id: 11, icon: IconAmigurumiFrog, className: 'top-[48%] right-[6%]' },
  { id: 12, icon: IconTapestryNeedle, className: 'top-[58%] left-[16%]' },
  { id: 13, icon: IconCrochetBootie, className: 'top-[6%] left-[52%]' },
  { id: 14, icon: IconMagicRing, className: 'bottom-[8%] right-[42%]' },
  { id: 15, icon: IconMeasuringTape, className: 'top-[26%] right-[18%]' },
  { id: 16, icon: IconCrochetBag, className: 'top-[65%] left-[30%]' },
];

export default function CrochetFloatingHeroDemo() {
  return (
    <FloatingIconsHero
      title="Where Every Stitch Comes to Life"
      subtitle="Discover our complete treasury of 1,000+ amigurumi plushies, cozy wearables, and home decor patterns with step-by-step stitch guides."
      ctaText="Unlock All Patterns — $9.99/mo"
      ctaHref="#catalog"
      icons={crochetHeroIcons}
    />
  );
}
