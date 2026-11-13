import { slugifyVendorName } from '../utils/subdomain';

export interface DemoStoreDefinition {
  id: string;
  vendorId: string;
  storeId: string;
  shopName: string;
  storeName: string;
  name: string;
  shopSlug: string;
  storeSlug: string;
  logo: string;
  shopLogo: string;
  category: string;
  description: string;
  primaryColor: string;
  theme: {
    primaryColor: string;
  };
  status: 'active';
  verified: boolean;
  isVerified: boolean;
  verificationStatus: 'verified' | 'unverified';
  followersCount: number;
  followers: number;
  rating: number;
  reviewsCount: number;
  isDemo: true;
  createdAt: number;
}

interface RawDemoStoreSeed {
  shopName: string;
  monogram: string;
  category: string;
}

const RAW_DEMO_STORES: RawDemoStoreSeed[] = [
  { shopName: 'Apex Electronics', monogram: 'AE', category: 'Electronics' },
  { shopName: 'Dhaka Loom House', monogram: 'DL', category: 'Fashion' },
  { shopName: 'Vogue Bazar BD', monogram: 'VB', category: 'Fashion' },
  { shopName: 'Gadget Pulse', monogram: 'GP', category: 'Electronics' },
  { shopName: 'Noor Heritage', monogram: 'NH', category: 'Jewelry & Accessories' },
  { shopName: 'Zenith Audio', monogram: 'ZA', category: 'Electronics' },
  { shopName: 'Urban Thread', monogram: 'UT', category: 'Fashion' },
  { shopName: 'Fresh Basket Mart', monogram: 'FB', category: 'Grocery & Food' },
  { shopName: 'Silk Route Studio', monogram: 'SR', category: 'Fashion' },
  { shopName: 'Nova Smart Gear', monogram: 'NS', category: 'Computer & Gaming' },
  { shopName: 'Crimson Cosmetics', monogram: 'CC', category: 'Beauty & Personal Care' },
  { shopName: 'Bengal Craft Co', monogram: 'BC', category: 'Home & Living' },
  { shopName: 'Metro Footwear', monogram: 'MF', category: 'Fashion' },
  { shopName: 'Pixel Optics', monogram: 'PO', category: 'Electronics' },
  { shopName: 'Aura Skincare', monogram: 'AS', category: 'Beauty & Personal Care' },
  { shopName: 'Titan Sports Zone', monogram: 'TS', category: 'Sports & Outdoor' },
  { shopName: 'Royal Timepieces', monogram: 'RT', category: 'Jewelry & Accessories' },
  { shopName: 'GreenLeaf Organics', monogram: 'GL', category: 'Grocery & Food' },
  { shopName: 'Kidz Kingdom', monogram: 'KK', category: 'Baby & Kids' },
  { shopName: 'Nordic Home Decor', monogram: 'ND', category: 'Home & Living' },
  { shopName: 'ByteForce Gaming', monogram: 'BF', category: 'Computer & Gaming' },
  { shopName: 'Saffron Spice Hub', monogram: 'SS', category: 'Grocery & Food' },
  { shopName: 'Velvet Bag Co', monogram: 'V', category: 'Fashion' },
  { shopName: 'Orion Mobile Lab', monogram: 'OM', category: 'Electronics' },
  { shopName: 'Jamdani Palace', monogram: 'JP', category: 'Fashion' },
  { shopName: 'Peak Outdoor Gear', monogram: 'PK', category: 'Sports & Outdoor' },
  { shopName: 'Lumina Lighting', monogram: 'LL', category: 'Home & Living' },
  { shopName: 'PageTurner Books', monogram: 'PT', category: 'Books & Stationery' },
  { shopName: 'AutoCare Express', monogram: 'AC', category: 'Automotive & Motorbike' },
  { shopName: 'PureGlow Pharmacy', monogram: 'PG', category: 'Health & Wellness' },
  { shopName: 'Cobalt Menswear', monogram: 'CM', category: 'Fashion' },
  { shopName: 'Pearl Boutique', monogram: 'PB', category: 'Jewelry & Accessories' },
  { shopName: 'VoltTech Systems', monogram: 'VT', category: 'Electronics' },
  { shopName: 'Cozy Nest Living', monogram: 'CN', category: 'Home & Living' },
  { shopName: 'Breeze Casuals', monogram: 'BZ', category: 'Fashion' },
  { shopName: 'Harbor Tea Estate', monogram: 'HT', category: 'Grocery & Food' },
  { shopName: 'Kinetix Fitness', monogram: 'KF', category: 'Sports & Outdoor' },
  { shopName: 'Monarch Leather', monogram: 'ML', category: 'Fashion' },
  { shopName: 'Dazzle Jewelry', monogram: 'DJ', category: 'Jewelry & Accessories' },
  { shopName: 'Orbit Accessories', monogram: 'OA', category: 'Electronics' },
  { shopName: 'Flora Garden Mart', monogram: 'FG', category: 'Agriculture & Gardening' },
  { shopName: 'Paws & Claws BD', monogram: 'PC', category: 'Pet Supplies' },
  { shopName: 'InkCraft Stationery', monogram: 'IC', category: 'Books & Stationery' },
  { shopName: 'Stride Sneakers', monogram: 'ST', category: 'Fashion' },
  { shopName: 'Echo Acoustics', monogram: 'EA', category: 'Electronics' },
  { shopName: 'Sovereign Suits', monogram: 'SV', category: 'Fashion' },
  { shopName: 'Amber Fragrances', monogram: 'AF', category: 'Beauty & Personal Care' },
  { shopName: 'KitchenAid Depot', monogram: 'KA', category: 'Home & Living' },
  { shopName: 'Vortex PC World', monogram: 'VX', category: 'Computer & Gaming' },
  { shopName: 'Meghna Dairy Farm', monogram: 'MD', category: 'Grocery & Food' },
  { shopName: 'Little Sprout Shop', monogram: 'LS', category: 'Baby & Kids' },
  { shopName: 'MotoRide Parts', monogram: 'MR', category: 'Automotive & Motorbike' },
  { shopName: 'Vitality Nutrition', monogram: 'VN', category: 'Health & Wellness' },
  { shopName: 'Indigo Denim Co', monogram: 'ID', category: 'Fashion' },
  { shopName: 'Zara Luxe Closet', monogram: 'ZL', category: 'Fashion' },
  { shopName: 'Quantum Drones', monogram: 'QD', category: 'Electronics' },
  { shopName: 'Ceramic Artistry', monogram: 'CA', category: 'Home & Living' },
  { shopName: 'Atlas Travel Bags', monogram: 'AT', category: 'Fashion' },
  { shopName: 'Honeycomb Naturals', monogram: 'HN', category: 'Grocery & Food' },
  { shopName: 'Prism Eyewear', monogram: 'PE', category: 'Jewelry & Accessories' },
  { shopName: 'SonicBoom Gadgets', monogram: 'SB', category: 'Electronics' },
  { shopName: 'Marigold Sarees', monogram: 'MS', category: 'Fashion' },
  { shopName: 'Terra Pottery', monogram: 'TP', category: 'Home & Living' },
  { shopName: 'Alpha Athletics', monogram: 'AA', category: 'Sports & Outdoor' },
  { shopName: 'Glamour Vault', monogram: 'GV', category: 'Beauty & Personal Care' },
  { shopName: 'HyperLink Cables', monogram: 'HL', category: 'Computer & Gaming' },
  { shopName: 'Chittagong Spices', monogram: 'CS', category: 'Grocery & Food' },
  { shopName: 'Crown Kids Wear', monogram: 'CK', category: 'Baby & Kids' },
  { shopName: 'SilverLine Watches', monogram: 'SL', category: 'Jewelry & Accessories' },
  { shopName: 'Emerald Herbs', monogram: 'EH', category: 'Health & Wellness' },
  { shopName: 'Nimbus Footwear', monogram: 'NF', category: 'Fashion' },
  { shopName: 'Sparkle Home Care', monogram: 'SH', category: 'Home & Living' },
  { shopName: 'Falcon Cameras', monogram: 'FC', category: 'Electronics' },
  { shopName: 'Aesthetic Prints', monogram: 'AP', category: 'Books & Stationery' },
  { shopName: 'Bumper Auto Hub', monogram: 'BA', category: 'Automotive & Motorbike' },
  { shopName: 'Bonsai Nursery BD', monogram: 'BN', category: 'Agriculture & Gardening' },
  { shopName: 'Furry Friends Mart', monogram: 'FF', category: 'Pet Supplies' },
  { shopName: 'Knitwear Studio', monogram: 'KS', category: 'Fashion' },
  { shopName: 'Ruby Nail & Lip', monogram: 'RN', category: 'Beauty & Personal Care' },
  { shopName: 'Matrix Keyboards', monogram: 'MK', category: 'Computer & Gaming' },
  { shopName: 'Padma Fresh Fish', monogram: 'PF', category: 'Grocery & Food' },
  { shopName: 'Opal Linen Works', monogram: 'OL', category: 'Home & Living' },
  { shopName: 'Summit Camping', monogram: 'SC', category: 'Sports & Outdoor' },
  { shopName: 'Golden Bangles', monogram: 'GB', category: 'Jewelry & Accessories' },
  { shopName: 'Pulse SmartWatch', monogram: 'PW', category: 'Electronics' },
  { shopName: 'Trendy Hijab Hub', monogram: 'TH', category: 'Fashion' },
  { shopName: 'Tiny Toes Shoes', monogram: 'TT', category: 'Baby & Kids' },
  { shopName: 'Zen Herbal Care', monogram: 'ZH', category: 'Health & Wellness' },
  { shopName: 'Scholar BookHouse', monogram: 'BH', category: 'Books & Stationery' },
  { shopName: 'Turbo Helmets BD', monogram: 'TB', category: 'Automotive & Motorbike' },
  { shopName: 'Seedling Agro Mart', monogram: 'SA', category: 'Agriculture & Gardening' },
  { shopName: 'Aqua Pet World', monogram: 'AW', category: 'Pet Supplies' },
  { shopName: 'Solstice Perfumes', monogram: 'SP', category: 'Beauty & Personal Care' },
  { shopName: 'CyberCore Storage', monogram: 'CY', category: 'Computer & Gaming' },
  { shopName: 'Mango Valley BD', monogram: 'MV', category: 'Grocery & Food' },
  { shopName: 'Bamboo Craft Home', monogram: 'BM', category: 'Home & Living' },
  { shopName: 'Velocity Cycles', monogram: 'VC', category: 'Sports & Outdoor' },
  { shopName: 'Radiant Gems', monogram: 'RG', category: 'Jewelry & Accessories' },
  { shopName: 'Beacon Power Bank', monogram: 'BP', category: 'Electronics' },
  { shopName: 'Heritage Panjabi', monogram: 'HP', category: 'Fashion' }
];

