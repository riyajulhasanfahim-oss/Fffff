import type { ProductReview } from '../services/reviewService';
import type { ProductMetrics } from '../services/productMetricsService';

export interface DemoStoreProduct {
  id: string;
  slug: string;
  name: string;
  title: string;
  sku: string;
  brand: string;
  category: string;
  price: number;
  regularPrice: number;
  originalPrice: number;
  discount: number;
  inStock: boolean;
  stock: number;
  stockCount: number;
  weight: string;
  image: string;
  featuredImage: string;
  images: [string, string, string];
  shortDescription: string;
  description: string;
  tags: string[];
  specifications: Record<string, string>;
  vendorId: string;
  storeId: string;
  storeName: string;
  vendor: {
    id: string;
    vendorId: string;
    storeId: string;
    name: string;
    storeName: string;
    shopName: string;
    shopSlug: string;
    storeSlug: string;
    verified: boolean;
    isVerified: boolean;
    isDemo: boolean;
  };
  soldCount: number;
  salesCount: number;
  totalSold: number;
  rating: number;
  reviews: number;
  reviewsCount: number;
  status: 'active';
  isDemo: true;
  isSampleData: true;
  createdAt: number;
}

export interface DemoSampleReview extends ProductReview {
  isDemoSample: true;
  isDelivered: false;
  verifiedPurchase: false;
}

export const TARGET_DEMO_PRODUCT_STORE_ID = 'demo-store-004';
export const TARGET_DEMO_PRODUCT_STORE_SLUG = 'gadget-pulse';
export const TARGET_DEMO_PRODUCT_STORE_NAME = 'Gadget Pulse';

const GADGET_PULSE_VENDOR = {
  id: TARGET_DEMO_PRODUCT_STORE_ID,
  vendorId: TARGET_DEMO_PRODUCT_STORE_ID,
  storeId: TARGET_DEMO_PRODUCT_STORE_ID,
  name: TARGET_DEMO_PRODUCT_STORE_NAME,
  storeName: TARGET_DEMO_PRODUCT_STORE_NAME,
  shopName: TARGET_DEMO_PRODUCT_STORE_NAME,
  shopSlug: TARGET_DEMO_PRODUCT_STORE_SLUG,
  storeSlug: TARGET_DEMO_PRODUCT_STORE_SLUG,
  verified: true,
  isVerified: true,
  isDemo: true,
};

const BASE_CREATED_AT = 1738368000000;

interface RawDemoProductSeed {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brand: string;
  price: number;
  regularPrice: number;
  stock: number;
  weight: string;
  images: [string, string, string];
  shortDescription: string;
  description: string;
  tags: string[];
  specifications: Record<string, string>;
  soldCount: number;
  sampleReviews: Array<{
    rating: number;
    reviewerName: string;
    text: string;
    daysAgo: number;
    helpfulCount: number;
  }>;
}

