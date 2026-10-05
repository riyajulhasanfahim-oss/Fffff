import { rtdbGet } from '../lib/rtdb';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const PRIMARY_DOMAIN = 'rjworldbd.com';

// Reserved subdomains that cannot be assigned to vendors
export const RESERVED_SUBDOMAINS = new Set([
  'www',
  'admin',
  'api',
  'mail',
  'email',
  'cpanel',
  'webmail',
  'ftp',
  'autodiscover',
  'autoconfig',
  'app',
  'auth',
  'support',
  'help',
  'billing',
  'status',
  'ns1',
  'ns2',
  'mx',
  'smtp',
  'pop',
  'imap',
  'root',
  'store',
  'shop',
  'marketplace',
  'dashboard',
  'static',
  'assets',
  'cdn'
]);

/**
 * Converts Bengali text and words to clean Latin phonetics
 */
export function banglaToSlug(text: string): string {
  if (!text) return '';
  let s = text.trim().toLowerCase();

  // Common Bengali e-commerce and retail terms dictionary
  const dict: [RegExp, string][] = [
    [/স্টোর|ষ্টোর/g, 'store'],
    [/শপ/g, 'shop'],
    [/মার্ট/g, 'mart'],
    [/ফ্যাশন/g, 'fashion'],
    [/ইলেকট্রনিক্স|ইলেক্ট্রনিক্স/g, 'electronics'],
    [/কালেকশন/g, 'collection'],
    [/এন্টারপ্রাইজ/g, 'enterprise'],
    [/ট্রেডার্স|ট্রেডারস/g, 'traders'],
    [/বাজার/g, 'bazar'],
    [/মেলা/g, 'mela'],
    [/বিডি/g, 'bd'],
    [/ওয়ার্ল্ড|ওয়ার্ল্ড/g, 'world'],
    [/আরজে/g, 'rj'],
    [/পয়েন্ট|পয়েন্ট/g, 'point'],
    [/হাব/g, 'hub'],
    [/জোন/g, 'zone'],
    [/গ্যাজেট/g, 'gadget'],
    [/কম্পিউটার/g, 'computer'],
    [/মোবাইল/g, 'mobile'],
    [/জুয়েলার্স|জুয়েলার্স/g, 'jewellers'],
    [/বুটিক/g, 'boutique'],
    [/টেলিকম/g, 'telecom'],
    [/অফিসিয়াল|অফিসিয়াল/g, 'official'],
    [/অনলাইন/g, 'online'],
    [/হাউস/g, 'house'],
    [/মায়ের দোয়া|মায়ের দোয়া/g, 'mayer-doya']
  ];

  for (const [pattern, repl] of dict) {
    s = s.replace(pattern, ' ' + repl + ' ');
  }

  // Bengali character transliteration table
  const charMap: Record<string, string> = {
    // Vowels
    'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
    // Vowel marks (Kar)
    'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
    // Consonants
    'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
    'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
    'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
    'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
    'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
    'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
    'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't',
    // Signs
    'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n', '্': '',
    // Numbers
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };

  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (charMap[ch] !== undefined) {
      out += charMap[ch];
    } else {
      out += ch;
    }
  }

  return out;
}

/**
 * Generates a valid DNS-compliant subdomain slug from any vendor name.
 * - Converts Bengali characters to clean English phonetics
 * - Replaces spaces & special characters with hyphens
 * - Removes invalid characters
 * - Avoids double hyphens and trims leading/trailing hyphens
 */
export function slugifyVendorName(text: string): string {
  if (!text) return 'store';

  const transliterated = banglaToSlug(text);

  let clean = transliterated
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!clean || clean.length < 2) {
    clean = 'store';
  }

  // Maximum DNS label length is 63 characters
  if (clean.length > 50) {
    clean = clean.substring(0, 50).replace(/-+$/, '');
  }

  // If slug matches reserved names, append '-shop'
  if (RESERVED_SUBDOMAINS.has(clean)) {
    clean = `${clean}-shop`;
  }

  return clean;
}

/**
 * Returns the full subdomain string, e.g. "fahim-store.rjworldbd.com"
 */
export function getVendorSubdomain(slug: string): string {
  const cleanSlug = slugifyVendorName(slug);
  return `${cleanSlug}.${PRIMARY_DOMAIN}`;
}