// 100 distinct, hand-calibrated high-contrast color palettes (no two stores share the same color pair)
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => lNorm - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

interface Palette {
  bg1: string;
  bg2: string;
  accent: string;
  text: string;
  subText: string;
  isLightBg: boolean;
}

function buildUniquePalette(index: number): Palette {
  // Golden-angle hue distribution guarantees 100 visually distinct hues across the color wheel
  const hue = Math.round((index * 137.508 + 11) % 360);
  const band = index % 5;

  // Band 4 uses crisp light pastel backgrounds with deep ink lettering for rich variety across the 100 stores
  if (band === 4) {
    const bg1 = hslToHex(hue, 80, 94);
    const bg2 = hslToHex((hue + 22) % 360, 72, 87);
    const text = hslToHex(hue, 78, 22);
    const accent = hslToHex((hue + 18) % 360, 76, 44);
    const subText = hslToHex(hue, 70, 32);
    return { bg1, bg2, accent, text, subText, isLightBg: true };
  }

  // Bands 0-3 cover vibrant jewel, deep dark, rich saturated, and warm/cool gradient backgrounds with crisp white/cream text
  const saturations = [82, 74, 88, 66];
  const lightness1 = [44, 32, 48, 24];
  const lightness2 = [30, 19, 34, 14];
  const hueShift = [18, 30, -20, 42];

  const s = saturations[band];
  const l1 = lightness1[band];
  const l2 = lightness2[band];
  const h2 = (hue + hueShift[band] + 360) % 360;

  const bg1 = hslToHex(hue, s, l1);
  const bg2 = hslToHex(h2, Math.min(95, s + 6), l2);
  const accent = hslToHex((hue + 38) % 360, 90, 68);
  const text = '#ffffff';
  const subText = '#f8fafc';

  return { bg1, bg2, accent, text, subText, isLightBg: false };
}