const RAW_DEMO_PRODUCTS: RawDemoProductSeed[] = [
  {
    id: 'demo-prod-001',
    slug: 'ugreen-nexode-air-65w-gan-usb-c-fast-wall-charger',
    name: 'UGREEN Nexode Air 65W GaN USB-C 3-Port Fast Wall Charger (Foldable Plug)',
    sku: 'UG-CD244-65W',
    brand: 'UGREEN',
    price: 3490,
    regularPrice: 4290,
    stock: 34,
    weight: '130g',
    images: [
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/files/ugreen-nexode-air-usb-c-charger-65w-gan-foldable-plug-3810784.webp?v=1778877675&width=900',
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/files/ugreen-nexode-air-usb-c-charger-65w-gan-foldable-plug-2360286.jpg?v=1778877674&width=900',
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/files/ugreen-nexode-air-usb-c-charger-65w-gan-foldable-plug-4574895.jpg?v=1778877675&width=900',
    ],
    shortDescription:
      'Ultra-compact 65W GaNInfinity wall charger with 2x USB-C + 1x USB-A ports, foldable plug, and intelligent thermal protection.',
    description: `UGREEN Nexode Air 65W GaN USB-C Fast Wall Charger combines next-generation GaNInfinity power semiconductor technology with a pocket-friendly ultra-slim body. Built for laptops, tablets, smartphones, and everyday tech carry, it delivers up to 65W single-port Power Delivery—enough to charge a 13-inch MacBook Air M3 from 0% to 51% in around 30 minutes.

Equipped with 2x USB-C PD 3.0 / PPS ports and 1x USB-A QC/SCP port, the charger intelligently distributes wattage when powering three devices simultaneously. The AirPyra stacked architecture keeps dimensions noticeably smaller than conventional silicon adapters while UGREEN Thermal Guard sensors continuously monitor internal temperatures to safeguard battery health.

Key Highlights:
• 65W Max Single-Port Output via USB-C1 or USB-C2 (PD 3.0 / PPS 45W Samsung Super Fast Charging 2.0 supported)
• Simultaneous 3-Device Charging: 2x USB-C + 1x USB-A for laptop, phone, and earbuds together
• Ultra-Slim Foldable Prong Design: Slides effortlessly into laptop sleeves and travel pouches
• Multi-Layer Safety Protection: Over-voltage, over-current, short-circuit, and thermal guard monitoring`,
    tags: ['ugreen', '65w gan charger', 'usb-c pd charger', 'nexode air', 'fast charger'],
    specifications: {
      Model: 'UGREEN Nexode Air 65W (X556)',
      'Total Output Power': '65W Max',
      Ports: '2x USB-C, 1x USB-A',
      'USB-C1 / C2 Output': '5V/3A, 9V/3A, 12V/3A, 15V/3A, 20V/3.25A (65W Max), PPS supported',
      'USB-A Output': '5V/3A, 9V/2A, 12V/1.5A, 10V/2.25A (22.5W Max)',
      Technology: 'GaNInfinity + Thermal Guard',
      'Plug Type': 'Foldable US 2-Pin Plug (100-240V Worldwide Input)',
      Color: 'Space Gray',
    },
    soldCount: 64,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 1 (Demo)',
        text: 'Sample Review: Very compact compared to standard laptop bricks. Charges a MacBook Air and phone together smoothly without overheating.',
        daysAgo: 4,
        helpfulCount: 9,
      },
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 2 (Demo)',
        text: 'Sample Review: Foldable prongs make it super easy for daily backpack travel, and Samsung 45W Super Fast Charging triggers reliably.',
        daysAgo: 11,
        helpfulCount: 5,
      },
      {
        rating: 4,
        reviewerName: 'Sample Reviewer 3 (Demo)',
        text: 'Sample Review: Solid matte finish and sturdy USB-C ports. Runs slightly warm under full 65W load as expected from a mini GaN block.',
        daysAgo: 19,
        helpfulCount: 3,
      },
    ],
  },
  {
    id: 'demo-prod-002',
    slug: 'ugreen-10000mah-20w-magnetic-wireless-power-bank',
    name: 'UGREEN 10000mAh 20W Magnetic Wireless Power Bank (MagSafe Compatible)',
    sku: 'UG-PB561-10K',
    brand: 'UGREEN',
    price: 3150,
    regularPrice: 3990,
    stock: 28,
    weight: '220g',
    images: [
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/products/ugreen-10000mah-20w-magnetic-power-bank-387983.png?v=1706721956&width=900',
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/products/ugreen-10000mah-20w-magnetic-power-bank-234660.jpg?v=1706698234&width=900',
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/products/ugreen-10000mah-20w-magnetic-power-bank-873665.jpg?v=1706698234&width=900',
    ],
    shortDescription:
      'Snap-on 10000mAh wireless power bank with strong 10N magnetic alignment, soft skin-friendly silicone pad, and 20W USB-C PD fast charging.',
    description: `Enjoy effortless cable-free charging on the move with the UGREEN 10000mAh 20W Magnetic Wireless Power Bank. Engineered with a high-strength 10N (approx. 1 kg holding force) internal magnet ring, it locks securely onto MagSafe-compatible iPhones (iPhone 12 through iPhone 16 series) and magnetic cases without blocking the rear camera bump.

A skin-friendly non-slip silicone contact pad protects your phone finish while improving heat dissipation. Need even faster top-ups or charging two devices at once? Use the bi-directional 20W USB-C Power Delivery port for wired fast charging alongside 7.5W/15W Max wireless output, plus Trickle Charging Mode for low-current accessories like earbuds and smartwatches.

Key Highlights:
• True 10000mAh Cell Capacity (37Wh, Airline Carry-On Approved)
• 10N Strong Magnetic Alignment: Firm grip for pocket and one-handed usage
• Dual Wired + Wireless Charging: 20W USB-C PD wired fast charge + magnetic wireless pad
• Low-Current Trickle Mode: Press and hold the power button for 3 seconds for TWS earbuds & watches`,
    tags: ['ugreen', 'magsafe power bank', 'magnetic power bank', '10000mah', 'wireless charger'],
    specifications: {
      Model: 'UGREEN PB561 (25208)',
      'Battery Capacity': '10,000mAh 3.7V (37Wh)',
      'Rated Capacity': '6,250mAh (5V/3A)',
      'Wireless Output': '7.5W (iPhone) / 15W Max',
      'USB-C Input / Output': '5V/3A, 9V/2.22A, 12V/1.5A (20W Max PD)',
      'Magnetic Force': '10N High-Strength N52H Magnets',
      Recharge: 'Approx. 3.5 hours with 20W PD Adapter',
      Color: 'Cream Beige',
    },
    soldCount: 82,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 1 (Demo)',
        text: 'Sample Review: The magnet holds tightly even when using a MagSafe case, and the soft silicone surface does not scratch the phone.',
        daysAgo: 3,
        helpfulCount: 11,
      },
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 2 (Demo)',
        text: 'Sample Review: Gives roughly two full charges on an iPhone and USB-C 20W cable charging works very fast when in a hurry.',
        daysAgo: 14,
        helpfulCount: 6,
      },
    ],
  },
  {
    id: 'demo-prod-003',
    slug: 'ugreen-m2-nvme-sata-ssd-enclosure-10gbps-usb-32-gen-2',
    name: 'UGREEN M.2 NVMe & SATA Dual-Protocol SSD Enclosure (10Gbps USB 3.2 Gen 2)',
    sku: 'UG-CM400-10G',
    brand: 'UGREEN',
    price: 2450,
    regularPrice: 2990,
    stock: 41,
    weight: '115g',
    images: [
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/files/ugreen-m2-nvme-sata-ssd-enclosure-10gbps-usb-32-gen-2-5939059.png?v=1755638667&width=900',
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/files/ugreen-m2-nvme-sata-ssd-enclosure-10gbps-usb-32-gen-2-6822674.jpg?v=1755638667&width=900',
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/files/ugreen-m2-nvme-sata-ssd-enclosure-10gbps-usb-32-gen-2-2678531.jpg?v=1755638668&width=900',
    ],
    shortDescription:
      'Tool-free aluminum M.2 SSD enclosure supporting both PCIe NVMe and NGFF SATA SSDs (2230/2242/2260/2280) at up to 10Gbps speeds.',
    description: `Turn an internal M.2 NVMe or SATA drive into an ultra-fast portable external SSD with the UGREEN Dual-Protocol 10Gbps M.2 SSD Enclosure. Powered by the Realtek RTL9210B controller chip with UASP and TRIM support, it achieves sequential transfer speeds up to 10Gbps (~1000MB/s on NVMe) and 6Gbps on SATA M.2 drives.

Designed with a sleek CNC aluminum alloy body paired with a thermal silicone pad to draw heat away efficiently during large 4K video transfers or system backups. The slide-and-lock tool-free housing installs your 2230, 2242, 2260, or 2280 SSD in seconds—no screwdriver required.

Key Highlights:
• Dual Protocol Compatibility: Supports both M-Key / B+M Key PCIe NVMe and B+M Key SATA NGFF SSDs
• 4 Form Factors Supported: Fits 2230, 2242, 2260, and 2280 lengths up to 8TB capacity
• High-Speed RTL9210B Chip: Supports UASP, TRIM, S.M.A.R.T., and automatic 15-minute sleep mode
• Includes Thermal Pad + USB-C to USB-C and USB-A Cables for instant plug-and-play on Windows, macOS, Linux & Android`,
    tags: ['ugreen', 'ssd enclosure', 'nvme enclosure', 'm.2 enclosure', 'usb 3.2 gen 2'],
    specifications: {
      Model: 'UGREEN CM400 (90264)',
      Controller: 'Realtek RTL9210B Dual-Protocol',
      'Transfer Speed': 'Up to 10Gbps (NVMe) / 6Gbps (SATA)',
      Interface: 'USB 3.2 Gen 2 Type-C (UASP + TRIM)',
      'Supported SSD Key': 'M-Key & B+M Key (NVMe & SATA)',
      'Supported Sizes': '2230 / 2242 / 2260 / 2280 (Up to 8TB)',
      Chassis: 'Anodized Aluminum Alloy with Thermal Pad',
      Installation: 'Tool-Free Slide Cover + Rubber Fastener',
    },
    soldCount: 47,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 1 (Demo)',
        text: 'Sample Review: Tool-free tray snaps in quickly and consistently hits ~950 MB/s read/write over USB 3.2 Gen 2 with a 1TB NVMe drive.',
        daysAgo: 6,
        helpfulCount: 8,
      },
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 2 (Demo)',
        text: 'Sample Review: Aluminum body conducts heat well and having both NVMe and SATA support is very convenient for older laptop SSDs.',
        daysAgo: 17,
        helpfulCount: 4,
      },
    ],
  },
  {
    id: 'demo-prod-004',
    slug: 'ugreen-hitune-max5c-hybrid-anc-bluetooth-headphones',
    name: 'UGREEN HiTune Max5c Hybrid ANC Over-Ear Bluetooth 5.4 Headphones (Hi-Res LDAC)',
    sku: 'UG-HP203-MAX5C',
    brand: 'UGREEN',
    price: 4650,
    regularPrice: 5690,
    stock: 22,
    weight: '260g',
    images: [
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/files/ugreen-hitune-max-5c-bluetooth-headphones-over-ear-noise-canceling-hi-res-1808880.png?v=1761988828&width=900',
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/files/ugreen-hitune-max-5c-bluetooth-headphones-over-ear-noise-canceling-hi-res-3453097.jpg?v=1761988828&width=900',
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/files/ugreen-hitune-max-5c-bluetooth-headphones-over-ear-noise-canceling-hi-res-2262837.jpg?v=1761988828&width=900',
    ],
    shortDescription:
      '43dB Hybrid Active Noise Canceling wireless headphones with Hi-Res Audio LDAC codec, 40mm dynamic drivers, 75-hour battery, and dual-device pairing.',
    description: `Immerse yourself in studio-grade clarity with the UGREEN HiTune Max5c Over-Ear Bluetooth Headphones. Equipped with custom 40mm PET dynamic drivers and Dual Hi-Res Audio certification (wired & wireless LDAC codec), they deliver punchy bass, balanced vocals, and crisp treble across a wide frequency range.

Block out street traffic, cabin noise, or office chatter with 43dB Hybrid Active Noise Cancellation featuring 4 adjustable ANC levels plus Transparency Mode. A massive battery provides up to 75 hours of playback (ANC off) or 45 hours (ANC on), while Bluetooth 5.4 supports Dual-Device Multipoint switching, 0.06s ultra-low gaming latency, and custom EQ presets through the UGREEN Home App.

Key Highlights:
• 43dB Hybrid ANC + Transparency Mode: Adapts cleanly to commuting, study, and flights
• Dual Hi-Res Audio & LDAC Codec: Up to 990kbps lossless-grade wireless streaming
• Up to 75H Marathon Battery + Fast USB-C Charging (5 min charge = 5 hours playback)
• Protein Leather Memory Foam Earcups + Foldable Hinges + Wired USB-C Audio Mode`,
    tags: ['ugreen', 'hitune max5c', 'anc headphones', 'ldac headphones', 'bluetooth 5.4'],
    specifications: {
      Model: 'UGREEN HiTune Max5c (HP203)',
      'Driver Unit': '40mm Dynamic Driver',
      'Noise Cancellation': 'Hybrid ANC up to -43dB + Transparency Mode',
      'Audio Codecs': 'LDAC, AAC, SBC (Dual Hi-Res Certified)',
      Bluetooth: 'Bluetooth 5.4 (Dual-Device Multipoint)',
      'Battery Life': '75 Hours (ANC Off) / 45 Hours (ANC On)',
      'Call Clarity': 'AI DNN Wind & Environmental Noise Reduction',
      Color: 'Black',
    },
    soldCount: 53,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 1 (Demo)',
        text: 'Sample Review: Very comfortable memory foam earpads for long study sessions. LDAC mode sounds crisp and battery lasts weeks.',
        daysAgo: 5,
        helpfulCount: 10,
      },
      {
        rating: 4,
        reviewerName: 'Sample Reviewer 2 (Demo)',
        text: 'Sample Review: ANC cuts out fan and bus hum effectively at this price tier, and switching between laptop and phone is seamless.',
        daysAgo: 15,
        helpfulCount: 4,
      },
    ],
  },
  {
    id: 'demo-prod-005',
    slug: 'ugreen-finetrack-mini-smart-finder-tracker-2-pack',
    name: 'UGREEN FineTrack Mini Smart Finder Bluetooth Tracker Tag (2-Pack, Apple Find My)',
    sku: 'UG-CM816-2PK',
    brand: 'UGREEN',
    price: 2190,
    regularPrice: 2790,
    stock: 46,
    weight: '45g',
    images: [
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/files/ugreen-finetrack-mini-smart-finder-2118036.png?v=1764318287&width=900',
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/files/ugreen-finetrack-mini-smart-finder-4251439.jpg?v=1764318287&width=900',
      'https://cdn.shopify.com/s/files/1/0257/5246/9566/files/ugreen-finetrack-mini-smart-finder-5505572.jpg?v=1764234564&width=900',
    ],
    shortDescription:
      'Apple Find My certified mini item tracker (2-Pack) with built-in 80dB buzzer, encrypted location privacy, keychains, and up to 18-36 months replaceable battery.',
    description: `Keep tabs on your keys, backpack, luggage, wallet, and camera gear effortlessly with the UGREEN FineTrack Mini Smart Finder 2-Pack. Officially certified for the Apple Find My network, it pairs natively with your iPhone, iPad, or Mac in seconds—zero third-party subscription fees or extra apps required.

Trigger a loud built-in sound chime directly from the Find My app when keys slip between sofa cushions, receive Left-Behind instant notifications if you walk away from your bag, and track lost items globally via hundreds of millions of encrypted Apple Find My devices. Built with UL4200A child-safe replaceable coin battery housing.

Key Highlights:
• Official Apple Find My Certified: Native setup & real-time map tracking on iOS / iPadOS / macOS
• Built-In Loud Audible Buzzer: Rings clearly to locate items hidden indoors
• Left-Behind & Lost Mode Alerts: Get instant notifications + share contact message for finders
• Complete Value Pack: Includes 2x FineTrack Mini Finders, keyrings/lanyard loops & pre-installed batteries`,
    tags: ['ugreen', 'smart tracker', 'apple find my', 'key finder', 'finetrack'],
    specifications: {
      Model: 'UGREEN FineTrack Mini (2-Pack)',
      Compatibility: 'iOS 14.5+ / iPadOS 14.5+ / macOS (Apple Find My App)',
      'Alert Sound': 'Built-in 80dB Buzzer',
      'Battery Type': 'Replaceable CR2032 Coin Cell (Included)',
      'Safety Standard': 'UL4200A Child-Resistant Battery Lock',
      Connectivity: 'Bluetooth Low Energy (BLE 5.x)',
      Package: '2x Trackers + Keyring Attachments',
      Color: 'Matte Black',
    },
    soldCount: 39,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 1 (Demo)',
        text: 'Sample Review: Connected to the native iPhone Find My app in ten seconds. Great value getting two tags with keychains in one box.',
        daysAgo: 7,
        helpfulCount: 7,
      },
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 2 (Demo)',
        text: 'Sample Review: Tested in checked luggage and daily keychain use. Left-behind alert works reliably every time.',
        daysAgo: 21,
        helpfulCount: 3,
      },
    ],
  },
  {
    id: 'demo-prod-006',
    slug: 'baseus-metal-gleam-series-9-in-1-usb-c-hub',
    name: 'Baseus Metal Gleam Series 9-in-1 USB-C Multiport Hub (4K HDMI, 100W PD, RJ45)',
    sku: 'BS-WKWG020113',
    brand: 'Baseus',
    price: 5290,
    regularPrice: 6490,
    stock: 19,
    weight: '109g',
    images: [
      'https://cdn.shopify.com/s/files/1/0555/8432/5709/files/Baseus_Metal_Gleam_Series_9_in_1_USB_C_HUB_1.jpg?v=1778662625&width=900',
      'https://cdn.shopify.com/s/files/1/0555/8432/5709/files/Baseus_Metal_Gleam_Series_9_in_1_USB_C_HUB_2.jpg?v=1778662661&width=900',
      'https://cdn.shopify.com/s/files/1/0555/8432/5709/files/Baseus_Metal_Gleam_Series_9_in_1_USB_C_HUB_3.jpg?v=1778662679&width=900',
    ],
    shortDescription:
      'CNC aluminum 9-in-1 USB-C docking adapter with 4K HDMI, 100W PD pass-through charging, 1000Mbps Gigabit Ethernet, 3x USB 3.0, and SD/TF card readers.',
    description: `Expand a single laptop USB-C or Thunderbolt port into a complete workstation with the Baseus Metal Gleam Series 9-in-1 Multifunctional Hub. Crafted from sandblasted anodized aluminum alloy for superior heat dissipation and durability, it packs 9 essential ports into a sleek bar that pairs seamlessly with MacBook Pro/Air, Windows ultrabooks, and iPad Pro.

Mirror or extend your desktop to an external monitor in sharp 4K resolution via HDMI, maintain rock-solid wired internet over the 1000Mbps RJ45 Gigabit LAN port, transfer RAW camera photos rapidly with dual SD/TF slots, and keep your laptop topped up with 100W PD pass-through input (up to 85W host charging).

Key Highlights:
• 9 Essential Expansion Ports: 4K HDMI, 100W PD USB-C, Gigabit RJ45 Ethernet, 3x USB 3.0 (5Gbps), SD & MicroSD/TF slots, plus VGA/Aux workspace versatility
• High-Speed Data Transfer: Up to 5Gbps across USB 3.0 ports for external drives & peripherals
• Warm Orange LED Status Ring: Clean minimal indicator shows active power/link connection
• Braided Stress-Relief Cable: Durable tucked design built for daily studio & office use`,
    tags: ['baseus', 'usb-c hub', '9 in 1 hub', 'macbook hub', 'gigabit ethernet adapter'],
    specifications: {
      Model: 'Baseus Metal Gleam Series 9-in-1',
      'Video Output': 'HDMI 4K Ultra HD',
      'Power Delivery': 'USB-C PD 100W Input (85W Host Output)',
      Ethernet: 'RJ45 Gigabit LAN (10/100/1000Mbps)',
      'Data Ports': '3x USB 3.0 Type-A (Up to 5Gbps)',
      'Card Reader': 'SD + TF (MicroSD) Dual Slots',
      Chassis: 'CNC Sandblasted Aluminum Alloy',
      Compatibility: 'MacBook Pro/Air, Windows USB-C / Thunderbolt 3/4, iPadOS',
    },
    soldCount: 31,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 1 (Demo)',
        text: 'Sample Review: All ports including Gigabit Ethernet and HDMI work out of the box on macOS and Windows with zero driver hassle.',
        daysAgo: 8,
        helpfulCount: 6,
      },
      {
        rating: 4,
        reviewerName: 'Sample Reviewer 2 (Demo)',
        text: 'Sample Review: Clean aluminum finish matches Space Gray laptops well. SD card reader speed is fast for camera workflow.',
        daysAgo: 23,
        helpfulCount: 2,
      },
    ],
  },
  {
    id: 'demo-prod-007',
    slug: 'baseus-enerfill-fc41-20000mah-100w-digital-display-power-bank',
    name: 'Baseus EnerFill FC41 20000mAh 100W Digital Display Fast Charging Power Bank',
    sku: 'BS-P10076502',
    brand: 'Baseus',
    price: 5850,
    regularPrice: 7200,
    stock: 25,
    weight: '430g',
    images: [
      'https://cdn.shopify.com/s/files/1/0555/8432/5709/files/Baseus_EnerFill_FC41_Digital_Display_Power_Bank_20000mAh_100W_1.jpg?v=1763532603&width=900',
      'https://cdn.shopify.com/s/files/1/0555/8432/5709/files/Baseus_EnerFill_FC41_Digital_Display_Power_Bank_20000mAh_100W_2.jpg?v=1763532603&width=900',
      'https://cdn.shopify.com/s/files/1/0555/8432/5709/files/Baseus_EnerFill_FC41_Digital_Display_Power_Bank_20000mAh_100W_3.jpg?v=1763532603&width=900',
    ],
    shortDescription:
      'High-output 20000mAh 100W PD laptop & smartphone power bank with built-in dual USB-C fast cables, smart TFT/LED digital display, and 4-device simultaneous charging.',
    description: `Power your MacBook, Steam Deck, tablet, and smartphone anywhere with the Baseus EnerFill FC41 20000mAh 100W Power Bank. Featuring dual integrated braided USB-C fast-charging cables (that neatly double as an ergonomic carry strap) alongside extra USB-C and USB-A ports, you never have to worry about forgetting cables when heading out.

With up to 100W single-port USB-C Power Delivery output, it charges ultrabooks at full wall-adapter speed and recharges itself rapidly in minimal downtime. The crisp digital screen displays exact battery percentage and real-time status monitoring, while the 74Wh battery pack complies with international airline carry-on regulations.

Key Highlights:
• True 100W Laptop Fast Charging: Powers MacBook Pro, Dell XPS, iPad Pro, and handheld consoles
• Built-In Dual USB-C Cables + Extra Ports: Charge up to 4 devices at the same time
• Smart Digital Display: Real-time battery readout at a glance
• Airline Carry-On Safe (20000mAh / 74Wh) with ergonomic rounded body and portable lanyard cable`,
    tags: ['baseus', '100w power bank', 'laptop power bank', '20000mah', 'enerfill fc41'],
    specifications: {
      Model: 'Baseus EnerFill FC41',
      Capacity: '20,000mAh (74Wh, Airline Approved)',
      'Max Output': '100W USB-C PD Fast Charging',
      Cables: 'Built-in Dual USB-C Bi-Directional Cables',
      'Additional Ports': '1x USB-C + 1x USB-A',
      Display: 'Smart Digital Battery Percentage Screen',
      Protections: 'BPS II Smart Power Allocation & NTC Temperature Control',
      Color: 'Moon White',
    },
    soldCount: 58,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 1 (Demo)',
        text: 'Sample Review: Having two built-in USB-C cables makes travel effortless, and 100W output charges a 14-inch laptop at full speed.',
        daysAgo: 5,
        helpfulCount: 12,
      },
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 2 (Demo)',
        text: 'Sample Review: Digital screen and matte white shell look super clean. Easily handles two full phone charges plus laptop backup.',
        daysAgo: 16,
        helpfulCount: 5,
      },
    ],
  },
  {
    id: 'demo-prod-008',
    slug: 'baseus-picogo-ag11-45w-gan-universal-travel-adapter',
    name: 'Baseus PicoGo AG11 45W GaN 6-in-1 Universal Travel Adapter with Retractable USB-C Cable',
    sku: 'BS-AG11-45W',
    brand: 'Baseus',
    price: 3690,
    regularPrice: 4490,
    stock: 27,
    weight: '195g',
    images: [
      'https://cdn.shopify.com/s/files/1/0555/8432/5709/files/Baseus_PicoGo_AG11_Universal_Travel_Adapter_2AC_2U_2C_45W1.jpg?v=1763634407&width=900',
      'https://cdn.shopify.com/s/files/1/0555/8432/5709/files/Baseus_PicoGo_AG11_Universal_Travel_Adapter_2AC_2U_2C_45W2.jpg?v=1763634407&width=900',
      'https://cdn.shopify.com/s/files/1/0555/8432/5709/files/Baseus_PicoGo_AG11_Universal_Travel_Adapter_2AC_2U_2C_45W3.jpg?v=1763634407&width=900',
    ],
    shortDescription:
      'All-in-one worldwide travel adapter covering 200+ countries (US/UK/EU/AU plugs) with 45W GaN fast charging, built-in retractable USB-C cable, and AC sockets.',
    description: `One compact cube for every hotel room and airport lounge worldwide. The Baseus PicoGo AG11 45W GaN 6-in-1 Universal Travel Adapter integrates smooth slide-out US, UK, EU, and AU AC plugs compatible across 200+ countries and regions (100V–250V wide voltage).

Beyond dual universal AC outlets for laptops and camera chargers, it packs a built-in 45W GaN fast charger complete with an integrated retractable USB-C cable plus additional USB-C and USB-A ports—letting you charge up to 6 devices from a single wall socket without tangled wires.

Key Highlights:
• 4 Slide-Out International Plugs (US / UK / EU / AU): Ready for Asia, Europe, Middle East, UK & North America
• Built-In Retractable USB-C Cable + 45W GaN PD: Fast-charges phones, tablets & MacBook Air directly
• Dual AC Sockets + 2x USB-A + 2x USB-C (Total 6-in-1 Design)
• Replaceable Dual 10A Fuse + Child Safety Shutters for safe global operation`,
    tags: ['baseus', 'travel adapter', 'universal adapter', '45w gan', 'picogo ag11'],
    specifications: {
      Model: 'Baseus PicoGo AG11 45W GaN',
      'Plug Standards': 'US, UK, EU, AU Sliding Locks (200+ Countries)',
      'AC Rating': '100-250V~, 10A Max (2500W @ 250V)',
      'USB GaN Output': '45W Max Fast Charging',
      'USB Interfaces': '1x Retractable USB-C Cable + 1x USB-C Port + 2x USB-A Ports',
      'AC Outlets': 'Dual Universal AC Sockets',
      Safety: 'Dual 10A Overload Fuse + Child Safety Shutters + Fireproof PC Shell',
      Color: 'Black',
    },
    soldCount: 36,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 1 (Demo)',
        text: 'Sample Review: The built-in retractable USB-C cable saves packing an extra charger and cord on trips. Plug sliders lock firmly.',
        daysAgo: 9,
        helpfulCount: 6,
      },
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 2 (Demo)',
        text: 'Sample Review: Used across multiple countries with both laptop brick and phones plugged in simultaneously without any issues.',
        daysAgo: 20,
        helpfulCount: 4,
      },
    ],
  },
  {
    id: 'demo-prod-009',
    slug: 'soundpeats-air5-pro-adaptive-anc-true-wireless-earbuds',
    name: 'SoundPEATS Air5 Pro Adaptive ANC True Wireless Earbuds (Snapdragon Sound & LDAC)',
    sku: 'SP-AIR5PRO-BLK',
    brand: 'SoundPEATS',
    price: 6490,
    regularPrice: 7990,
    stock: 18,
    weight: '48g',
    images: [
      'https://cdn.shopify.com/s/files/1/0508/7461/3942/files/1-3_fc33b605-77ce-4805-9d05-f0a9d3a5fa67.jpg?v=1749031534&width=900',
      'https://cdn.shopify.com/s/files/1/0508/7461/3942/files/1-1_a18cc2a1-af30-40d5-9418-4b2996ffa4b8.jpg?v=1749031534&width=900',
      'https://cdn.shopify.com/s/files/1/0508/7461/3942/files/1-2_740513ea-70f5-49ee-8039-1721deb2e963.jpg?v=1749031534&width=900',
    ],
    shortDescription:
      'Flagship Qualcomm QCC3091 earbuds with -55dB AI Adaptive ANC, Hi-Res LDAC & aptX Lossless, 10mm composite PU+PEEK drivers, 6-Mic cVc 8.0 calls, and 37H battery.',
    description: `Engineered for audiophiles and busy commuters, the SoundPEATS Air5 Pro packs Qualcomm’s flagship QCC3091 audio SoC with full Snapdragon Sound, aptX Lossless, LE Audio, and Hi-Res Wireless LDAC support. Its bespoke 10mm composite bio-diaphragm driver (PU + PEEK) delivers deep controlled sub-bass, clear vocals, and airy detail.

AI Adaptive Active Noise Cancellation dynamically measures ear-canal acoustics and ambient sound to suppress up to -55dB of external noise. Six microphones paired with AI wind-noise suppression and Qualcomm cVc 8.0 keep voice calls crystal clear even outdoors, while ultra-light 4.8g earbuds ensure hours of fatigue-free wear.

Key Highlights:
• Hi-Res Wireless Audio: Qualcomm QCC3091 with LDAC, aptX Lossless & LE Audio
• -55dB AI Adaptive ANC + 6-Mic cVc 8.0 Call Noise Reduction
• 7.5H Single Charge / 37H Total Battery with Case (10-Min Quick Charge = 2H Playtime)
• Bluetooth 5.4 Multipoint Dual Connection + IPX5 Water Resistance + PeatsAudio App EQ`,
    tags: ['soundpeats', 'air5 pro', 'anc earbuds', 'tws earbuds', 'ldac aptx lossless'],
    specifications: {
      Model: 'SoundPEATS Air5 Pro',
      Chipset: 'Qualcomm QCC3091 (Snapdragon Sound)',
      Driver: '10mm Composite Bio-Diaphragm (PU + PEEK)',
      'Noise Cancellation': 'AI Adaptive ANC up to -55dB',
      'Audio Codecs': 'LDAC, aptX Lossless, aptX Adaptive, LE Audio, AAC, SBC',
      Microphones: '6-Mic Array with cVc 8.0 & AI Noise Reduction',
      'Battery Life': '7.5 Hours (Earbuds) / 37 Hours Total with Charging Case',
      'Bluetooth & Rating': 'Bluetooth 5.4, Dual-Device Multipoint, IPX5 Water Resistant',
    },
    soldCount: 44,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 1 (Demo)',
        text: 'Sample Review: Detailed vocals and punchy bass right out of the box, and the -55dB ANC noticeably quiets city traffic.',
        daysAgo: 2,
        helpfulCount: 14,
      },
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 2 (Demo)',
        text: 'Sample Review: Lightweight 4.8g fit stays secure during walks, and PeatsAudio custom EQ gives plenty of tuning control.',
        daysAgo: 12,
        helpfulCount: 7,
      },
    ],
  },
  {
    id: 'demo-prod-010',
    slug: 'haylou-solar-pro-amoled-bluetooth-calling-smart-watch',
    name: 'HAYLOU Solar Pro 1.43" AMOLED Bluetooth Calling Smart Watch (IP68 Waterproof)',
    sku: 'HL-LS18-PRO',
    brand: 'HAYLOU',
    price: 4790,
    regularPrice: 5790,
    stock: 31,
    weight: '45g',
    images: [
      'https://cdn.shopify.com/s/files/1/0685/8322/7676/files/2_e72bf182-1bb4-4081-b521-142a878c0374.jpg?v=1702017128&width=900',
      'https://cdn.shopify.com/s/files/1/0685/8322/7676/files/6_1.jpg?v=1761875705&width=900',
      'https://cdn.shopify.com/s/files/1/0685/8322/7676/files/4_1.jpg?v=1761875705&width=900',
    ],
    shortDescription:
      'Rugged round smartwatch featuring a sharp 1.43" 466x466 AMOLED Always-On screen, crisp Bluetooth phone calling, 105+ workout modes, and IP68 water resistance.',
    description: `Built for everyday utility and active fitness, the HAYLOU Solar Pro showcases a vivid 1.43-inch 466×466 HD AMOLED screen housed inside an engineered military-tough alloy bezel with a tactile rotating crown. Crisp 60Hz animations and Always-On Display support keep notifications, weather, and watch faces legible even in bright daylight.

Answer and dial calls directly from your wrist via Hi-Fi Bluetooth voice calling, track 24-hour heart rate, SpO2 blood oxygen, sleep stages, and stress metrics, and log performance across 105 workout modes—all backed by IP68 sweat and rain protection and up to 7–14 days of reliable battery endurance.

Key Highlights:
• 1.43" AMOLED 466×466 HD Screen (326 PPI) with Always-On Display & 150+ Cloud Watch Faces
• Clear Bluetooth Wrist Calling + Built-In AI Voice Assistant & SOS Emergency Shortcut
• 105 Sports Modes + Continuous Heart Rate, SpO2, Sleep & Stress Tracking
• IP68 Water & Dust Resistance + Comfortable 22mm Interchangeable Silicone Strap`,
    tags: ['haylou', 'solar pro', 'amoled smartwatch', 'bluetooth calling watch', 'smartwatch'],
    specifications: {
      Model: 'HAYLOU Solar Pro',
      Display: '1.43-inch AMOLED, 466 × 466 Resolution, 60Hz Refresh Rate',
      'Bluetooth Calling': 'Supported (Built-In Speaker & Microphone)',
      'Sports Modes': '105 Workout Modes',
      'Health Sensors': '24/7 Heart Rate, SpO2 Blood Oxygen, Sleep & Stress Monitor',
      'Water Resistance': 'IP68 Waterproof',
      'Battery Endurance': 'Up to 7 Days Typical / 14 Days Basic Use (300mAh)',
      Strap: '22mm Replaceable Black Silicone Strap',
    },
    soldCount: 71,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Sample Reviewer 1 (Demo)',
        text: 'Sample Review: Super bright 466x466 AMOLED screen stays easy to read outdoors, and the rotating crown feels snappy in menus.',
        daysAgo: 4,
        helpfulCount: 10,
      },
      {
        rating: 4,
        reviewerName: 'Sample Reviewer 2 (Demo)',
        text: 'Sample Review: Bluetooth calling speaker is clear indoors and battery easily gets nearly a full week with Always-On Display off.',
        daysAgo: 18,
        helpfulCount: 5,
      },
    ],
  },
];