/**
 * Returns the production-ready clean Store URL:
 * e.g. "https://rjworldbd.com/store/cloudflare"
 * e.g. "https://rjworldbd.com/store/fahim-electronics"
 * Requirement 23: Final Store URL format অবশ্যই হবে: https://rjworldbd.com/store/{store-slug}
 * Requirement 24: Store slug কখনো Firebase-এর random ID হবে না।
 */
export function getVendorStoreUrl(slugOrStore: any): string {
  if (!slugOrStore) return `https://${PRIMARY_DOMAIN}`;
  let slug = '';
  if (typeof slugOrStore === 'string') {
    slug = slugOrStore;
  } else if (typeof slugOrStore === 'object') {
    slug = slugOrStore.shopSlug || 
           slugOrStore.storeSlug || 
           (slugOrStore.shopName || slugOrStore.storeName ? slugifyVendorName(slugOrStore.shopName || slugOrStore.storeName) : '') ||
           (slugOrStore.name ? slugifyVendorName(slugOrStore.name) : '');
  }
  const cleanSlug = slugifyVendorName(slug);
  return `https://${PRIMARY_DOMAIN}/store/${cleanSlug}`;
}

export interface DomainExtractionResult {
  type: 'subdomain' | 'custom' | 'main';
  slugOrDomain: string | null;
}

/**
 * Extracts vendor subdomain slug or custom domain from current hostname and search params
 */
export function extractVendorSubdomain(
  hostname: string,
  search?: URLSearchParams | string
): DomainExtractionResult {
  const host = (hostname || '').toLowerCase().trim().replace(/\.$/, '').split(':')[0]; // strip port & trailing dot

  // 1. Check test / preview parameters (allows testing in development/preview environments)
  const searchParams = typeof search === 'string' 
    ? new URLSearchParams(search) 
    : search instanceof URLSearchParams 
      ? search 
      : typeof window !== 'undefined' 
        ? new URLSearchParams(window.location.search) 
        : null;

  if (searchParams) {
    const testSubdomain = searchParams.get('test_shop_domain') || 
                          searchParams.get('subdomain') || 
                          searchParams.get('vendor_subdomain') ||
                          searchParams.get('store_domain');
    if (testSubdomain) {
      let slug = testSubdomain.toLowerCase().trim().replace('https://', '').replace('http://', '').split('/')[0];
      if (slug.endsWith(`.${PRIMARY_DOMAIN}`)) {
        slug = slug.replace(`.${PRIMARY_DOMAIN}`, '');
      } else if (slug.endsWith('.rjworld.com')) {
        slug = slug.replace('.rjworld.com', '');
      }
      slug = slugifyVendorName(slug);
      if (slug && !RESERVED_SUBDOMAINS.has(slug)) {
        return { type: 'subdomain', slugOrDomain: slug };
      }
    }
  }

  // 2. Check window.__RJ_VENDOR_SUBDOMAIN__ if injected by server
  if (typeof window !== 'undefined' && (window as any).__RJ_VENDOR_SUBDOMAIN__) {
    const rawVal = (window as any).__RJ_VENDOR_SUBDOMAIN__;
    if (typeof rawVal === 'string') {
      const s = rawVal.toLowerCase().trim();
      if (s && s !== 'undefined' && s !== 'null' && s !== 'false' && s !== 'none' && !RESERVED_SUBDOMAINS.has(s)) {
        return { type: 'subdomain', slugOrDomain: s };
      }
    }
  }

  if (!host) {
    return { type: 'main', slugOrDomain: null };
  }

  // 3. Check for exact main domains
  if (
    host === PRIMARY_DOMAIN ||
    host === `www.${PRIMARY_DOMAIN}` ||
    host === 'rjworld.com' ||
    host === 'www.rjworld.com'
  ) {
    return { type: 'main', slugOrDomain: null };
  }

  // 4. Check for wildcard subdomains on rjworldbd.com
  // Example: rj-world.rjworldbd.com or abc-fashion.rjworldbd.com
  const bdSuffix = `.${PRIMARY_DOMAIN}`;
  if (host.endsWith(bdSuffix)) {
    const sub = host.substring(0, host.length - bdSuffix.length).trim();
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
      // Subdomain might have multiple levels (e.g. store.abc.rjworldbd.com -> take first label)
      const firstLabel = sub.split('.')[0];
      if (firstLabel && !RESERVED_SUBDOMAINS.has(firstLabel)) {
        return { type: 'subdomain', slugOrDomain: firstLabel };
      }
    }
    return { type: 'main', slugOrDomain: null };
  }

  // Also check legacy rjworld.com suffix
  const legacySuffix = '.rjworld.com';
  if (host.endsWith(legacySuffix)) {
    const sub = host.substring(0, host.length - legacySuffix.length).trim();
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
      const firstLabel = sub.split('.')[0];
      if (firstLabel && !RESERVED_SUBDOMAINS.has(firstLabel)) {
        return { type: 'subdomain', slugOrDomain: firstLabel };
      }
    }
    return { type: 'main', slugOrDomain: null };
  }

  // 5. Check local development subdomains, e.g. "fahim.localhost"
  if (host.endsWith('.localhost')) {
    const sub = host.replace('.localhost', '').trim();
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
      return { type: 'subdomain', slugOrDomain: sub };
    }
    return { type: 'main', slugOrDomain: null };
  }

  // 6. Preview / dev / platform hosting environments (without subdomain parameters)
  const isDevHost = 
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.includes('vercel.app') ||
    host.includes('vercel.com') ||
    host.includes('now.sh') ||
    host.includes('web.app') ||
    host.includes('firebaseapp.com') ||
    host.includes('run.app') ||
    host.includes('pages.dev') ||
    host.includes('workers.dev') ||
    host.includes('webcontainer.io') ||
    host.includes('cloudworkstations.dev') ||
    host.includes('googleusercontent.com') ||
    host.includes('ai.studio') ||
    host.includes('ais-') ||
    host.includes('netlify.app') ||
    host.includes('onrender.com') ||
    host.includes('railway.app') ||
    host.includes('github.io') ||
    host.includes('surge.sh') ||
    host.includes('amplifyapp.com');

  if (isDevHost) {
    return { type: 'main', slugOrDomain: null };
  }

  // 7. Otherwise, treat as an external custom domain pointing to a vendor store
  return { type: 'custom', slugOrDomain: host };
}

