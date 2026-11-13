import type { DemoStoreProduct, DemoSampleReview } from './demoProducts';
import type { ProductMetrics } from '../services/productMetricsService';

interface FashionStoreTarget {
  id: string;
  name: string;
  slug: string;
}

const FASHION_STORES: Record<string, FashionStoreTarget> = {
  urbanThread: {
    id: 'demo-store-007',
    name: 'Urban Thread',
    slug: 'urban-thread',
  },
  cobaltMenswear: {
    id: 'demo-store-031',
    name: 'Cobalt Menswear',
    slug: 'cobalt-menswear',
  },
  vogueBazar: {
    id: 'demo-store-003',
    name: 'Vogue Bazar BD',
    slug: 'vogue-bazar-bd',
  },
  breezeCasuals: {
    id: 'demo-store-035',
    name: 'Breeze Casuals',
    slug: 'breeze-casuals',
  },
};

interface RawFashionProductSeed {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brand: string;
  storeKey: keyof typeof FASHION_STORES;
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

const BASE_FASHION_CREATED_AT = 1738320000000;

const RAW_FASHION_PRODUCTS: RawFashionProductSeed[] = [
  {
    id: 'fashion-prod-001',
    slug: 'mens-signature-crew-neck-cotton-tshirt-white',
    name: "Men's Signature Crew Neck Cotton T-Shirt — Pure White",
    sku: 'ML-SCT-WHT-01',
    brand: 'Marine Layer',
    storeKey: 'urbanThread',
    price: 490,
    regularPrice: 650,
    stock: 48,
    weight: '180g',
    images: [
      'https://cdn.shopify.com/s/files/1/0831/9103/files/mens_signature_crew_tee_pure_white-FINAL-GREY-Web_a6f1a651-a9dd-43c4-a9e7-c8a78391fb63_1.jpg?v=1794521105&width=900',
      'https://cdn.shopify.com/s/files/1/0831/9103/files/MSC1-WH_Back_-thumb_9ecb9d6a-80a1-469e-a680-06fb2ffe96ae.jpg?v=1794521106&width=900',
      'https://cdn.shopify.com/s/files/1/0831/9103/files/M_Signature_True_Crew_Pure_White_24352-Final-Final-Crop-Med_b2e337ec-82e4-4cf2-a7dd-b065229ae5cf.jpg?v=1794521106&width=900',
    ],
    shortDescription:
      'Breathable pre-shrunk Supima cotton & micro-modal blend crew-neck T-shirt with clean tailored shoulders for everyday comfort.',
    description: `Crafted from an ultra-soft combed cotton and beechwood micro-modal jersey knit, this pure white crew-neck T-shirt delivers all-day breathability in humid weather while holding a crisp, clean drape. Pre-washed to resist shrinking and twisting after repeated machine washes.

Key Highlights:
• 50% Supima Cotton / 50% Micro-Modal Jersey Knit (180 GSM)
• Ribbed lay-flat collar that prevents stretching out
• Tailored regular fit — pairs cleanly under shirts or worn solo
• Sizes Available: S, M, L, XL, XXL`,
    tags: ['fashion', 't-shirt', 'mens wear', 'cotton tee', 'white tshirt'],
    specifications: {
      Material: '50% Supima Cotton, 50% Micro-Modal',
      'Fabric Weight': '180 GSM',
      Fit: 'Regular Tailored Fit',
      Neckline: 'Ribbed Crew Neck',
      Sleeve: 'Short Sleeve',
      'Wash Care': 'Machine wash cold, tumble dry low',
      Color: 'Pure White',
    },
    soldCount: 41,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Tanvir Ahmed',
        text: 'Super breathable cotton blend that stays cool in Dhaka heat and the collar keeps its neat round shape.',
        daysAgo: 3,
        helpfulCount: 6,
      },
      {
        rating: 5,
        reviewerName: 'Rashedul Karim',
        text: 'Fabric feels noticeably smoother than standard tees and did not shrink after two gentle washes.',
        daysAgo: 9,
        helpfulCount: 4,
      },
      {
        rating: 4,
        reviewerName: 'Sajjad Hossain',
        text: 'Clean opaque white weave so it looks sharp on its own or layered beneath an overshirt.',
        daysAgo: 15,
        helpfulCount: 3,
      },
    ],
  },
  {
    id: 'fashion-prod-002',
    slug: 'womens-mina-twisted-longsleeve-top-lavender',
    name: "Women's Mina Twisted Knot Long-Sleeve Knit Top — Lavender Ash",
    sku: 'KT-MTL-LAV-02',
    brand: 'Kotn',
    storeKey: 'vogueBazar',
    price: 590,
    regularPrice: 780,
    stock: 32,
    weight: '210g',
    images: [
      'https://cdn.shopify.com/s/files/1/0932/1356/files/WOMENS_MINA_TWISTED_LONGSLEEVE_PURPLE_REIGN_02.jpg?v=1793812888&width=900',
      'https://cdn.shopify.com/s/files/1/0932/1356/files/WOMENS_MINA_TWISTED_LONGSLEEVE_PURPLE_REIGN_03.jpg?v=1793812888&width=900',
      'https://cdn.shopify.com/s/files/1/0932/1356/files/WOMENS_MINA_TWISTED_LONGSLEEVE_PURPLE_REIGN_01.jpg?v=1793812888&width=900',
    ],
    shortDescription:
      'Long-sleeve stretch cotton rib top featuring a flattering front-twist drape and soft breathable Egyptian cotton finish.',
    description: `Designed with an effortless front-twist detail at the waist, the Mina Long-Sleeve Top elevates casual denim or high-waisted trousers with a refined silhouette. Knit from long-staple Egyptian cotton with light elastane recovery for comfortable movement throughout the day.

Key Highlights:
• 95% Long-Staple Egyptian Cotton, 5% Elastane Rib
• Signature front-twist waist accent for a flattering shape
• Smooth matte finish in soft Lavender Ash tone
• Sizes Available: XS, S, M, L, XL`,
    tags: ['fashion', 'womens top', 'longsleeve', 'knit top', 'casual wear'],
    specifications: {
      Material: '95% Cotton, 5% Elastane',
      Fit: 'Slim Draped Fit',
      Sleeve: 'Full Long Sleeve',
      Detail: 'Front Twist Waist',
      'Wash Care': 'Cold gentle cycle, lay flat to dry',
      Color: 'Lavender Ash / Plum',
    },
    soldCount: 29,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Nusrat Jahan',
        text: 'The front twist sits neatly right at the waist without feeling tight, and the lavender shade is subtle and classy.',
        daysAgo: 4,
        helpfulCount: 5,
      },
      {
        rating: 5,
        reviewerName: 'Tasnim Sultana',
        text: 'Soft ribbed cotton has nice stretch and pairs effortlessly with wide-leg trousers for office or brunch.',
        daysAgo: 11,
        helpfulCount: 3,
      },
    ],
  },
  {
    id: 'fashion-prod-003',
    slug: 'mens-midweight-striped-longsleeve-polo-shirt',
    name: "Men's Midweight Striped Long-Sleeve Cotton Polo Shirt",
    sku: 'KT-MLP-STR-03',
    brand: 'Kotn',
    storeKey: 'urbanThread',
    price: 680,
    regularPrice: 890,
    stock: 27,
    weight: '310g',
    images: [
      'https://cdn.shopify.com/s/files/1/0932/1356/files/MENS_MIDWEIGHT_LONGSLEEVE_POLO_MAHONGANY_DARK_SLATE_CHARCOAL_STORM_STRIPE_02.jpg?v=1793815777&width=900',
      'https://cdn.shopify.com/s/files/1/0932/1356/files/MENS_MIDWEIGHT_LONGSLEEVE_POLO_MAHONGANY_DARK_SLATE_CHARCOAL_STORM_STRIPE_03.jpg?v=1793815777&width=900',
      'https://cdn.shopify.com/s/files/1/0932/1356/files/MENS_MIDWEIGHT_LONGSLEEVE_POLO_MAHONGANY_DARK_SLATE_CHARCOAL_STORM_STRIPE_01.jpg?v=1793815777&width=900',
    ],
    shortDescription:
      'Yarn-dyed horizontal stripe rugby polo crafted from structured 100% midweight cotton jersey with a crisp contrast collar.',
    description: `Inspired by classic heritage rugby jerseys, this midweight long-sleeve polo features rich yarn-dyed stripes in mahogany, charcoal, and slate tones. Cut in a relaxed structured silhouette with a concealed button placket and sturdy ribbed cuffs.

Key Highlights:
• 100% Combed Midweight Cotton Jersey (260 GSM)
• Crisp spread polo collar with reinforced placket
• Yarn-dyed stripes that never fade or peel
• Sizes Available: S, M, L, XL`,
    tags: ['fashion', 'polo shirt', 'longsleeve polo', 'mens clothing', 'striped polo'],
    specifications: {
      Material: '100% Combed Cotton Jersey',
      'Fabric Weight': '260 GSM',
      Collar: 'Contrast Spread Polo Collar',
      Cuffs: 'Ribbed Knit Cuffs',
      Pattern: 'Yarn-Dyed Multi-Stripe',
      Color: 'Mahogany / Charcoal / Slate',
    },
    soldCount: 33,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Faisal Mahmud',
        text: 'Midweight jersey feels substantial on cool evenings and the yarn-dyed stripes look crisp up close.',
        daysAgo: 5,
        helpfulCount: 7,
      },
      {
        rating: 4,
        reviewerName: 'Ashraful Alam',
        text: 'Collar holds up cleanly without curling and the relaxed shoulder seam gives plenty of room.',
        daysAgo: 12,
        helpfulCount: 4,
      },
      {
        rating: 5,
        reviewerName: 'Kazi Noman',
        text: 'Rich mahogany and charcoal tones look great with khaki chinos or dark denim.',
        daysAgo: 18,
        helpfulCount: 5,
      },
      {
        rating: 5,
        reviewerName: 'Rezaul Karim',
        text: 'Zero color bleed on the first cold wash and sleeve cuffs stay snug without pinching.',
        daysAgo: 23,
        helpfulCount: 2,
      },
    ],
  },
  {
    id: 'fashion-prod-004',
    slug: 'womens-tencel-pacific-relaxed-jogger-pant',
    name: "Women's Tencel Pacific Relaxed Fit Jogger Pant — Olive Green",
    sku: 'TT-TPJ-OLV-04',
    brand: 'Tentree',
    storeKey: 'breezeCasuals',
    price: 760,
    regularPrice: 980,
    stock: 36,
    weight: '290g',
    images: [
      'https://cdn.shopify.com/s/files/1/2341/3995/products/Green-Women_s-Tencel-Joggers-TCW3131-0012_5.jpg?v=1769732938&width=900',
      'https://cdn.shopify.com/s/files/1/2341/3995/products/Green-Women_s-Tencel-Joggers-TCW3131-0012_6.jpg?v=1769732938&width=900',
      'https://cdn.shopify.com/s/files/1/2341/3995/products/Green-Women_s-Tencel-Joggers-TCW3131-0012_1.jpg?v=1769732938&width=900',
    ],
    shortDescription:
      'Silky-cool Tencel lyocell tapered jogger pant with elastic drawstring waist, side pockets, and ankle cuffs.',
    description: `Lightweight, airy, and drape-friendly, the Tencel Pacific Jogger is woven from sustainable Tencel lyocell fibers blended with a hint of spandex. Designed with an adjustable flat drawstring waistband, deep side slash pockets, and gentle elastic ankle cuffs for travel, errands, and lounging.

Key Highlights:
• 98% Tencel Lyocell, 2% Elastane Twill
• Naturally moisture-wicking and cool against skin
• Mid-rise elastic waistband with braided cotton drawcord
• Sizes Available: XS, S, M, L, XL`,
    tags: ['fashion', 'jogger', 'womens pant', 'tencel pant', 'trousers'],
    specifications: {
      Material: '98% Tencel Lyocell, 2% Elastane',
      Fit: 'Relaxed Tapered Jogger',
      Waistband: 'Elastic with Drawstring',
      Pockets: '2 Front Slash Pockets, 2 Back Welt Pockets',
      Color: 'Olive Green',
    },
    soldCount: 38,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Farhana Yasmin',
        text: 'Tencel fabric feels breezy and silky even during warm afternoons—way lighter than heavy fleece joggers.',
        daysAgo: 2,
        helpfulCount: 8,
      },
      {
        rating: 5,
        reviewerName: 'Maliha Chowdhury',
        text: 'Deep side pockets easily hold a smartphone securely while walking and the waistband never digs in.',
        daysAgo: 8,
        helpfulCount: 5,
      },
      {
        rating: 4,
        reviewerName: 'Sabrina Kabir',
        text: 'Tailored ankle cuff makes these look polished enough for travel days with white sneakers.',
        daysAgo: 14,
        helpfulCount: 3,
      },
    ],
  },
  {
    id: 'fashion-prod-005',
    slug: 'mens-forest-plaid-flannel-button-down-shirt',
    name: "Men's Forest Plaid Organic Cotton Flannel Button-Down Shirt",
    sku: 'TT-FPF-MLT-05',
    brand: 'Tentree',
    storeKey: 'cobaltMenswear',
    price: 840,
    regularPrice: 1120,
    stock: 30,
    weight: '340g',
    images: [
      'https://cdn.shopify.com/s/files/1/2341/3995/files/Multi-Men_s-Longsleeve-Button-Down-TCM4546-5875_3.jpg?v=1753128475&width=900',
      'https://cdn.shopify.com/s/files/1/2341/3995/files/Multi-Men_s-Longsleeve-Button-Down-TCM4546-5875_1.jpg?v=1753128475&width=900',
      'https://cdn.shopify.com/s/files/1/2341/3995/files/Multi-Men_s-Longsleeve-Button-Down-TCM4546-5875_2.jpg?v=1753128475&width=900',
    ],
    shortDescription:
      'Brushed organic cotton flannel casual button-down shirt featuring classic multi-check plaid, button chest pocket, and curved hem.',
    description: `Double-brushed for cozy softness inside and out, this long-sleeve plaid flannel shirt balances rugged texture with tailored clean lines. Wear it buttoned for smart-casual occasions or unbuttoned over a white crew-neck tee.

Key Highlights:
• 100% Brushed Organic Cotton Flannel
• Classic button-down collar and single chest patch pocket
• Box-pleat back yoke for unrestricted shoulder movement
• Sizes Available: S, M, L, XL, XXL`,
    tags: ['fashion', 'shirt', 'flannel shirt', 'mens shirt', 'casual shirt'],
    specifications: {
      Material: '100% Brushed Organic Cotton',
      Pattern: 'Forest Multi-Check Plaid',
      Closure: 'Full Front Button Placket',
      Fit: 'Standard Casual Fit',
      Hem: 'Curved Shirttail Hem',
    },
    soldCount: 44,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Imtiaz Rahman',
        text: 'Soft brushed flannel feels warm without being stiff, and the plaid pattern lines up cleanly along the pocket.',
        daysAgo: 3,
        helpfulCount: 7,
      },
      {
        rating: 5,
        reviewerName: 'Nayeem Siddiqui',
        text: 'Great sleeve length and comfortable fit layered over a plain white tee.',
        daysAgo: 10,
        helpfulCount: 4,
      },
      {
        rating: 4,
        reviewerName: 'Tariq Anwar',
        text: 'Durable stitching around buttonholes and cuffs; keeps its soft nap after washing.',
        daysAgo: 16,
        helpfulCount: 3,
      },
      {
        rating: 5,
        reviewerName: 'Mehedi Hasan',
        text: 'Rich forest tones match dark jeans and chinos effortlessly.',
        daysAgo: 21,
        helpfulCount: 5,
      },
      {
        rating: 5,
        reviewerName: 'Sohail Rana',
        text: 'True to size across the shoulders with a neat curved hem.',
        daysAgo: 26,
        helpfulCount: 2,
      },
    ],
  },
  {
    id: 'fashion-prod-006',
    slug: 'womens-utility-pocket-cargo-pants-olive',
    name: "Women's High-Rise Utility Pocket Cargo Pants — Earth Olive",
    sku: 'KT-WCP-OLV-06',
    brand: 'Kotn',
    storeKey: 'vogueBazar',
    price: 890,
    regularPrice: 1180,
    stock: 25,
    weight: '420g',
    images: [
      'https://cdn.shopify.com/s/files/1/0932/1356/files/WOMENS_POCKET_CARGO_PANT_OLIVE_01.jpg?v=1793814118&width=900',
      'https://cdn.shopify.com/s/files/1/0932/1356/files/WOMENS_POCKET_CARGO_PANT_OLIVE_03.jpg?v=1793814116&width=900',
      'https://cdn.shopify.com/s/files/1/0932/1356/files/WOMENS_POCKET_CARGO_PANT_OLIVE_02.jpg?v=1793814116&width=900',
    ],
    shortDescription:
      'Relaxed wide-straight cotton twill cargo trousers with pleated side utility pockets and structured high-rise waistband.',
    description: `Cut from crisp, breathable 100% cotton twill, these high-rise cargo pants combine functional side bellow pockets with an effortlessly modern straight-leg drape. Features belt loops, zip fly, and reinforced double-needle seams.

Key Highlights:
• 100% Cotton Ripstop Twill (Non-Sheer Heavyweight)
• High-rise waist with zip fly and metal button closure
• Dual thigh flap cargo pockets + front & back pockets
• Sizes Available: 26, 28, 30, 32, 34`,
    tags: ['fashion', 'cargo pants', 'womens trousers', 'cotton pants', 'olive pants'],
    specifications: {
      Material: '100% Cotton Twill',
      Rise: 'High-Rise',
      Leg: 'Relaxed Straight Fit',
      Pockets: '6 Functional Pockets',
      Color: 'Earth Olive',
    },
    soldCount: 27,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Samira Tasnim',
        text: 'Heavy cotton twill drapes cleanly down to sneakers and the side pockets do not puff out awkwardly.',
        daysAgo: 4,
        helpfulCount: 6,
      },
      {
        rating: 5,
        reviewerName: 'Anika Tabassum',
        text: 'High waist sits comfortably without gaping at the back, and the olive tone matches neutral tops easily.',
        daysAgo: 11,
        helpfulCount: 4,
      },
      {
        rating: 4,
        reviewerName: 'Rifaat Jahan',
        text: 'Solid metal zipper and crisp seam stitching throughout.',
        daysAgo: 19,
        helpfulCount: 3,
      },
    ],
  },
  {
    id: 'fashion-prod-007',
    slug: 'mens-utility-navy-corduroy-overshirt',
    name: "Men's Utility Heavyweight Corduroy Overshirt — Deep Navy",
    sku: 'TS-UCO-NVY-07',
    brand: 'Taylor Stitch',
    storeKey: 'cobaltMenswear',
    price: 950,
    regularPrice: 1290,
    stock: 22,
    weight: '480g',
    images: [
      'https://cdn.shopify.com/s/files/1/0070/1922/files/Q426_TheUtilityShirt-NavyCorduroy_PDP_001.jpg?v=1793898617&width=900',
      'https://cdn.shopify.com/s/files/1/0070/1922/files/Q426_TheUtilityShirt-NavyCorduroy_PDP_002.jpg?v=1793898618&width=900',
      'https://cdn.shopify.com/s/files/1/0070/1922/files/Q426_TheUtilityShirt-NavyCorduroy_PDP_003.jpg?v=1793898618&width=900',
    ],
    shortDescription:
      'Fine-wale organic cotton corduroy utility shirt with twin button-flap chest pockets and rugged double-stitched seams.',
    description: `Built like an heirloom workshirt and tailored like a contemporary overshirt, this Deep Navy corduroy shirt features plush 14-wale organic cotton ridges that soften with every wear. Dual chest utility pockets include a stitched pen slot and custom matte horn-style buttons.

Key Highlights:
• 100% Organic 14-Wale Cotton Corduroy (8 oz)
• Dual button-through utility chest pockets
• Double-needle felled side seams for extra durability
• Sizes Available: S, M, L, XL, XXL`,
    tags: ['fashion', 'corduroy shirt', 'overshirt', 'mens shirt', 'navy shirt'],
    specifications: {
      Material: '100% Organic Cotton Corduroy',
      Wale: '14-Wale Fine Corduroy',
      Weight: '8 oz Mid-Heavyweight',
      Pockets: '2 Button-Flap Chest Pockets',
      Color: 'Deep Navy',
    },
    soldCount: 31,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Adnan Chowdhury',
        text: 'Corduroy texture looks rich under indoor lighting and works smoothly as a light outer jacket over a tee.',
        daysAgo: 2,
        helpfulCount: 9,
      },
      {
        rating: 5,
        reviewerName: 'Zubair Hossain',
        text: 'Thick buttons and reinforced shoulder stitching give it a really substantial quality feel.',
        daysAgo: 9,
        helpfulCount: 5,
      },
      {
        rating: 5,
        reviewerName: 'Kamrul Islam',
        text: 'Fine-wale fabric bends easily at the elbows without feeling stiff right out of the package.',
        daysAgo: 15,
        helpfulCount: 4,
      },
      {
        rating: 4,
        reviewerName: 'Shafiqul Bari',
        text: 'Deep navy color pairs cleanly with beige chinos and leather boots.',
        daysAgo: 22,
        helpfulCount: 3,
      },
    ],
  },
  {
    id: 'fashion-prod-008',
    slug: 'mens-straight-fit-donegal-camp-pant-taupe',
    name: "Men's Straight-Fit Stretch Twill Camp Chino Pant — Warm Taupe",
    sku: 'ML-DCP-TPE-08',
    brand: 'Marine Layer',
    storeKey: 'cobaltMenswear',
    price: 980,
    regularPrice: 1350,
    stock: 29,
    weight: '430g',
    images: [
      'https://cdn.shopify.com/s/files/1/0831/9103/files/H2_M_Donegal_Camp_Pant_Straight_Fit_Taupe_23851-Final-Web_8a0d0d64-8ca2-4be4-98ec-fab4f940f8b8.jpg?v=1793315605&width=900',
      'https://cdn.shopify.com/s/files/1/0831/9103/files/H2_M_Donegal_Camp_Pant_Straight_Fit_Taupe-12875-Final-Web.jpg?v=1793309752&width=900',
      'https://cdn.shopify.com/s/files/1/0831/9103/files/H2_M_Donegal_Camp_Pant_Straight_Fit_Taupe-12916-Final-Web.jpg?v=1793309752&width=900',
    ],
    shortDescription:
      'Versatile straight-fit stretch twill trousers with classic 5-pocket styling and enzyme-washed softness for office or weekend.',
    description: `Bridging the gap between crisp office chinos and everyday casual trousers, these Warm Taupe straight-fit camp pants are woven from combed cotton twill with 2% stretch recovery. Enzyme-washed for a broken-in feel from day one.

Key Highlights:
• 98% Combed Cotton Twill, 2% Elastane Stretch
• Classic straight-leg cut from hip to ankle
• Reinforced belt loops, brass YKK zipper, and deep pockets
• Waist Sizes: 28, 30, 32, 34, 36`,
    tags: ['fashion', 'chino pant', 'mens trouser', 'straight pant', 'casual pant'],
    specifications: {
      Material: '98% Cotton Twill, 2% Elastane',
      Fit: 'Classic Straight Fit',
      Closure: 'Brass Zipper + Button',
      Pockets: '2 Side Slash + 2 Button Back Pockets',
      Color: 'Warm Taupe / Khaki',
    },
    soldCount: 36,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Tarek Aziz',
        text: 'Hint of stretch makes sitting at a desk or riding a bike much easier than rigid chinos.',
        daysAgo: 5,
        helpfulCount: 6,
      },
      {
        rating: 5,
        reviewerName: 'Riyad Mahmud',
        text: 'Warm taupe tone goes equally well with a crisp white shirt or dark polo.',
        daysAgo: 13,
        helpfulCount: 4,
      },
    ],
  },
  {
    id: 'fashion-prod-009',
    slug: 'unisex-space-dye-fleece-zip-hoodie',
    name: 'Unisex Space-Dye Brushed Fleece Full-Zip Hoodie — Heather Gray',
    sku: 'TT-SDH-GRY-09',
    brand: 'Tentree',
    storeKey: 'urbanThread',
    price: 1120,
    regularPrice: 1490,
    stock: 24,
    weight: '510g',
    images: [
      'https://cdn.shopify.com/s/files/1/2341/3995/files/TCM4414_1330_SanMar_P_1.jpg?v=1793910309&width=900',
      'https://cdn.shopify.com/s/files/1/2341/3995/files/TCM4414_1330_SanMar_A_2.jpg?v=1793910307&width=900',
      'https://cdn.shopify.com/s/files/1/2341/3995/files/TCM4414_1330_SanMar_A_1.jpg?v=1793910306&width=900',
    ],
    shortDescription:
      'Plush brushed fleece full-zip hoodie with two-panel lined hood, metal zipper, ribbed cuffs, and deep kangaroo pockets.',
    description: `Engineered for cool mornings and evening travel, this space-dye fleece zip hoodie blends organic cotton and recycled polyester into a pill-resistant 300 GSM fleece interior. Features a smooth full-length zipper, flat woven hood drawstrings, and ribbed hem retention.

Key Highlights:
• 60% Organic Cotton / 40% Recycled Polyester Fleece (300 GSM)
• Double-lined drawstring hood and smooth full-length zipper
• Split front kangaroo pockets for hands & essentials
• Sizes Available: S, M, L, XL, XXL`,
    tags: ['fashion', 'hoodie', 'zip hoodie', 'winter wear', 'fleece jacket'],
    specifications: {
      Material: '60% Organic Cotton, 40% Recycled Polyester',
      'Fabric Weight': '300 GSM Brushed Fleece',
      Closure: 'Full-Length Metal Zipper',
      Pockets: 'Split Kangaroo Pockets',
      Color: 'Space-Dye Heather Gray',
    },
    soldCount: 52,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Shakil Ahmed',
        text: 'Fleece inside is super plush and warm without feeling overly bulky under a windbreaker.',
        daysAgo: 1,
        helpfulCount: 10,
      },
      {
        rating: 5,
        reviewerName: 'Nadia Islam',
        text: 'Smooth metal zipper glides without snagging and the heather gray knit hides lint well.',
        daysAgo: 6,
        helpfulCount: 6,
      },
      {
        rating: 4,
        reviewerName: 'Arman Khan',
        text: 'Ribbed cuffs stay tight at the wrists and hood keeps its shape nicely.',
        daysAgo: 11,
        helpfulCount: 4,
      },
      {
        rating: 5,
        reviewerName: 'Siam Rahman',
        text: 'Comfortable everyday zip-up for early university classes and winter evenings.',
        daysAgo: 17,
        helpfulCount: 5,
      },
      {
        rating: 5,
        reviewerName: 'Farhan Sadik',
        text: 'No pilling after several wears and washes—great everyday hoodie.',
        daysAgo: 21,
        helpfulCount: 3,
      },
      {
        rating: 5,
        reviewerName: 'Tanjim Chowdhury',
        text: 'Deep side pockets hold phone and keys safely while commuting.',
        daysAgo: 27,
        helpfulCount: 4,
      },
    ],
  },
  {
    id: 'fashion-prod-010',
    slug: 'mens-haddah-knitted-vneck-sweater-oak',
    name: "Men's Haddah Fine-Knit Cotton V-Neck Sweater — Warm Oak",
    sku: 'KT-HVS-OAK-10',
    brand: 'Kotn',
    storeKey: 'breezeCasuals',
    price: 1250,
    regularPrice: 1650,
    stock: 20,
    weight: '390g',
    images: [
      'https://cdn.shopify.com/s/files/1/0932/1356/files/MENS_HADDAH_VNECK_SWEATER_OAK_02.jpg?v=1793818326&width=900',
      'https://cdn.shopify.com/s/files/1/0932/1356/files/MENS_HADDAH_VNECK_SWEATER_OAK_03.jpg?v=1793818326&width=900',
      'https://cdn.shopify.com/s/files/1/0932/1356/files/MENS_HADDAH_VNECK_SWEATER_OAK_01.jpg?v=1793818326&width=900',
    ],
    shortDescription:
      'Refined 100% combed Egyptian cotton V-neck pullover sweater with ribbed trim—ideal for layering over collared shirts.',
    description: `Knit from breathable long-staple Egyptian cotton yarn, the Haddah V-Neck Sweater offers smooth, itch-free warmth suited for air-conditioned offices and mild winters. Ribbed V-neckline, cuffs, and waist hem maintain a sharp tailored silhouette all day.

Key Highlights:
• 100% Combed Egyptian Cotton Knit (12-Gauge Fine Weave)
• Itch-free breathable yarn suited for Bangladesh winters
• Tailored V-neck opening built for layering over shirts or tees
• Sizes Available: S, M, L, XL`,
    tags: ['fashion', 'sweater', 'mens knitwear', 'v-neck sweater', 'winter clothing'],
    specifications: {
      Material: '100% Combed Egyptian Cotton',
      Gauge: '12-Gauge Fine Knit',
      Neckline: 'Ribbed V-Neck',
      Fit: 'Classic Layering Fit',
      Color: 'Warm Oak Brown',
    },
    soldCount: 24,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Mahfuzur Rahman',
        text: '100% cotton knit has zero wool itchiness and looks refined layered over a white Oxford shirt.',
        daysAgo: 4,
        helpfulCount: 5,
      },
      {
        rating: 5,
        reviewerName: 'Sabbir Ahmed',
        text: 'Warm oak color pairs nicely with navy trousers and stays lightweight all day at the office.',
        daysAgo: 12,
        helpfulCount: 4,
      },
      {
        rating: 5,
        reviewerName: 'Imranul Haque',
        text: 'Clean ribbed cuff finish and tidy shoulder seams.',
        daysAgo: 19,
        helpfulCount: 2,
      },
    ],
  },
  {
    id: 'fashion-prod-011',
    slug: 'womens-cozy-full-zip-track-jacket-black',
    name: "Women's Cozy Full-Zip Cotton Track Jacket — Jet Black",
    sku: 'KT-WTJ-BLK-11',
    brand: 'Kotn',
    storeKey: 'breezeCasuals',
    price: 1380,
    regularPrice: 1790,
    stock: 21,
    weight: '440g',
    images: [
      'https://cdn.shopify.com/s/files/1/0932/1356/files/WOMENS_COZY_TRACK_JACKET_BLACK_02.jpg?v=1793811839&width=900',
      'https://cdn.shopify.com/s/files/1/0932/1356/files/WOMENS_COZY_TRACK_JACKET_BLACK_03.jpg?v=1793811839&width=900',
      'https://cdn.shopify.com/s/files/1/0932/1356/files/WOMENS_COZY_TRACK_JACKET_BLACK_01.jpg?v=1793811839&width=900',
    ],
    shortDescription:
      'Elevated stand-collar cotton interlock track jacket with structured piping, silver zip closure, and welt side pockets.',
    description: `Sleek, sporty, and effortlessly cozy, this Jet Black track jacket is crafted from dense double-knit cotton interlock with a brushed soft interior. Designed with a mock-neck stand collar, full front zipper, and clean side pockets for gym commutes or weekend styling.

Key Highlights:
• 100% Double-Knit Cotton Interlock
• Structured mock-neck stand collar for breeze protection
• Full-length brushed metal zipper and zippered side pockets
• Sizes Available: XS, S, M, L, XL`,
    tags: ['fashion', 'track jacket', 'womens jacket', 'activewear', 'black jacket'],
    specifications: {
      Material: '100% Double-Knit Cotton Interlock',
      Collar: 'Mock-Neck Stand Collar',
      Closure: 'Full Front Zipper',
      Pockets: '2 Side Welt Pockets',
      Color: 'Jet Black',
    },
    soldCount: 26,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Lamia Chowdhury',
        text: 'Clean jet black silhouette looks way sharper than synthetic tracksuits and breathes naturally.',
        daysAgo: 3,
        helpfulCount: 7,
      },
      {
        rating: 5,
        reviewerName: 'Jannatul Ferdous',
        text: 'Stand collar blocks chilly evening breeze and zip pockets keep earbuds safe while walking.',
        daysAgo: 10,
        helpfulCount: 5,
      },
      {
        rating: 4,
        reviewerName: 'Mehnaz Karim',
        text: 'Structured cotton interlock holds its shape nicely after washing.',
        daysAgo: 17,
        helpfulCount: 3,
      },
      {
        rating: 5,
        reviewerName: 'Nafisa Tabassum',
        text: 'Great weight for morning walks and pairs easily with cargo pants or joggers.',
        daysAgo: 24,
        helpfulCount: 4,
      },
    ],
  },
  {
    id: 'fashion-prod-012',
    slug: 'womens-riley-canvas-barn-jacket-navy',
    name: "Women's Riley Quilted-Lined Canvas Barn Jacket — Midnight Navy",
    sku: 'ML-RBJ-NVY-12',
    brand: 'Marine Layer',
    storeKey: 'vogueBazar',
    price: 1650,
    regularPrice: 2150,
    stock: 16,
    weight: '620g',
    images: [
      'https://cdn.shopify.com/s/files/1/0831/9103/files/F2_W_Riley_Barn_Jacket_Navy_RESHOOT-13898-Final-Final-Web.jpg?v=1793303828&width=900',
      'https://cdn.shopify.com/s/files/1/0831/9103/files/F2_W_Riley_Barn_Jacket_Navy_RESHOOT-13896-Final-Final-Web.jpg?v=1793303827&width=900',
      'https://cdn.shopify.com/s/files/1/0831/9103/files/F2_W_Riley_Barn_Jacket_Navy_RESHOOT-13933-Final-Final-Web.jpg?v=1793303828&width=900',
    ],
    shortDescription:
      'Classic heritage canvas barn jacket with contrast corduroy collar, brass snap storm placket, and generous front utility pockets.',
    description: `A timeless outerwear staple built for crisp autumn and winter days. The Riley Barn Jacket pairs a washed cotton canvas shell with a contrast corduroy collar, smooth quilted interior lining, and spacious dual-entry patch pockets.

Key Highlights:
• 100% Washed Cotton Canvas Shell + Smooth Quilted Lining
• Signature contrast corduroy point collar
• Hidden front zipper behind a snap storm flap
• Sizes Available: XS, S, M, L, XL`,
    tags: ['fashion', 'barn jacket', 'womens outerwear', 'winter jacket', 'navy jacket'],
    specifications: {
      OuterwearShell: '100% Washed Cotton Canvas',
      Collar: 'Contrast Corduroy Point Collar',
      Lining: 'Lightweight Quilted Poly-Cotton',
      Closure: 'Zipper + Brass Snap Storm Flap',
      Color: 'Midnight Navy',
    },
    soldCount: 19,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Tahrima Noor',
        text: 'The corduroy collar contrast against the midnight navy canvas looks effortlessly chic over knit sweaters.',
        daysAgo: 4,
        helpfulCount: 6,
      },
      {
        rating: 5,
        reviewerName: 'Sumaiya Akter',
        text: 'Roomy front pockets fit gloves and phone easily, and the quilted lining adds warmth without heaviness.',
        daysAgo: 14,
        helpfulCount: 4,
      },
    ],
  },
  {
    id: 'fashion-prod-013',
    slug: 'mens-woodford-insulated-field-jacket',
    name: "Men's Woodford Weather-Resistant Insulated Field Jacket",
    sku: 'TT-WFJ-OLV-13',
    brand: 'Tentree',
    storeKey: 'urbanThread',
    price: 1890,
    regularPrice: 2450,
    stock: 15,
    weight: '680g',
    images: [
      'https://cdn.shopify.com/s/files/1/2341/3995/files/TCM6692_5878_A_3.png?v=1793421264&width=900',
      'https://cdn.shopify.com/s/files/1/2341/3995/files/TCM6692_5878_A_2.png?v=1793421268&width=900',
      'https://cdn.shopify.com/s/files/1/2341/3995/files/TCM6692_5878_A_4.png?v=1793421268&width=900',
    ],
    shortDescription:
      'Water-repellent recycled ripstop shell field jacket with lightweight insulated baffle lining and zippered storm pockets.',
    description: `Built for brisk commutes and outdoor travel, the Woodford Field Jacket features a PFC-free water-repellent outer shell paired with lightweight recycled insulation. Designed with a structured stand collar, storm-flap zipper, and secure chest & hand pockets.

Key Highlights:
• Water-Repellent & Wind-Resistant Recycled Ripstop Shell
• Lightweight Thermal Insulation for Cold Mornings & Travel
• High stand collar, adjustable snap cuffs, and interior pocket
• Sizes Available: S, M, L, XL, XXL`,
    tags: ['fashion', 'winter jacket', 'field jacket', 'mens outerwear', 'coat'],
    specifications: {
      Material: '100% Recycled Ripstop Nylon / Polyester Fill',
      WeatherProtection: 'PFC-Free Water-Repellent Finish',
      Closure: 'Full Zip + Snap Storm Placket',
      Pockets: '2 Chest Zip Pockets + 2 Hand Pockets + Interior Pocket',
      Fit: 'Regular Outerwear Fit',
    },
    soldCount: 22,
    sampleReviews: [
      {
        rating: 5,
        reviewerName: 'Rafiqul Islam',
        text: 'Blocks wind effectively on early morning bike rides while remaining surprisingly light to pack.',
        daysAgo: 2,
        helpfulCount: 8,
      },
      {
        rating: 5,
        reviewerName: 'Nasir Uddin',
        text: 'Light drizzle beads right off the outer shell and the zippered chest pockets keep wallet dry.',
        daysAgo: 7,
        helpfulCount: 5,
      },
      {
        rating: 4,
        reviewerName: 'Hasibul Hasan',
        text: 'Adjustable cuffs seal out chilly drafts and fit comfortably over a flannel or hoodie.',
        daysAgo: 15,
        helpfulCount: 4,
      },
    ],
  },
];