const DEMO_SAMPLE_REVIEWS_MAP = new Map<string, DemoSampleReview[]>();
const DEMO_SAMPLE_METRICS_MAP = new Map<string, ProductMetrics>();

export const GADGET_PULSE_DEMO_PRODUCTS: DemoStoreProduct[] = RAW_DEMO_PRODUCTS.map((seed, index) => {
  const createdAt = BASE_CREATED_AT + index * 3600 * 1000;
  const discount = Math.round(((seed.regularPrice - seed.price) / seed.regularPrice) * 100);
  const reviewCount = seed.sampleReviews.length;
  const avgRating =
    reviewCount > 0
      ? Number(
          (
            seed.sampleReviews.reduce((sum, item) => sum + item.rating, 0) / reviewCount
          ).toFixed(1)
        )
      : 0;

  const sampleReviewObjects: DemoSampleReview[] = seed.sampleReviews.map((rev, rIdx) => ({
    id: `${seed.id}-sample-rev-${rIdx + 1}`,
    reviewId: `${seed.id}-sample-rev-${rIdx + 1}`,
    orderId: '',
    productId: seed.id,
    productName: seed.name,
    productImage: seed.images[0],
    userId: `demo-sample-user-${rIdx + 1}`,
    reviewerName: rev.reviewerName,
    customerName: rev.reviewerName,
    rating: rev.rating,
    text: rev.text,
    images: [],
    createdAt: BASE_CREATED_AT + (30 - rev.daysAgo) * 86400000,
    helpfulCount: rev.helpfulCount,
    verifiedPurchase: false,
    isDelivered: false,
    isDemoSample: true,
    status: 'sample_demo',
    vendorId: TARGET_DEMO_PRODUCT_STORE_ID,
    vendorName: TARGET_DEMO_PRODUCT_STORE_NAME,
  }));

  DEMO_SAMPLE_REVIEWS_MAP.set(seed.id.toLowerCase(), sampleReviewObjects);
  DEMO_SAMPLE_REVIEWS_MAP.set(seed.slug.toLowerCase(), sampleReviewObjects);

  const metricsObj: ProductMetrics = {
    soldCount: seed.soldCount,
    rating: avgRating,
    reviewsCount: reviewCount,
  };
  DEMO_SAMPLE_METRICS_MAP.set(seed.id.toLowerCase(), metricsObj);
  DEMO_SAMPLE_METRICS_MAP.set(seed.slug.toLowerCase(), metricsObj);

  return {
    id: seed.id,
    slug: seed.slug,
    name: seed.name,
    title: seed.name,
    sku: seed.sku,
    brand: seed.brand,
    category: 'Electronics',
    price: seed.price,
    regularPrice: seed.regularPrice,
    originalPrice: seed.regularPrice,
    discount,
    inStock: true,
    stock: seed.stock,
    stockCount: seed.stock,
    weight: seed.weight,
    image: seed.images[0],
    featuredImage: seed.images[0],
    images: seed.images,
    shortDescription: seed.shortDescription,
    description: seed.description,
    tags: seed.tags,
    specifications: seed.specifications,
    vendorId: TARGET_DEMO_PRODUCT_STORE_ID,
    storeId: TARGET_DEMO_PRODUCT_STORE_ID,
    storeName: TARGET_DEMO_PRODUCT_STORE_NAME,
    vendor: GADGET_PULSE_VENDOR,
    soldCount: seed.soldCount,
    salesCount: seed.soldCount,
    totalSold: seed.soldCount,
    rating: avgRating,
    reviews: reviewCount,
    reviewsCount: reviewCount,
    status: 'active',
    isDemo: true,
    isSampleData: true,
    createdAt,
  };
});