/**
 * Checks if a candidate slug is available (not claimed by another vendor and not reserved)
 */
export async function isVendorSlugAvailable(
  slug: string,
  currentVendorId?: string,
  existingProfiles?: Record<string, any>
): Promise<boolean> {
  const cleanSlug = slugifyVendorName(slug);
  if (!cleanSlug || RESERVED_SUBDOMAINS.has(cleanSlug)) {
    return false;
  }

  let allProfiles = existingProfiles;
  if (!allProfiles) {
    try {
      const [profilesSnap, vendorsSnap, storesSnap] = await Promise.all([
        rtdbGet<Record<string, any>>('vendor_profiles', 2500).catch(() => null),
        rtdbGet<Record<string, any>>('vendors', 2500).catch(() => null),
        rtdbGet<Record<string, any>>('stores', 2500).catch(() => null)
      ]);
      allProfiles = {
        ...(storesSnap || {}),
        ...(vendorsSnap || {}),
        ...(profilesSnap || {})
      };

      try {
        const fsSnap = await getDocs(collection(db, 'vendors'));
        fsSnap.forEach(d => {
          allProfiles[d.id] = { ...(allProfiles[d.id] || {}), ...d.data(), id: d.id, vendorId: d.id };
        });
      } catch (_) {}
    } catch {
      allProfiles = {};
    }
  }

  const hasConflict = Object.entries(allProfiles || {}).some(([uid, p]: [string, any]) => {
    if (currentVendorId && (uid === currentVendorId || p?.userId === currentVendorId || p?.vendorId === currentVendorId || p?.id === currentVendorId)) {
      return false;
    }
    if (!p || typeof p !== 'object') return false;

    const pSlug = (p.shopSlug || p.storeSlug || '').toLowerCase().trim();
    const pDom = (p.freeShopDomain || '').toLowerCase().trim();
    const targetDom = `${cleanSlug}.${PRIMARY_DOMAIN}`;
    const legacyDom = `${cleanSlug}.rjworld.com`;

    return (
      pSlug === cleanSlug ||
      pDom === targetDom ||
      pDom === legacyDom ||
      pDom.startsWith(`${cleanSlug}.`)
    );
  });

  return !hasConflict;
}

/**
 * Generates an assured unique subdomain slug for a vendor by querying both RTDB and Firestore
 */