const FONT_FAMILIES = [
  'Georgia,serif',
  'Arial,Helvetica,sans-serif',
  'Impact,Charcoal,sans-serif',
  'Courier New,monospace',
  'Trebuchet MS,sans-serif',
  'Verdana,sans-serif',
  'Times New Roman,serif',
  'Tahoma,sans-serif'
];

function getInitialWord(shopName: string): string {
  const firstWord = shopName.split(' ')[0].toUpperCase();
  return firstWord.length <= 7 ? firstWord : firstWord.slice(0, 6);
}

function buildLogoSvgDataUri(
  index: number,
  shopName: string,
  monogram: string,
  palette: Palette
): string {
  const styleVariant = index % 10;
  const fontFamily = FONT_FAMILIES[index % FONT_FAMILIES.length];
  const bgPattern = index % 6;
  const gradAngle =
    index % 4 === 0
      ? 'x1="0" y1="0" x2="1" y2="1"'
      : index % 4 === 1
        ? 'x1="1" y1="0" x2="0" y2="1"'
        : index % 4 === 2
          ? 'x1="0" y1="0" x2="0" y2="1"'
          : 'x1="0" y1="0.5" x2="1" y2="0.5"';

  const decoOpacity = palette.isLightBg ? '0.16' : '0.15';
  const borderColor = palette.isLightBg ? palette.accent : '#ffffff';
  const shadowFill = palette.isLightBg ? 'rgba(15,23,42,0.16)' : 'rgba(0,0,0,0.28)';

  let bgDecor = '';
  switch (bgPattern) {
    case 0:
      bgDecor = `<circle cx="172" cy="28" r="68" fill="${borderColor}" fill-opacity="${decoOpacity}"/><circle cx="24" cy="176" r="54" fill="${palette.accent}" fill-opacity="0.18"/>`;
      break;
    case 1:
      bgDecor = `<polygon points="0,0 200,0 200,72 0,132" fill="${borderColor}" fill-opacity="${decoOpacity}"/>`;
      break;
    case 2:
      bgDecor = `<rect x="14" y="14" width="172" height="172" rx="34" fill="none" stroke="${borderColor}" stroke-opacity="0.38" stroke-width="5"/>`;
      break;
    case 3:
      bgDecor = `<circle cx="100" cy="100" r="82" fill="none" stroke="${borderColor}" stroke-opacity="0.28" stroke-width="6"/><circle cx="100" cy="100" r="66" fill="${borderColor}" fill-opacity="0.08"/>`;
      break;
    case 4:
      bgDecor = `<polygon points="100,12 184,56 184,144 100,188 16,144 16,56" fill="${borderColor}" fill-opacity="0.12" stroke="${borderColor}" stroke-opacity="0.32" stroke-width="4"/>`;
      break;
    default:
      bgDecor = `<path d="M0 148 Q100 105 200 148 L200 200 L0 200 Z" fill="${borderColor}" fill-opacity="${decoOpacity}"/>`;
      break;
  }

  const label = getInitialWord(shopName);
  const len = monogram.length;
  const baseSize = len === 1 ? 116 : len === 2 ? 88 : 70;
  let textElements = '';

  switch (styleVariant) {
    case 0:
      // Classic Bold Uppercase with Accent Underline
      textElements = `<text x="100" y="120" text-anchor="middle" font-family="${fontFamily}" font-size="${baseSize}" font-weight="900" letter-spacing="3" fill="${palette.text}">${monogram}</text><rect x="52" y="142" width="96" height="9" rx="4.5" fill="${palette.accent}"/>`;
      break;
    case 1:
      // Dynamic Italic Slanted Display
      textElements = `<text x="100" y="128" text-anchor="middle" font-family="${fontFamily}" font-size="${baseSize + 4}" font-weight="900" font-style="italic" transform="rotate(-7 100 100)" fill="${palette.text}">${monogram}</text>`;
      break;
    case 2:
      // Layered 3D Offset Shadow Typography
      textElements = `<text x="106" y="133" text-anchor="middle" font-family="${fontFamily}" font-size="${baseSize}" font-weight="900" fill="${shadowFill}">${monogram}</text><text x="98" y="125" text-anchor="middle" font-family="${fontFamily}" font-size="${baseSize}" font-weight="900" fill="${palette.text}">${monogram}</text>`;
      break;
    case 3:
      // Stacked Monogram + Micro Brand Subtext
      textElements = `<text x="100" y="112" text-anchor="middle" font-family="${fontFamily}" font-size="${baseSize - 4}" font-weight="900" fill="${palette.text}">${monogram}</text><text x="100" y="156" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="800" letter-spacing="3" fill="${palette.subText}" fill-opacity="0.92">${label}</text>`;
      break;
    case 4:
      // Outlined Dual-Stroke Varsity Style
      textElements = `<text x="100" y="129" text-anchor="middle" font-family="${fontFamily}" font-size="${baseSize}" font-weight="900" stroke="${palette.accent}" stroke-width="10" stroke-linejoin="round" paint-order="stroke" fill="${palette.text}">${monogram}</text>`;
      break;
    case 5:
      // Framed Horizontal Rules (Editorial Crest)
      textElements = `<line x1="36" y1="48" x2="164" y2="48" stroke="${borderColor}" stroke-opacity="0.65" stroke-width="5" stroke-linecap="round"/><text x="100" y="126" text-anchor="middle" font-family="${fontFamily}" font-size="${baseSize - 4}" font-weight="900" letter-spacing="4" fill="${palette.text}">${monogram}</text><line x1="36" y1="152" x2="164" y2="152" stroke="${borderColor}" stroke-opacity="0.65" stroke-width="5" stroke-linecap="round"/>`;
      break;
    case 6:
      // Split Pill Badge Lettering
      textElements = `<rect x="28" y="46" width="144" height="108" rx="28" fill="${palette.isLightBg ? palette.accent : '#0f172a'}" fill-opacity="${palette.isLightBg ? '0.14' : '0.28'}"/><text x="100" y="128" text-anchor="middle" font-family="${fontFamily}" font-size="${baseSize}" font-weight="900" fill="${palette.text}">${monogram}</text>`;
      break;
    case 7:
      // Lowercase / Mixed Stylistic Script-Look
      textElements = `<text x="100" y="126" text-anchor="middle" font-family="Georgia,serif" font-size="${baseSize + 4}" font-weight="700" font-style="italic" fill="${palette.text}">${monogram.charAt(0)}${monogram.slice(1).toLowerCase()}</text><circle cx="154" cy="54" r="10" fill="${palette.accent}"/>`;
      break;
    case 8:
      // Tilted Diamond Frame Emblem
      textElements = `<rect x="42" y="42" width="116" height="116" rx="18" transform="rotate(45 100 100)" fill="none" stroke="${borderColor}" stroke-opacity="0.45" stroke-width="6"/><text x="100" y="126" text-anchor="middle" font-family="${fontFamily}" font-size="${baseSize - 6}" font-weight="900" fill="${palette.text}">${monogram}</text>`;
      break;
    default:
      // Bold Corner Bracket Stamp + Large Monogram
      textElements = `<path d="M26 58 V26 H58 M142 26 H174 V58 M174 142 V174 H142 M58 174 H26 V142" fill="none" stroke="${borderColor}" stroke-opacity="0.7" stroke-width="7" stroke-linecap="round"/><text x="100" y="128" text-anchor="middle" font-family="${fontFamily}" font-size="${baseSize}" font-weight="900" letter-spacing="2" fill="${palette.text}">${monogram}</text>`;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="g" ${gradAngle}><stop offset="0%" stop-color="${palette.bg1}"/><stop offset="100%" stop-color="${palette.bg2}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/>${bgDecor}${textElements}</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const BASE_CREATED_AT = 1735689600000;

// 100 varied, distinct follower counts strictly between 1,000 and 50,000
const DEMO_FOLLOWER_COUNTS: readonly number[] = [
  12000, 8000, 5000, 2000, 18400, 31200, 6450, 42900, 15300, 27600,
  9750, 38100, 4200, 21900, 14600, 47200, 3300, 25400, 11200, 35800,
  7100, 44500, 16800, 29100, 1950, 49200, 13400, 23700, 5600, 39600,
  10500, 28300, 4850, 46100, 17900, 33400, 2650, 41200, 14100, 24800,
  8900, 36900, 1600, 48300, 19600, 30500, 6100, 43700, 12700, 26900,
  7450, 34100, 3850, 45600, 15900, 22400, 9150, 37500, 1350, 49600,
  11800, 29800, 5250, 40400, 16200, 32600, 2300, 44100, 13900, 25100,
  8350, 35200, 4550, 46800, 18900, 31800, 6800, 42300, 14900, 27100,
  9400, 38800, 3050, 47700, 17200, 28600, 7800, 41700, 10900, 21300,
  1150, 3450, 7600, 11400, 16500, 20800, 26100, 32900, 39100, 45200
];

export const DEMO_VERIFIED_COUNT = 90;

export const DEMO_STORES: DemoStoreDefinition[] = RAW_DEMO_STORES.map((seed, index) => {
  const num = String(index + 1).padStart(3, '0');
  const id = `demo-store-${num}`;
  const slug = slugifyVendorName(seed.shopName) || id;
  const palette = buildUniquePalette(index);
  const logoUri = buildLogoSvgDataUri(index, seed.shopName, seed.monogram, palette);
  const isVerified = index < DEMO_VERIFIED_COUNT;
  const followerCount = DEMO_FOLLOWER_COUNTS[index];

  return {
    id,
    vendorId: id,
    storeId: id,
    shopName: seed.shopName,
    storeName: seed.shopName,
    name: seed.shopName,
    shopSlug: slug,
    storeSlug: slug,
    logo: logoUri,
    shopLogo: logoUri,
    category: seed.category,
    description: `${seed.shopName} — RJ WORLD BD এর একটি অনুমোদিত অনলাইন শপ। এখানে ${seed.category} ক্যাটাগরির মানসম্মত ও বিশ্বস্ত পণ্য পাওয়া যায়।`,
    primaryColor: palette.bg1,
    theme: {
      primaryColor: palette.bg1
    },
    status: 'active',
    verified: isVerified,
    isVerified,
    verificationStatus: isVerified ? 'verified' : 'unverified',
    followersCount: followerCount,
    followers: followerCount,
    rating: 0,
    reviewsCount: 0,
    isDemo: true,
    createdAt: BASE_CREATED_AT + index * 1000
  };
});

export const DEMO_STORE_IDS = new Set<string>(DEMO_STORES.map((s) => s.id));
export const DEMO_VERIFIED_STORE_IDS = new Set<string>(
  DEMO_STORES.filter((s) => s.isVerified).map((s) => s.id)
);

const DEMO_STORE_BY_KEY = new Map<string, DemoStoreDefinition>();
DEMO_STORES.forEach((store) => {
  DEMO_STORE_BY_KEY.set(store.id.toLowerCase(), store);
  DEMO_STORE_BY_KEY.set(store.shopSlug.toLowerCase(), store);
  DEMO_STORE_BY_KEY.set(store.shopName.toLowerCase(), store);
});

export function getDemoStoreByIdOrSlug(key?: string | null): DemoStoreDefinition | null {
  if (!key) return null;
  let normalized = String(key).trim();
  try {
    normalized = decodeURIComponent(normalized);
  } catch (_) {}
  normalized = normalized.replace(/^\/+|\/+$/g, '').trim().toLowerCase();
  return DEMO_STORE_BY_KEY.get(normalized) || null;
}

export const LEGACY_DEMO_STORE_IDS = new Set<string>([
  'vendor-tech-pro',
  'vendor-apple-zone',
  'vendor-nike-hub',
  'vendor-leather-lux',
  'vendor-home-comfort',
  'vendor-grocery-fresh'
]);

export function isLegacyDemoStore(storeId: string, storeData?: any): boolean {
  const cleanId = String(storeId || storeData?.id || storeData?.vendorId || storeData?.storeId || '').trim();
  const lowerId = cleanId.toLowerCase();

  if (DEMO_STORE_IDS.has(cleanId) || DEMO_STORE_IDS.has(lowerId)) {
    return false;
  }

  if (LEGACY_DEMO_STORE_IDS.has(lowerId)) {
    return true;
  }

  if (lowerId.startsWith('demo-store-') || lowerId.startsWith('demo_store_')) {
    return true;
  }

  if (storeData && typeof storeData === 'object') {
    if (storeData.isDemo === true || storeData.demo === true || storeData.storeType === 'demo') {
      return true;
    }
  }

  return false;
}