export const FASHION_SAMPLE_REVIEWS_MAP = new Map<string, DemoSampleReview[]>();
export const FASHION_SAMPLE_METRICS_MAP = new Map<string, ProductMetrics>();

export const FASHION_DEMO_PRODUCTS: DemoStoreProduct[] = RAW_FASHION_PRODUCTS.map((seed, index) => {
  const store = FASHION_STORES[seed.storeKey];
  const createdAt = BASE_FASHION_CREATED_AT + index * 3600 * 1000;
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
    createdAt: BASE_FASHION_CREATED_AT + (30 - rev.daysAgo) * 86400000,
    helpfulCount: rev.helpfulCount,
    verifiedPurchase: false,
    isDelivered: false,
    isDemoSample: true,
    status: 'sample_demo',
    vendorId: store.id,
    vendorName: store.name,
  }));

  FASHION_SAMPLE_REVIEWS_MAP.set(seed.id.toLowerCase(), sampleReviewObjects);
  FASHION_SAMPLE_REVIEWS_MAP.set(seed.slug.toLowerCase(), sampleReviewObjects);

  const metricsObj: ProductMetrics = {
    soldCount: seed.soldCount,
    rating: avgRating,
    reviewsCount: reviewCount,
  };
  FASHION_SAMPLE_METRICS_MAP.set(seed.id.toLowerCase(), metricsObj);
  FASHION_SAMPLE_METRICS_MAP.set(seed.slug.toLowerCase(), metricsObj);

  return {
    id: seed.id,
    slug: seed.slug,
    name: seed.name,
    title: seed.name,
    sku: seed.sku,
    brand: seed.brand,
    category: 'Fashion',
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
    vendorId: store.id,
    storeId: store.id,
    storeName: store.name,
    vendor: {
      id: store.id,
      vendorId: store.id,
      storeId: store.id,
      name: store.name,
      storeName: store.name,
      shopName: store.name,
      shopSlug: store.slug,
      storeSlug: store.slug,
      verified: true,
      isVerified: true,
      isDemo: true,
    },
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