const DEMO_PRODUCT_BY_KEY = new Map<string, DemoStoreProduct>();
GADGET_PULSE_DEMO_PRODUCTS.forEach((product) => {
  DEMO_PRODUCT_BY_KEY.set(product.id.toLowerCase(), product);
  DEMO_PRODUCT_BY_KEY.set(product.slug.toLowerCase(), product);
});

const TARGET_STORE_ALIASES = new Set<string>([
  TARGET_DEMO_PRODUCT_STORE_ID.toLowerCase(),
  TARGET_DEMO_PRODUCT_STORE_SLUG.toLowerCase(),
  TARGET_DEMO_PRODUCT_STORE_NAME.toLowerCase(),
]);

export function getDemoProductsByStore(storeKey?: string | null): DemoStoreProduct[] {
  if (!storeKey) return [];
  const normalized = String(storeKey).trim().toLowerCase();
  if (TARGET_STORE_ALIASES.has(normalized)) {
    return GADGET_PULSE_DEMO_PRODUCTS;
  }
  return [];
}

export function getDemoProductByIdOrSlug(identifier?: string | null): DemoStoreProduct | null {
  if (!identifier) return null;
  const clean = String(identifier).trim().toLowerCase();
  return DEMO_PRODUCT_BY_KEY.get(clean) || null;
}

export function getDemoSampleReviews(productId?: string | null): DemoSampleReview[] {
  if (!productId) return [];
  return DEMO_SAMPLE_REVIEWS_MAP.get(String(productId).trim().toLowerCase()) || [];
}

export function getDemoSampleMetrics(productId?: string | null): ProductMetrics | null {
  if (!productId) return null;
  return DEMO_SAMPLE_METRICS_MAP.get(String(productId).trim().toLowerCase()) || null;
}