export async function generateUniqueVendorSlug(
  shopName: string,
  currentVendorId?: string,
  existingProfiles?: Record<string, any>
): Promise<string> {
  const baseSlug = slugifyVendorName(shopName);
  let uniqueSlug = baseSlug;
  let counter = 1;
  let isUnique = false;

  let allProfiles = existingProfiles;
  if (!allProfiles) {
    try {
      const [profilesSnap, vendorsSnap, storesSnap] = await Promise.all([
        rtdbGet<Record<string, any>>('vendor_profiles', 2500).catch(() => null),
        rtdbGet<Record<string, any>>('vendors', 2500).catch(() => null),
        rtdbGet<Record<string, any>>('stores', 2500).catch(() => null)
      ]);
      allProfiles = {
        ...(storesSnap || {}),
        ...(vendorsSnap || {}),
        ...(profilesSnap || {})
      };

      // Also query Firestore vendors
      try {
        const fsSnap = await getDocs(collection(db, 'vendors'));
        fsSnap.forEach(d => {
          allProfiles[d.id] = { ...(allProfiles[d.id] || {}), ...d.data(), id: d.id, vendorId: d.id };
        });
      } catch (_) {}
    } catch {
      allProfiles = {};
    }
  }

  while (!isUnique) {
    if (RESERVED_SUBDOMAINS.has(uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
      continue;
    }

    const hasConflict = Object.entries(allProfiles || {}).some(([uid, p]: [string, any]) => {
      if (currentVendorId && (uid === currentVendorId || p?.userId === currentVendorId || p?.vendorId === currentVendorId || p?.id === currentVendorId)) {
        return false;
      }
      if (!p || typeof p !== 'object') return false;

      const pSlug = (p.shopSlug || p.storeSlug || '').toLowerCase().trim();
      const pDom = (p.freeShopDomain || '').toLowerCase().trim();
      const targetDom = `${uniqueSlug}.${PRIMARY_DOMAIN}`;
      const legacyDom = `${uniqueSlug}.rjworld.com`;

      return (
        pSlug === uniqueSlug ||
        pDom === targetDom ||
        pDom === legacyDom ||
        pDom.startsWith(`${uniqueSlug}.`)
      );
    });

    if (!hasConflict) {
      isUnique = true;
    } else {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  return uniqueSlug;
}

/**
 * Returns the production-ready clean Store URL:
 * e.g. "https://rjworldbd.com/store/cloudflare"
 * Never displays random Firebase IDs in the URL (Requirement 2, 23, 24).
 */
export function getVendorOpenUrl(freeShopDomain?: string, vendorId?: string, slug?: string, shopName?: string): string {
  let targetSlug = slug;
  if (!targetSlug && freeShopDomain) {
    const clean = freeShopDomain.replace('https://', '').replace('http://', '').replace(/\/$/, '').trim();
    if (clean.includes('/store/')) {
      targetSlug = clean.split('/store/')[1];
    } else if (clean.endsWith(`.${PRIMARY_DOMAIN}`)) {
      targetSlug = clean.replace(`.${PRIMARY_DOMAIN}`, '');
    } else if (clean.endsWith('.rjworld.com')) {
      targetSlug = clean.replace('.rjworld.com', '');
    } else if (!clean.includes('.')) {
      targetSlug = clean;
    }
  }

  if (!targetSlug && shopName) {
    targetSlug = slugifyVendorName(shopName);
  }

  const cleanSlug = slugifyVendorName(targetSlug || '');
  if (cleanSlug && cleanSlug !== 'store') {
    return `https://${PRIMARY_DOMAIN}/store/${cleanSlug}`;
  }

  // Fallback to shopName or store slug
  if (shopName) {
    return `https://${PRIMARY_DOMAIN}/store/${slugifyVendorName(shopName)}`;
  }

  return `https://${PRIMARY_DOMAIN}`;
}

/**
 * Returns an in-app navigation link for a vendor store.
 * e.g. "/store/cloudflare"
 * Prevents showing random Firebase IDs anywhere in the UI (Requirement 2, 24).
 */
export function getVendorStoreLink(vendorOrStore: any): string {
  if (!vendorOrStore) return '/';

  const slug = vendorOrStore.shopSlug || 
               vendorOrStore.storeSlug || 
               (vendorOrStore.shopName || vendorOrStore.storeName ? slugifyVendorName(vendorOrStore.shopName || vendorOrStore.storeName) : '') ||
               (vendorOrStore.name ? slugifyVendorName(vendorOrStore.name) : '');
  
  if (!slug) return '/';

  const cleanSlug = slugifyVendorName(slug);
  return `/store/${cleanSlug}`;
}
