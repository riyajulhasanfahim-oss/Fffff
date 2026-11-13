export interface RawNovaProductSeed {
  id: string;
  slug: string;
  name: string;
  sku: string;
  brand: string;
  category: string;
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

export const RAW_NOVA_SMART_GEAR_PRODUCTS: RawNovaProductSeed[] = [
  {
    id: 'nova-prod-001',
    slug: 'epomaker-bamboo75-gasket-wireless-mechanical-keyboard-dark-wood',
    name: 'EPOMAKER Bamboo75 75% Gasket-Mount Wireless Mechanical Keyboard (Dark Wood)',
    sku: 'EPOMAKER-Bamboo75-DS-Yun',
    brand: 'EPOMAKER',
    category: 'Computer & Gaming',
    price: 915,
    regularPrice: 999,
    stock: 22,
    weight: '1215g',
    images: [
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/Epomaker_Bamboo_75_v3_dark_wood_1.png?width=900',
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/Epomaker_Bamboo_75_v3_dark_wood_2.png?width=900',
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/Epomaker_Bamboo_75_v3_dark_wood_4.png?width=900',
    ],
    shortDescription:
      'Natural dark bamboo wood 75% tri-mode wireless mechanical keyboard with gasket structure, multi-layer sound dampening, QMK/VIA remapping, and hot-swappable sockets.',
    description: `Crafted with an authentic dark-stained natural bamboo housing, the EPOMAKER Bamboo75 blends organic desk aesthetics with modern enthusiast keyboard acoustics. Its compact 75% 84-key layout preserves dedicated function keys, navigation cluster, and full arrow keys while freeing generous desk surface for wide mouse sweeps.

Inside the CNC-machined bamboo frame, a plush gasket-mount assembly paired with five layers of Poron, IXPE, and silicone acoustic foams absorbs hollow resonance to deliver a deep, creamy keystroke sound. Enjoy tri-mode connectivity across USB-C wired, low-latency 2.4GHz wireless, and Bluetooth 5.0 with full QMK/VIA keymap customization for Windows and macOS.

Key Highlights:
• Natural Dark Bamboo Case: Hand-finished wood grain chassis with warm desk presence
• Gasket Mount & Five-Layer Sound Dampening: Cushioned typing feel with rich acoustic profile
• Tri-Mode Connectivity: 2.4GHz dongle, multi-host Bluetooth 5.0, and detachable USB-C cable
• Hot-Swappable PCB & QMK/VIA Support: Effortlessly swap 3-pin/5-pin switches and program macros`,
    tags: ['epomaker', 'bamboo75', 'mechanical keyboard', 'wireless keyboard', 'gasket mount'],
    specifications: {
      Model: 'EPOMAKER Bamboo75 (Dark Wood)',
      Layout: '75% Compact (84 Keys)',
      Case: 'Natural Dark Bamboo Wood Frame',
      Mount: 'Gasket Mount + 5-Layer Internal Dampening',
      Connectivity: '2.4GHz Wireless / Bluetooth 5.0 / USB-C Wired',
      PCB: 'Hot-Swappable (3-Pin / 5-Pin Mechanical Switches)',
      Software: 'QMK & VIA Programmable',
      Color: 'Dark Wood Walnut Finish',
    },
    soldCount: 54,
    sampleReviews: [
      { rating: 5, reviewerName: 'Farhan Tanvir', text: 'Warm dark bamboo grain looks far richer on my desk than standard black plastic slabs.', daysAgo: 2, helpfulCount: 11 },
      { rating: 5, reviewerName: 'Marufa Khatun', text: 'Factory linear switches plus the gasket layers produce a deep muted thock that never sounds hollow.', daysAgo: 4, helpfulCount: 8 },
      { rating: 5, reviewerName: 'Tanvirul Islam', text: 'Hot-swap sockets gripped my replacement tactile switches firmly with zero wobble.', daysAgo: 7, helpfulCount: 6 },
      { rating: 4, reviewerName: 'Ruhul Amin', text: 'Switching quickly between office MacBook on Bluetooth and home desktop via the 2.4GHz receiver works reliably.', daysAgo: 9, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Sanjida Parvin', text: 'VIA web configurator recognized the board instantly over USB-C for setting custom media shortcuts.', daysAgo: 12, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Mahfuzur Rahman', text: 'Hefty wooden chassis stays completely planted on the desk mat while typing rapidly.', daysAgo: 14, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Tasnimul Bari', text: 'Spacebar stabilizers arrived surprisingly well tuned right out of the packaging without ticking.', daysAgo: 17, helpfulCount: 9 },
      { rating: 5, reviewerName: 'Zakia Sultana', text: 'South-facing LEDs shine softly around key edges without glaring into eyes during late coding hours.', daysAgo: 20, helpfulCount: 3 },
      { rating: 4, reviewerName: 'Nayeem Uddin', text: 'Smooth matte PBT keycap legends show zero shine after three weeks of coding and essays.', daysAgo: 22, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Rubina Akter', text: '75% footprint keeps dedicated arrow and function rows intact while giving my mouse extra breathing room.', daysAgo: 25, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Iftekhar Chowdhury', text: 'Built-in 2.4GHz dongle slot underneath saves the receiver cleanly whenever tossing the keyboard in a sleeve.', daysAgo: 27, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Khadija Begum', text: 'Subtle wood polish complements leather desk pads nicely for a clean minimalist setup.', daysAgo: 29, helpfulCount: 3 },
    ],
  },
  {
    id: 'nova-prod-002',
    slug: 'redragon-omnipresence-gs822-wireless-gaming-soundbar-system',
    name: 'Redragon OMNIPRESENCE GS822 5.1.2-Channel Wireless Gaming Soundbar & Speaker System',
    sku: 'RED-GS822-NWBK',
    brand: 'Redragon',
    category: 'Computer & Gaming',
    price: 890,
    regularPrice: 995,
    stock: 15,
    weight: '2100g',
    images: [
      'https://cdn.shopify.com/s/files/1/0012/4957/4961/files/RedragonOMNIPRESENCEGS822.png?width=900',
      'https://cdn.shopify.com/s/files/1/0012/4957/4961/files/Redragon_GS822_Speaker_1.jpg?width=900',
      'https://cdn.shopify.com/s/files/1/0012/4957/4961/files/Redragon_GS822_Speaker_2.jpg?width=900',
    ],
    shortDescription:
      'Immersive 5.1.2-channel Dolby Atmos 400W peak wireless soundbar system with dedicated subwoofer, surround satellites, HDMI eARC, and Bluetooth 5.3.',
    description: `Transform your gaming corner or monitor wall with the Redragon OMNIPRESENCE GS822 5.1.2-Channel Surround Sound System. Built around dedicated upward-firing height drivers alongside front, center, and wireless rear satellite channels, it projects a three-dimensional acoustic dome where directional cues stay crisp and grounded.

Backed by 400W peak system output and a punchy dedicated wireless subwoofer, action scenes, race engines, and cinematic scores carry deep low-end authority without muddying dialogue. Seamlessly hook up monitors, consoles, or smart displays through HDMI eARC, Optical, or wireless Bluetooth 5.3.

Key Highlights:
• True 5.1.2-Channel Spatial Audio: Height drivers + front center bar + rear surround channels
• 400W Peak Output + Wireless Subwoofer: Deep room-filling bass with zero extra subwoofer signal wire
• Multi-Source Inputs: Supports HDMI eARC, Bluetooth 5.3, Optical, and AUX connections
• Dedicated EQ Presets: Switch effortlessly between Game, Movie, and Music sound tuning`,
    tags: ['redragon', 'gs822', 'gaming soundbar', 'surround speaker', 'dolby atmos'],
    specifications: {
      Model: 'Redragon OMNIPRESENCE GS822',
      Channels: '5.1.2-Channel Surround + Height Drivers',
      'Peak Power': '400W Peak Output',
      Subwoofer: 'Dedicated Wireless Subwoofer',
      Connectivity: 'HDMI eARC / Bluetooth 5.3 / Optical / AUX',
      Modes: 'Game / Movie / Music Audio Presets',
      Placement: 'Desktop Monitor Stand or Wall-Mountable',
      Color: 'Matte Black',
    },
    soldCount: 23,
    sampleReviews: [
      { rating: 5, reviewerName: 'Shadman Sakib', text: 'Spatial footsteps and overhead helicopter cues feel dramatically wider than ordinary two-piece PC speakers.', daysAgo: 4, helpfulCount: 9 },
      { rating: 5, reviewerName: 'Nishat Anjum', text: 'Wireless subwoofer pairs automatically at startup and adds real rumble under my desk during racing sims.', daysAgo: 11, helpfulCount: 6 },
      { rating: 4, reviewerName: 'Jamilur Rahman', text: 'HDMI eARC passes audio cleanly from my monitor switcher while keeping Bluetooth 5.3 free for phone playlists.', daysAgo: 18, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Sumon Chakraborty', text: 'Center dialogue channel keeps voice lines clear even during loud boss battles.', daysAgo: 25, helpfulCount: 5 },
    ],
  },
  {
    id: 'nova-prod-003',
    slug: 'fifine-ampligame-d6-pro-15-key-lcd-stream-controller-deck',
    name: 'FIFINE AmpliGame D6 Pro 15-Key LCD Stream Controller Macro Deck',
    sku: 'FD2415D6pro-new',
    brand: 'FIFINE',
    category: 'Computer & Gaming',
    price: 865,
    regularPrice: 985,
    stock: 19,
    weight: '600g',
    images: [
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-ampligame-D6-stream-controller-black-front-view.png?width=900',
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-ampligame-D6-stream-controller-black-left-side-view.png?width=900',
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-ampligame-D6-stream-controller-black-right-side-view.png?width=900',
    ],
    shortDescription:
      'Customizable 15-key visual LCD control deck with RGB ambient base lighting, detachable angled desktop stand, and multi-app OBS/Premiere/Discord macro integration.',
    description: `Streamline streaming, video editing, and daily desktop multitasking with the FIFINE AmpliGame D6 Pro 15-Key LCD Stream Controller. Each tactile translucent button houses an individual programmable LCD mini-display so custom icons, scene labels, and live status indicators appear crisp right beneath your fingertips.

Trigger OBS scene transitions, mute microphone channels, launch complex editing macros, switch audio profiles, or control Spotify playback with a single press. An ergonomic tilted stand keeps viewing angles comfortable while subtle perimeter RGB underglow accents blend into any streaming rig.

Key Highlights:
• 15 Customizable LCD Macro Keys: Upload custom icons, folders, and multi-step macro chains
• Seamless App Control: Ready-made plugins for OBS Studio, Twitch, YouTube, Discord & Spotify
• Detachable Non-Slip Tilt Base: Angled desktop footprint keeps labels legible at a glance
• Plug-and-Play USB-C Interface: Works smoothly on Windows 10/11 and macOS via companion software`,
    tags: ['fifine', 'd6 pro', 'stream controller', 'macro deck', 'streaming gear'],
    specifications: {
      Model: 'FIFINE AmpliGame D6 Pro',
      Keys: '15 Programmable LCD Display Macro Keys',
      Lighting: 'Adjustable Ambient Base RGB',
      Stand: 'Detachable Non-Slip Angled Desk Base',
      Interface: 'USB-C to USB-A Detachable Cable',
      Compatibility: 'Windows 10/11 & macOS',
      'Supported Apps': 'OBS Studio, Discord, Twitch, Spotify & Custom Hotkeys',
      Color: 'Matte Black',
    },
    soldCount: 38,
    sampleReviews: [
      { rating: 5, reviewerName: 'Zayedul Karim', text: 'Bright individual key displays stay readable from an arm’s length away during live OBS streams.', daysAgo: 3, helpfulCount: 8 },
      { rating: 5, reviewerName: 'Tania Sultana', text: 'Loaded custom Premiere Pro timeline shortcuts on folder page two and cut my editing time noticeably.', daysAgo: 7, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Imtiaz Hossain', text: 'Tactile keypress feel has enough travel that you never accidentally fire two macros side by side.', daysAgo: 12, helpfulCount: 5 },
      { rating: 4, reviewerName: 'Nusrat Jahan', text: 'Non-slip rubber feet hold the tilted base firmly in place when punching scene changes rapidly.', daysAgo: 16, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Hasibul Alam', text: 'Dragging icon packs and switching app profiles automatically when focusing Discord or Photoshop works reliably.', daysAgo: 20, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Saima Chowdhury', text: 'Subtle perimeter RGB glow adds neat color accents without blowing out webcam exposure.', daysAgo: 24, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Badrul Hasan', text: 'One button muting Discord and dimming desk lamps together makes starting recordings effortless.', daysAgo: 28, helpfulCount: 4 },
    ],
  },
  {
    id: 'nova-prod-004',
    slug: 'eksa-e1000-wt-24ghz-wireless-gaming-headset-enc',
    name: 'EKSA E1000 WT True 2.4GHz Wireless Gaming Headset with ENC Microphone',
    sku: 'E1000 WT-Black',
    brand: 'EKSA',
    category: 'Computer & Gaming',
    price: 835,
    regularPrice: 975,
    stock: 26,
    weight: '320g',
    images: [
      'https://cdn.shopify.com/s/files/1/0287/1138/7195/files/E1000WT_405cfcec-7a04-45e4-a799-3351cc196726.jpg?width=900',
      'https://cdn.shopify.com/s/files/1/0287/1138/7195/files/E1000WT.png?width=900',
      'https://cdn.shopify.com/s/files/1/0287/1138/7195/files/E1000WT_headset_with_ENC_microphone_2.jpg?width=900',
    ],
    shortDescription:
      'Ultra-low latency (<30ms) 2.4GHz wireless gaming headset with 7.1 virtual surround sound, 50mm magnetic drivers, AI ENC boom microphone, and 36-hour battery.',
    description: `Cut the cord without sacrificing millisecond reaction times using the EKSA E1000 WT 2.4GHz Wireless Gaming Headset. Equipped with a dedicated 2.4GHz wireless USB transceiver achieving under 30ms ultra-low latency, directional in-game gunfire and footsteps sync seamlessly with on-screen action across PC, PS5, PS4, and Switch.

Custom 50mm high-precision drivers paired with driver-powered 7.1 surround sound widen battlefield imaging, while Environmental Noise Cancellation (ENC) on the rotating boom mic suppresses keyboard clatter and room fans during Discord team comms. Memory protein ear cushions keep clamp pressure gentle across marathon ranked nights.

Key Highlights:
• True 2.4GHz Lossless Wireless (<30ms Latency) + Optional 3.5mm Wired Console Mode
• 50mm Neodymium Drivers + 7.1 Virtual Surround Sound Spatial Positioning
• AI ENC Rotating Boom Microphone + One-Tap On-Ear Mute Toggle
• Up to 36 Hours Continuous Playtime (RGB Off) via USB-C Recharge`,
    tags: ['eksa', 'e1000 wt', 'wireless gaming headset', 'enc mic', '2.4ghz headset'],
    specifications: {
      Model: 'EKSA E1000 WT',
      Wireless: '2.4GHz Low-Latency USB Dongle (<30ms) + 3.5mm Wired',
      Drivers: '50mm Dynamic Audio Drivers',
      Surround: '7.1 Virtual Surround Sound (USB Mode)',
      Microphone: 'Unidirectional Boom Mic with Environmental Noise Cancellation',
      'Battery Life': 'Up to 36 Hours (Lighting Off)',
      'Ear Cushions': 'Soft Protein Leather Memory Foam',
      Compatibility: 'PC, Mac, PS5, PS4, Nintendo Switch & Mobile (via 3.5mm)',
    },
    soldCount: 46,
    sampleReviews: [
      { rating: 5, reviewerName: 'Kazi Mushfiq', text: 'Zero noticeable audio lag over the 2.4GHz USB dongle—gunshot cues line up tightly in tactical shooters.', daysAgo: 2, helpfulCount: 9 },
      { rating: 5, reviewerName: 'Sadiya Afrin', text: 'ENC boom microphone blocks out my mechanical keyboard clack well while keeping voice chat sharp.', daysAgo: 6, helpfulCount: 7 },
      { rating: 4, reviewerName: 'Toufik Hasan', text: 'Plush over-ear pads seal cleanly around ears without clamping awkwardly on eyeglasses.', daysAgo: 10, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Arman Hossain', text: 'Quick hardware mute button behind the left earcup is super easy to find blindly mid-match.', daysAgo: 13, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Priti Mondal', text: 'Included 3.5mm cable saved me on console evenings whenever I forgot to plug in overnight.', daysAgo: 17, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Rafatullah Khan', text: '50mm drivers punch hard on explosions while maintaining decent clarity for acoustic tracks.', daysAgo: 21, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Zerin Tabassum', text: 'Turning the RGB ring off stretches battery life easily past a full week of evening gaming.', daysAgo: 25, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Nabil Mahmud', text: 'Lightweight headband frame prevents soreness at the top of the skull even on four-hour co-op nights.', daysAgo: 29, helpfulCount: 4 },
    ],
  },
  {
    id: 'nova-prod-005',
    slug: 'satechi-onthego-foldable-aluminum-tablet-stand-usb-c-hub',
    name: 'Satechi OntheGo Foldable Aluminum Tablet Stand & USB-C Hub',
    sku: 'ST-GOTGFC',
    brand: 'Satechi',
    category: 'Computer & Gaming',
    price: 810,
    regularPrice: 960,
    stock: 20,
    weight: '240g',
    images: [
      'https://cdn.shopify.com/s/files/1/1520/4366/files/FoldableStandHubOctopus3000x30001.png?width=900',
      'https://cdn.shopify.com/s/files/1/1520/4366/files/FoldableStandHubOctopus3000x300010.png?width=900',
      'https://cdn.shopify.com/s/files/1/1520/4366/files/FoldableStandHubOctopus3000x300011.png?width=900',
    ],
    shortDescription:
      'Dual-purpose CNC aluminum fold-flat tablet & iPad elevation stand with an integrated multi-port USB-C dock (4K HDMI, USB-A, SD/microSD, and audio jack).',
    description: `Turn an iPad Pro, iPad Air, or USB-C tablet into a full travel workstation with the Satechi OntheGo Foldable Stand Hub. Combining a precision-hinged solid aluminum stand with a full-featured docking station hidden neatly into its compact base, it lets you elevate your display comfortably while connecting external monitors, flash storage, and wired headphones.

Dual articulating hinges lock firmly at ergonomic drawing or typing angles and fold completely flat with the braided USB-C host cable tucked cleanly underneath the base. Silicone contact pads protect your tablet frame from scratches while gripping café or library tables securely.

Key Highlights:
• Fold-Flat CNC Aluminum Stand + Built-In Multi-Port Dock in One Compact Unit
• Crisp 4K HDMI External Display Output + USB-C PD Charging Input
• Built-In SD / microSD Card Slots, USB-A Data Port & 3.5mm Headphone Jack
• Underside Cable Storage Groove keeps the host USB-C cord snag-free inside bags`,
    tags: ['satechi', 'ipad stand hub', 'foldable stand', 'tablet dock', 'onthego'],
    specifications: {
      Model: 'Satechi OntheGo Foldable Stand Hub (ST-GOTGFC)',
      Material: 'Anodized Aluminum + Silicone Grip Pads',
      'Video Output': 'HDMI 4K UHD',
      'Data & Media': 'USB-A Data Port, SD & microSD Slots, 3.5mm Audio Jack',
      'Power Delivery': 'USB-C PD Pass-Through Port',
      Compatibility: 'iPad Pro / iPad Air / iPad mini (USB-C) & USB-C Tablets',
      Design: 'Fold-Flat Dual Hinge with Integrated Cable Channel',
      Color: 'Space Gray',
    },
    soldCount: 62,
    sampleReviews: [
      { rating: 5, reviewerName: 'Shabnam Yasmin', text: 'Folds completely flat into my tablet sleeve while hiding the host USB-C cord right inside the underside slot.', daysAgo: 1, helpfulCount: 10 },
      { rating: 5, reviewerName: 'Tahmidul Haque', text: 'Dual metal hinges hold firm when sketching with a stylus instead of bouncing like flimsy wire stands.', daysAgo: 3, helpfulCount: 8 },
      { rating: 5, reviewerName: 'Munira Islam', text: 'Plugging my DSLR SD card straight into the base while mirroring to a monitor makes café photo edits effortless.', daysAgo: 5, helpfulCount: 7 },
      { rating: 4, reviewerName: 'Saiful Alam', text: 'Soft silicone rest cushions my iPad frame gently without scuffing the anodized aluminum sides.', daysAgo: 8, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Nashita Karim', text: 'Built-in 3.5mm jack on the side of the base solves monitoring wired headphones during iPad video cuts.', daysAgo: 10, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Rohanur Rashid', text: 'Space gray aluminum finish matches Apple tablet hardware closely and feels solid on the desk.', daysAgo: 12, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Farhana Rahman', text: 'Clean travel solution—carries a sturdy stand and external HDMI port in one palm-sized block.', daysAgo: 14, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Mashrur Kabir', text: 'Handles both portrait reading orientation and wide landscape external monitor extensions nicely.', daysAgo: 16, helpfulCount: 3 },
      { rating: 4, reviewerName: 'Sultana Razia', text: 'Rubberized underside grips slick glass tables steadily without sliding backwards while tapping.', daysAgo: 19, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Yusuf Ahmed', text: 'USB-C pass-through keeps tablet battery full through long client presentations.', daysAgo: 21, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Afia Anjum', text: 'Hinge tension feels well balanced so opening it out on a tight airplane tray takes one smooth motion.', daysAgo: 23, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Zulfikar Ali', text: 'Reads full-size camera SD cards promptly without dropping transfers mid-import.', daysAgo: 25, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Nadia Hoque', text: 'Braided short host lead bends comfortably into place without putting awkward strain on the tablet port.', daysAgo: 27, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Rayhanul Islam', text: 'Elevating the tablet screen eases neck posture significantly during full days of remote work.', daysAgo: 28, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Mahira Chowdhury', text: 'Zero wobble even when connecting a heavy HDMI cord plus external SSD into the rear hub ports.', daysAgo: 30, helpfulCount: 6 },
    ],
  },
  {
    id: 'nova-prod-006',
    slug: 'epomaker-nex-pro-8k-wireless-ergonomic-gaming-mouse',
    name: 'EPOMAKER NEX Pro 8K Tri-Mode 65g Ergonomic Wireless Gaming Mouse (PAW3950)',
    sku: 'EPOMAKER-MOUSE-NEX-PRO-GY-8K',
    brand: 'EPOMAKER',
    category: 'Computer & Gaming',
    price: 785,
    regularPrice: 940,
    stock: 29,
    weight: '65g',
    images: [
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/EpomakerNexPRO_1__1.webp?width=900',
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/EpomakerNexPRO_2.webp?width=900',
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/EpomakerNexPRO_3.webp?width=900',
    ],
    shortDescription:
      'Flagship 65g right-handed ergonomic wireless gaming mouse featuring PixArt PAW3950 42,000 DPI optical sensor, up to 8000Hz polling rate, and tri-mode connectivity.',
    description: `Sculpted specifically for fatigue-free right-handed palm and claw grips, the EPOMAKER NEX Pro pairs a featherweight 65g unibody shell with tournament-grade tracking hardware. Its flagship PixArt PAW3950 optical sensor delivers pixel-accurate precision up to 42,000 DPI alongside native 8000Hz polling support for ultra-fluid cursor responsiveness on high-refresh monitors.

Switch seamlessly between high-speed 2.4GHz wireless, Bluetooth, and flexible paracord USB-C wired operation depending on your setup. Pure PTFE skates glide effortlessly across cloth or glass pads while crisp optical/mechanical microswitches eliminate double-click chatter.

Key Highlights:
• Flagship PixArt PAW3950 Sensor: Up to 42,000 DPI, 750 IPS tracking, and 8K polling rate support
• Ultralight 65g Ergonomic Right-Hand Contour: Full palm support without excess wrist drag
• Tri-Mode Connectivity: Dedicated 8K 2.4GHz wireless dongle, Bluetooth, and USB-C wired
• Smooth Pure PTFE Skates & Anti-Slip Side Texture for high-control flick shots`,
    tags: ['epomaker', 'nex pro', '8k gaming mouse', 'paw3950', 'wireless mouse'],
    specifications: {
      Model: 'EPOMAKER NEX Pro 8K',
      Sensor: 'PixArt PAW3950 Flagship Optical',
      DPI: 'Up to 42,000 Adjustable DPI',
      'Polling Rate': 'Up to 8000Hz (Wired / 2.4GHz 8K Receiver)',
      Weight: '65g Lightweight Shell',
      Shape: 'Ergonomic Right-Handed',
      Connectivity: '2.4GHz Wireless / Bluetooth / USB-C Wired',
      Color: 'Graphite Gray & Black',
    },
    soldCount: 71,
    sampleReviews: [
      { rating: 5, reviewerName: 'Tanjimul Hasan', text: 'Right-hand palm hump fills my grip naturally, and at 65 grams long Valorant flicks take half the wrist effort.', daysAgo: 2, helpfulCount: 11 },
      { rating: 5, reviewerName: 'Fariha Nawar', text: 'Cursor tracking at higher polling feels silky smooth on my 240Hz monitor with zero stutter.', daysAgo: 5, helpfulCount: 8 },
      { rating: 5, reviewerName: 'Ashikur Rahman', text: 'Main left and right clicks actuate crisply with virtually zero annoying pre-travel mush.', daysAgo: 8, helpfulCount: 6 },
      { rating: 4, reviewerName: 'Sabrina Sultana', text: 'Factory PTFE feet glide fast right out of the box on a standard woven cloth desk pad.', daysAgo: 12, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Mejbah Uddin', text: 'Flipping the bottom toggle switches between Bluetooth work laptop and 2.4GHz desktop in one second.', daysAgo: 15, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Nafis Iqbal', text: 'Included flexible paracord charging wire practically disappears when gaming wired.', daysAgo: 19, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Sumaiya Haque', text: 'DPI steps save directly to onboard memory so custom sensitivity persists without background bloatware.', daysAgo: 23, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Rashed Bin Karim', text: 'Matte textured shell stays grippy even after hours of warm summer gaming sessions.', daysAgo: 26, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Emon Chowdhury', text: 'Tactile scroll wheel notches are clean and distinct for consistent weapon swapping.', daysAgo: 29, helpfulCount: 4 },
    ],
  },
  {
    id: 'nova-prod-007',
    slug: 'maono-wave-t5-wireless-lavalier-microphone-system',
    name: 'Maono Wave T5 Wireless Creator Lavalier Microphone System',
    sku: 'C.01.01.001.00297',
    brand: 'Maono',
    category: 'Computer & Gaming',
    price: 755,
    regularPrice: 920,
    stock: 24,
    weight: '500g',
    images: [
      'https://cdn.shopify.com/s/files/1/0025/5934/4686/files/WaveT5WirelessMicrophone.webp?width=900',
      'https://cdn.shopify.com/s/files/1/0025/5934/4686/files/T5_Wireless_microphone_1.jpg?width=900',
      'https://cdn.shopify.com/s/files/1/0025/5934/4686/files/T5_Wireless_microphone_2.jpg?width=900',
    ],
    shortDescription:
      'Dual-channel 2.4GHz clip-on wireless lavalier microphone kit with magnetic charging case, 48kHz/24-bit studio audio capture, intelligent noise cancellation, and multi-device support.',
    description: `Capture broadcast-ready voice audio anywhere without tangled mic cords using the Maono Wave T5 Wireless Lavalier System. Engineered with 48kHz/24-bit high-resolution pickup, 80dB signal-to-noise ratio, and up to 120dB max SPL handling, tiny thumb-sized transmitters deliver rich, distortion-free vocal clarity for vlogs, interviews, tutorials, and reels.

Smart multi-level Environmental Noise Cancellation tames café murmur, AC hum, and roadside traffic at the tap of a button. With up to 9 hours per transmitter charge and up to 30 hours total via the pocket charging case—plus magnetic clip mounts and instant mobile/camera pairing—you stay ready to roll all day.

Key Highlights:
• Studio-Grade 48kHz/24-Bit Audio with 80dB SNR for clean, crisp outdoor voice capture
• One-Tap Intelligent Noise Reduction: Adjustable noise suppression via transmitter & app
• Up to 30 Hours Combined Runtime with sleek pocket-sized charging case
• Lightweight Magnetic & Clip Mounts: Attaches discreetly to collars without weighing down fabric`,
    tags: ['maono', 'wave t5', 'wireless lavalier mic', 'vlog microphone', 'creator audio'],
    specifications: {
      Model: 'Maono Wave T5',
      'Audio Resolution': '48kHz / 24-Bit Digital Audio',
      Transmission: '2.4GHz Dual-Channel Wireless (Up to 300m Line of Sight)',
      'Noise Reduction': 'Multi-Level Intelligent ENC (Maono Link App Adjustable)',
      'Battery Endurance': 'Up to 9H (Transmitters) / 30H Total with Charging Case',
      Mounting: 'Magnetic Clip + Neck Pendant / Collar Clamp',
      'Max SPL': '120dB Distortion-Free Handling',
      Color: 'Matte Charcoal Black',
    },
    soldCount: 33,
    sampleReviews: [
      { rating: 5, reviewerName: 'Tahsinul Kabir', text: 'Tiny magnetic transmitters sit cleanly on a polo shirt without pulling the collar fabric downwards.', daysAgo: 3, helpfulCount: 8 },
      { rating: 5, reviewerName: 'Humayra Zaman', text: 'Outdoor street noise drops dramatically on medium ENC while voices remain natural instead of robotic.', daysAgo: 8, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Niaz Morshed', text: 'Opening the charging case pairs both mics straight to the receiver before you even frame the shot.', daysAgo: 14, helpfulCount: 5 },
      { rating: 4, reviewerName: 'Samiha Akter', text: 'Handles loud laughs near the mic cleanly without clipping thanks to high SPL headroom.', daysAgo: 19, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Rizwanul Hoque', text: 'Shot interviews across a busy campus courtyard all afternoon and the case still held over half its charge.', daysAgo: 24, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Farzana Haque', text: 'Dead-cat windshields lock tightly onto the mic capsule when filming windy rooftop reviews.', daysAgo: 29, helpfulCount: 3 },
    ],
  },
  {
    id: 'nova-prod-008',
    slug: 'fifine-ampligame-sc3-4-channel-rgb-gaming-audio-mixer',
    name: 'FIFINE AmpliGame SC3 4-Channel RGB Gaming Audio Mixer with XLR & 48V Phantom Power',
    sku: 'ABCD2302SC3',
    brand: 'FIFINE',
    category: 'Computer & Gaming',
    price: 725,
    regularPrice: 895,
    stock: 21,
    weight: '800g',
    images: [
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-SC3-audio-mixer-black-front-view.png?width=900',
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-SC3-audio-mixer-black-right-side-view.png?width=900',
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-SC3-audio-mixer-black-left-side-view.png?width=900',
    ],
    shortDescription:
      'Plug-and-play USB desktop streaming mixer featuring XLR mic input with +48V phantom power, four independent volume faders, custom voice pads, and customizable RGB.',
    description: `Take effortless hardware control of your livestream audio levels with the FIFINE AmpliGame SC3 Gaming Audio Mixer. Combining an XLR microphone preamp (up to 50dB clean gain with switchable +48V phantom power for condenser mics) alongside dedicated 3.5mm headset, line-in, and USB PC audio mixing channels, it lets you balance mic, music, game, and voice chat on physical sliders mid-stream.

Four customizable recordable sound-effect buttons, six playful voice-changer effects, instant auto-tune, and one-touch mic mute / headphone monitoring switches keep live broadcasts interactive with zero alt-tabbing required.

Key Highlights:
• True XLR Microphone Input + Switchable +48V Phantom Power (Dynamic & Condenser Ready)
• 4 Independent Smooth Faders: Adjust Microphone, Line-In, Headphone & Line-Out independently
• 4 Recordable Custom Soundboard Pads + Voice Effects + Hardware Mic Mute
• Vibrant Multi-Mode RGB Desk Accent Strip with USB-C Plug-and-Play Compatibility`,
    tags: ['fifine', 'sc3 mixer', 'gaming audio mixer', 'xlr interface', 'stream mixer'],
    specifications: {
      Model: 'FIFINE AmpliGame SC3',
      'Mic Preamp Gain': 'Up to 50dB Clean Gain (+48V Phantom Power Toggle)',
      Inputs: 'XLR / 1/4" Mic, 3.5mm Headset Mic, Line-In, USB-C PC/Console',
      Channels: '4 Individual Volume Fader Sliders',
      'Sound Effects': '4 Custom Recordable Pads + 6 Voice Modes + Auto-Tune',
      Monitoring: '3.5mm Zero-Latency Headphone & Line-Out Jacks',
      Lighting: 'Controllable Static & Dynamic RGB Strips',
      Color: 'Matte Black',
    },
    soldCount: 59,
    sampleReviews: [
      { rating: 5, reviewerName: 'Zobayer Hossain', text: 'Having four physical volume sliders means turning down background Spotify music takes one finger nudge.', daysAgo: 1, helpfulCount: 10 },
      { rating: 5, reviewerName: 'Tasmia Rahman', text: 'Built-in +48V phantom power switch runs my studio condenser cleanly over XLR with plenty of headroom.', daysAgo: 3, helpfulCount: 8 },
      { rating: 5, reviewerName: 'Mahmudul Bari', text: 'Individual mute buttons below every channel track prevent embarrassing hot-mic moments on Discord.', daysAgo: 5, helpfulCount: 7 },
      { rating: 4, reviewerName: 'Nusrat Kabir', text: 'Plug-and-play USB-C setup showed up instantly in Windows and OBS with zero extra drivers needed.', daysAgo: 7, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Shariar Alam', text: 'Recorded quick applause and transition jingles onto the four A/B/C/D sound pads for live co-op streams.', daysAgo: 10, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Rubaiya Sultana', text: 'Zero-latency headphone monitoring toggle makes hearing my own voice cadence comfortable during long podcasts.', daysAgo: 12, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Kamran Ahmed', text: 'Separate line-in jack lets my console audio feed cleanly into the PC stream mix.', daysAgo: 15, helpfulCount: 5 },
      { rating: 4, reviewerName: 'Nafisa Chowdhury', text: 'Smooth fader travel glides nicely without scratching or sudden volume jumps.', daysAgo: 17, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Salman Farshi', text: 'Front XLR/3.5mm indicator LEDs clearly display whether phantom power and monitoring are active.', daysAgo: 19, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Tabassum Noor', text: 'Compact angled desk footprint fits right under my monitor bezel without blocking keyboard room.', daysAgo: 21, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Rafiqul Hoque', text: 'Voice changer and pitch presets added fun comedic moments with friends on stream.', daysAgo: 24, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Tasnimul Islam', text: 'Pushes dynamic mics clearly at roughly 65% gain without noticeable hiss.', daysAgo: 26, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Ananya Roy', text: 'RGB base lighting matches dual-monitor gaming themes cleanly or switches right off when filming serious talks.', daysAgo: 28, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Faruk Azam', text: 'Sturdy rubber pads underneath hold the mixer steady when pressing the sound effect triggers.', daysAgo: 30, helpfulCount: 3 },
    ],
  },
  {
    id: 'nova-prod-009',
    slug: 'fifine-ampligame-am8-dual-usb-xlr-dynamic-microphone',
    name: 'FIFINE AmpliGame AM8 Dual USB/XLR Dynamic Streaming Microphone (Black)',
    sku: 'AM8',
    brand: 'FIFINE',
    category: 'Computer & Gaming',
    price: 695,
    regularPrice: 870,
    stock: 32,
    weight: '1100g',
    images: [
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-ampligame-AM8-dynamic-microphone-black-front.png?width=900',
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-ampligame-AM8-microphone-xlr-connection.jpg?width=900',
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-ampligame-AM8-dynamic-microphone-rgb-lighting.jpg?width=900',
    ],
    shortDescription:
      'Cardioid dynamic podcast and streaming microphone featuring simultaneous USB-C and balanced XLR outputs, touch tap-to-mute, real-time monitoring, and flocked windscreen.',
    description: `Engineered for untreated bedrooms, gaming desks, and home podcast setups, the FIFINE AmpliGame AM8 Dynamic Microphone focuses sharply on your voice while naturally rejecting room echo, PC fans, and keyboard noise. Its 50Hz–16kHz dynamic capsule delivers warm, broadcast-style vocal presence right out of the box.

Start easily over USB-C (unlocking tap-to-mute touch control, onboard mic gain dial, 3.5mm direct headphone volume knob, and customizable bottom RGB ring) or step straight up to balanced XLR audio interfaces whenever you upgrade your studio chain. Comes complete with removable flocked foam windscreen and sturdy weighted metal base.

Key Highlights:
• Dual USB-C & XLR Outputs: Effortless plug-and-play USB today + pro XLR upgrade path
• Tight Cardioid Dynamic Capsule (50Hz–16kHz): Rejects off-axis room noise naturally
• On-Mic Gain Dial, Headphone Monitor Jack & Silent Capacitive Tap-to-Mute Sensor
• Dual-Thread 3/8" & 5/8" Mount Fits Boom Arms Directly (Desktop Metal Stand Included)`,
    tags: ['fifine', 'am8 microphone', 'dynamic mic', 'usb xlr microphone', 'podcast mic'],
    specifications: {
      Model: 'FIFINE AmpliGame AM8',
      'Capsule Type': 'Cardioid Dynamic Capsule',
      Outputs: 'USB Type-C + Balanced 3-Pin XLR',
      'Frequency Response': '50Hz – 16kHz',
      Controls: 'Tap-to-Mute, Mic Gain Knob, Headphone Monitor Dial, RGB Touch Key',
      Monitoring: '3.5mm Headphone Output (USB Mode)',
      'Thread Size': '3/8" and 5/8" Universal Boom Arm Threads',
      Color: 'Matte Black',
    },
    soldCount: 84,
    sampleReviews: [
      { rating: 5, reviewerName: 'Tamim Chowdhury', text: 'Dynamic cardioid pickup completely ignores my ceiling fan and mechanical switches six inches behind the mic.', daysAgo: 1, helpfulCount: 13 },
      { rating: 5, reviewerName: 'Nadia Sultana', text: 'Warm vocal tone sounds broadcast-ready over USB-C without wrestling complicated EQ plugins.', daysAgo: 2, helpfulCount: 10 },
      { rating: 5, reviewerName: 'Sajibur Rahman', text: 'Upgraded later to an XLR audio interface and the AM8 kept working flawlessly over balanced XLR.', daysAgo: 4, helpfulCount: 9 },
      { rating: 5, reviewerName: 'Meherun Nesa', text: 'Capacitive tap-to-mute button responds instantly with zero mechanical click audible on recordings.', daysAgo: 6, helpfulCount: 8 },
      { rating: 4, reviewerName: 'Sakibul Hasan', text: 'Included flocked foam windscreen tames sharp P and B plosives cleanly up close.', daysAgo: 8, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Arpita Das', text: 'Threaded straight onto my low-profile boom arm thanks to both 3/8 and 5/8 inch internal mounting.', daysAgo: 10, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Minhazur Rahman', text: 'Heavy weighted desktop base included in the box keeps the mic steady before mounting it on an arm.', daysAgo: 12, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Tasfia Alam', text: 'Direct 3.5mm headphone jack lets me monitor voice volume smoothly with its own dedicated wheel.', daysAgo: 14, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Zayed Khan', text: 'Bottom RGB ring cycles through subtle colors or holds a solid cyan tone to match my desk setup.', daysAgo: 16, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Fariha Yasmin', text: 'Red dot mute indicator glow is bright enough to prevent talking while muted on live meetings.', daysAgo: 18, helpfulCount: 7 },
      { rating: 4, reviewerName: 'Imranuzzaman Mia', text: 'Matte metal yoke holds tilt angles securely without drooping over hours of commentary.', daysAgo: 20, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Laboni Akter', text: 'Crystal clarity for voiceovers and client Zoom calls right on the USB-C desk cable.', daysAgo: 22, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Rashidul Alam', text: 'Zero noticeable electronic self-noise when speaking 3 to 5 inches away from the grille.', daysAgo: 24, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Suhana Parvin', text: 'Clean rear cable routing points USB and XLR sockets straight out the back so wires stay hidden.', daysAgo: 26, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Kowshik Ahmed', text: 'Unbeatable dual-mode versatility when teaching online from home and podcasting on weekends.', daysAgo: 28, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Nafiza Rahman', text: 'Solid matte finish does not show fingerprints when swinging the mic around the desk.', daysAgo: 30, helpfulCount: 4 },
    ],
  },
  {
    id: 'nova-prod-010',
    slug: 'maono-ps22-lite-usb-studio-audio-interface',
    name: 'Maono PS22 Lite 24-Bit/192kHz USB Studio Audio Interface with Loopback',
    sku: 'C.01.01.003.00174',
    brand: 'Maono',
    category: 'Computer & Gaming',
    price: 660,
    regularPrice: 840,
    stock: 17,
    weight: '510g',
    images: [
      'https://cdn.shopify.com/s/files/1/0025/5934/4686/files/maono_ps22_lite_e674e769-04c3-4d15-8765-9058b2b64581.webp?width=900',
      'https://cdn.shopify.com/s/files/1/0025/5934/4686/files/maonops22liteaudiointerface-1000x1000_2.webp?width=900',
      'https://cdn.shopify.com/s/files/1/0025/5934/4686/files/maonops22liteaudiointerface-1000x1000_3.webp?width=900',
    ],
    shortDescription:
      'Compact 2-in/2-out USB-C recording interface with 24-bit/192kHz studio converters, 56dB clean XLR mic preamp, Hi-Z instrument input, and virtual loopback channels.',
    description: `Record studio-grade vocals, acoustic guitars, and livestreams straight onto your laptop or DAW with the Maono PS22 Lite Audio Interface. Armed with 24-bit/192kHz high-resolution digital converters and an ultra-clean 56dB XLR preamp with switchable +48V phantom power, it drives both sensitive condensers and gain-hungry dynamic mics cleanly.

Dedicated Hi-Z high-impedance instrument jack captures punchy electric guitar and bass tracks without clipping, while dual virtual loopback routing through Maono ProStudio software blends computer playback smoothly into broadcasts or podcasts.

Key Highlights:
• Studio-Resolution 24-Bit/192kHz Converters + Up to 56dB Clean XLR Gain
• XLR Combo Input (+48V Phantom Power) + Dedicated Hi-Z 1/4" Guitar/Bass Input
• Dual Virtual Loopback + Direct Zero-Latency Hardware Monitoring Switch
• Halo LED Clip & Signal Rings for fast visual gain staging while recording`,
    tags: ['maono', 'ps22 lite', 'audio interface', '192khz dac', 'recording studio'],
    specifications: {
      Model: 'Maono PS22 Lite',
      'Sample Rate': 'Up to 24-Bit / 192kHz',
      'Mic Preamp Gain': '56dB Dynamic Range (+48V Phantom Power)',
      Inputs: '1x XLR Mic Combo + 1x 1/4" Hi-Z Instrument Input',
      Outputs: 'Balanced TRS L/R Monitor Out + 1/4" Headphone Jack',
      Routing: '2-Channel Virtual Loopback + Direct Monitor Toggle',
      Host: 'USB-C Bus Powered (Windows / macOS / iPadOS)',
      Color: 'Space Black',
    },
    soldCount: 27,
    sampleReviews: [
      { rating: 5, reviewerName: 'Arefin Islam', text: 'Super clean noise floor at 56dB gain—recorded acoustic guitar and studio condenser vocals effortlessly in Reaper.', daysAgo: 5, helpfulCount: 8 },
      { rating: 5, reviewerName: 'Tania Chowdhury', text: 'Bright gain halo rings flip smoothly from green to amber so you can set peak headroom in seconds.', daysAgo: 13, helpfulCount: 6 },
      { rating: 4, reviewerName: 'Shahriar Kabir', text: 'Built-in loopback routing pulls backing tracks straight into OBS without needing extra third-party virtual cables.', daysAgo: 22, helpfulCount: 5 },
    ],
  },
  {
    id: 'nova-prod-011',
    slug: 'fifine-k438-4k-ultra-hd-auto-focus-usb-webcam',
    name: 'FIFINE K438 4K Ultra HD Auto Focus USB Streaming Webcam with Privacy Cover',
    sku: 'PDK438019',
    brand: 'FIFINE',
    category: 'Computer & Gaming',
    price: 635,
    regularPrice: 815,
    stock: 25,
    weight: '600g',
    images: [
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-K438-4K-webcam.png?width=900',
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-K438-4K-usb-webcam-001.jpg?width=900',
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-K438-4K-usb-webcam-002.jpg?width=900',
    ],
    shortDescription:
      'True 4K UHD USB webcam with swift PDAF autofocus, adjustable viewing angle clip, dual noise-reducing microphones, and physical sliding lens privacy shutter.',
    description: `Look razor sharp on Zoom briefings, online classes, and Twitch streams with the FIFINE K438 4K Ultra HD USB Webcam. Featuring a high-clarity optical glass lens that captures crisp 4K detail paired with rapid autofocus, the camera locks quickly onto faces or product demos held up to the lens without hunting.

Automatic low-light exposure correction brightens dimly lit home offices while an integrated noise-canceling dual mic array picks up clear speech cleanly up to 3 meters. A built-in sliding privacy shutter protects the glass lens and guarantees complete camera privacy between calls, and the universal monitor clip + 1/4" tripod thread mount cleanly anywhere.

Key Highlights:
• 4K Ultra HD Clarity + Smooth 1080p60 High-Frame-Rate Support
• Fast & Accurate Auto Focus: Transitions cleanly between close-up product shots and speaker framing
• Integrated Sliding Lens Privacy Cover + Dual Noise-Canceling Microphones
• 360° Swivel Monitor Mount + Standard 1/4" Tripod Thread for desk stands`,
    tags: ['fifine', 'k438', '4k webcam', 'autofocus webcam', 'streaming camera'],
    specifications: {
      Model: 'FIFINE K438',
      Resolution: '4K Ultra HD (3840 × 2160) / 1080p',
      Focus: 'Fast Auto Focus Lens',
      Privacy: 'Built-In Physical Sliding Privacy Shutter',
      Audio: 'Integrated Noise-Reducing Microphone',
      Mount: 'Adjustable Monitor Clamp + 1/4" Tripod Thread (360° Swivel)',
      Interface: 'Plug-and-Play USB-A (Windows / macOS / Linux)',
      Color: 'Matte Black',
    },
    soldCount: 41,
    sampleReviews: [
      { rating: 5, reviewerName: 'Ishfaqur Rahman', text: 'Autofocus snaps cleanly onto small electronics boards when holding samples close to the lens for tutorials.', daysAgo: 3, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Farhana Akter', text: 'Built-in physical lens slider gives instant privacy after meetings end without dangling plastic flaps.', daysAgo: 9, helpfulCount: 6 },
      { rating: 4, reviewerName: 'Mustafizur Rahman', text: 'Skin tones stay natural under mixed bedroom LED lighting without looking overly orange.', daysAgo: 15, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Sumaya Tabassum', text: 'Plugged straight into OBS on Windows 11 and pulled crisp 4K video with zero software setup.', daysAgo: 21, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Rezaul Haque', text: 'Sturdy rubberized clip sits securely atop an ultra-thin bezel monitor and also threads onto a small desktop tripod.', daysAgo: 27, helpfulCount: 3 },
    ],
  },
  {
    id: 'nova-prod-012',
    slug: 'fifine-bm88-low-profile-metal-microphone-boom-arm',
    name: 'FIFINE BM88 Low-Profile All-Metal Microphone Boom Arm Stand (Black)',
    sku: 'FF-BM88-BLK',
    brand: 'FIFINE',
    category: 'Computer & Gaming',
    price: 590,
    regularPrice: 780,
    stock: 28,
    weight: '1000g',
    images: [
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/FIFINE-BM88-microphone-boom-arm-low_profile-adjustment-black-04.png?width=900',
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/C-clamp_Size_of_FIFINE_BM88_Low_Profile_Microphone_Arm_Stand.jpg?width=900',
      'https://cdn.shopify.com/s/files/1/0064/7557/9457/files/Cable_Channel_Management_of_FIFINE_BM88_Low_Profile_Microphone_Arm_Stand.jpg?width=900',
    ],
    shortDescription:
      'Heavy-duty steel low-profile boom arm engineered to tuck cleanly underneath monitors, featuring hidden cable channels, 360° horizontal swing, and universal 1/4"-3/8"-5/8" threads.',
    description: `Keep your webcam framing wide open and monitors unobstructed with the FIFINE BM88 Low-Profile Microphone Boom Arm. Unlike tall scissor stands that cross diagonally in front of your face, the BM88 routes smoothly underneath your monitor bezel—putting heavy dynamic or condenser microphones right at optimal speaking range and swinging neatly aside when off-call.

Precision cast-metal joints support microphones up to 1.5kg (3.3 lbs) cleanly without spring squeak, while full-length magnetic/snap-top cable channels hide USB and XLR leads seamlessly out of sight. Includes sturdy padded desk C-clamp plus universal 1/4", 3/8", and 5/8" thread adapters.

Key Highlights:
• Low-Profile Under-Monitor Geometry: Never blocks monitors or on-camera sightlines
• All-Metal Steel Construction: Supports up to 1.5kg heavy broadcast mics silently
• Built-In Concealed Cable Channels: Hides USB-C & XLR cords cleanly along the arm spine
• Complete Adapter Kit: Includes 1/4", 3/8", and 5/8" adapters + cushioned heavy-duty C-clamp`,
    tags: ['fifine', 'bm88', 'low profile boom arm', 'mic arm', 'streaming desk arm'],
    specifications: {
      Model: 'FIFINE BM88 Low Profile',
      Material: 'All-Metal Aluminum / Steel Frame',
      'Load Capacity': 'Up to 1.5 kg (3.3 lbs)',
      Rotation: '360° Full Horizontal Rotation',
      'Cable Routing': 'Integrated Enclosed Top Cable Channels',
      'Clamp Range': 'Desk Thickness up to 2.1 inches (Padded C-Clamp)',
      Adapters: '1/4", 3/8", and 5/8" Universal Screw Threads Included',
      Color: 'Matte Black',
    },
    soldCount: 52,
    sampleReviews: [
      { rating: 5, reviewerName: 'Ariful Islam', text: 'Glides cleanly beneath my dual monitors so the mic stays completely out of my webcam view until needed.', daysAgo: 2, helpfulCount: 9 },
      { rating: 5, reviewerName: 'Tashfia Chowdhury', text: 'Built-in channel covers swallow thick braided XLR cords cleanly with zero zip ties.', daysAgo: 5, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Sajib Ahmed', text: 'Holds heavy dynamic broadcast microphones firmly at full extension without sagging downward.', daysAgo: 8, helpfulCount: 6 },
      { rating: 4, reviewerName: 'Nusrat Alam', text: 'Thick cushioned desk C-clamp grips solid wood tables tightly without denting the underside.', daysAgo: 11, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Zahirul Haque', text: 'Tightening the included Allen key tension joints eliminated every bit of squeak during repositioning.', daysAgo: 14, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Pabel Mia', text: 'Comes with 1/4, 3/8, and 5/8 adapters in the box so mounting shock mounts or webcams worked immediately.', daysAgo: 17, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Mahbuba Khan', text: 'Swings smoothly behind the keyboard tray when wrapping up podcasts to reclaim full writing space.', daysAgo: 20, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Tanvir Ahmed', text: 'Solid steel square tubing looks super clean and industrial next to dark mechanical keyboards.', daysAgo: 23, helpfulCount: 3 },
      { rating: 4, reviewerName: 'Farzana Parvin', text: 'Ball-head tip tilts cleanly to angle end-address microphones upward toward mouth level.', daysAgo: 26, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Morshed Alam', text: 'Silent friction hinges stay dead quiet while adjusting mic height mid-recording.', daysAgo: 28, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Ruhana Karim', text: 'Huge ergonomics upgrade over short desktop tripods that pick up every table bump.', daysAgo: 30, helpfulCount: 5 },
    ],
  },
  {
    id: 'nova-prod-013',
    slug: 'redragon-gmk914-gas-spring-single-monitor-desk-mount',
    name: 'Redragon GMK914 Gas-Spring Single Monitor Desk Mount Stand (13"–32" VESA)',
    sku: 'RED-GMK914-BK',
    brand: 'Redragon',
    category: 'Computer & Gaming',
    price: 565,
    regularPrice: 745,
    stock: 23,
    weight: '2700g',
    images: [
      'https://cdn.shopify.com/s/files/1/0012/4957/4961/files/RedragonGMK914SingleMonitorMountStand_1.png?width=900',
      'https://cdn.shopify.com/s/files/1/0012/4957/4961/files/RedragonGMK914SingleMonitorMountStand_6.jpg?width=900',
      'https://cdn.shopify.com/s/files/1/0012/4957/4961/files/RedragonGMK914SingleMonitorMountStand_7.jpg?width=900',
    ],
    shortDescription:
      'Counterbalanced gas-spring monitor arm supporting 13" to 32" displays (VESA 75×75 & 100×100mm) with +90°/-45° tilt, 360° portrait rotation, and C-clamp/grommet bases.',
    description: `Reclaim valuable desk space beneath your display with the Redragon GMK914 Gas-Spring Single Monitor Desk Mount. Designed around a heavy-duty counterbalanced gas strut, it floats 13-inch to 32-inch monitors (4.4 to 17.6 lbs) effortlessly at eye level—preventing neck strain during extended gaming, coding, or design sessions.

Articulate smoothly with +90° to -45° screen tilt, 180° left-right swivel, and 360° landscape-to-portrait rotation for vertical code reading. Supports quick VESA 75×75mm and 100×100mm detachable plates, integrated clip-on cable covers, plus both C-clamp and through-desk grommet mounting hardware.

Key Highlights:
• Smooth Gas-Spring Lift: Finger-light height adjustment for 13"–32" displays (up to 17.6 lbs)
• Full Range Ergonomics: +90°/-45° tilt, ±90° swivel & 360° portrait/landscape spin
• Quick-Release VESA 75×75 / 100×100mm Mount + Concealed Arm Cable Channels
• Dual Installation Options: Sturdy Desk C-Clamp & Grommet Mount Bases Included`,
    tags: ['redragon', 'gmk914', 'monitor arm', 'vesa mount', 'gas spring stand'],
    specifications: {
      Model: 'Redragon GMK914',
      'Screen Size': '13" to 32" Flat & Curved Monitors',
      'Load Range': '4.4 – 17.6 lbs (2 – 8 kg)',
      'VESA Patterns': '75×75mm & 100×100mm',
      Articulation: '+90° / -45° Tilt, 180° Swivel, 360° Rotation',
      Mounting: 'C-Clamp & Grommet Desk Mount Included',
      Cable: 'Integrated Snap-On Cable Management Clips',
      Color: 'Matte Black',
    },
    soldCount: 67,
    sampleReviews: [
      { rating: 5, reviewerName: 'Asaduzzaman Nur', text: 'Cleared a huge chunk of desk room underneath my 27-inch IPS monitor where the factory tripod stand used to sit.', daysAgo: 1, helpfulCount: 12 },
      { rating: 5, reviewerName: 'Moumita Das', text: 'Gas spring tension dialed in easily so my monitor hovers steadily at exact eye level without drifting down.', daysAgo: 2, helpfulCount: 9 },
      { rating: 5, reviewerName: 'Shafiqul Islam', text: 'Rotating 90 degrees into vertical portrait orientation takes one smooth twist when reviewing tall code files.', daysAgo: 4, helpfulCount: 8 },
      { rating: 4, reviewerName: 'Kazi Farhana', text: 'Sliding VESA plate screws onto the monitor back first before dropping onto the arm head—saved solo installation.', daysAgo: 5, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Naimur Rashid', text: 'Under-arm cable channels hid both DisplayPort and power cords neatly down the spine.', daysAgo: 7, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Rumana Parvin', text: 'Zero screen wobble while typing fast on a heavy mechanical keyboard.', daysAgo: 8, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Tanmoy Sarkar', text: 'Included grommet kit let us bolt straight through a rear office desk cutout cleanly.', daysAgo: 10, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Sadia Afrin Khan', text: 'Tilts downward gently without drooping so sharing spreadsheets across the desk is quick.', daysAgo: 12, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Al-Amin Hossain', text: 'Powder-coated black metal arm looks sleek next to dark monitor bezels.', daysAgo: 13, helpfulCount: 5 },
      { rating: 4, reviewerName: 'Fariha Jahan', text: 'Foam padding under the desk clamp protects veneer surfaces from squeeze marks.', daysAgo: 15, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Jubayer Ahmed', text: 'Handles a 32-inch curved VA display securely right near maximum extension.', daysAgo: 16, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Nusrat Haque', text: 'Sliding laptop and mouse pad directly under the raised display opens up workspace immediately.', daysAgo: 18, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Raihan Chowdhury', text: 'Hex tension screws stay tucked nicely inside the arm storage holder so future tweaks stay easy.', daysAgo: 19, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Tamanna Islam', text: '360-degree base swivel pivots easily toward a side couch for evening movies.', daysAgo: 21, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Sakib Al Hasan', text: 'Well machined cast aluminum joints articulate smoothly with zero grating.', daysAgo: 22, helpfulCount: 4 },
      { rating: 4, reviewerName: 'Lamia Tabassum', text: 'Adjusting tilt tension took thirty seconds with the included wrench so heavy screens stay level.', daysAgo: 24, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Hasnat Karim', text: 'Strong desk stability even when extending the screen forward for detail retouching.', daysAgo: 25, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Mehnaz Rahman', text: 'Great ergonomic upgrade that noticeably reduced neck stiffness after week one.', daysAgo: 27, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Sohail Mia', text: 'Compact clamp footprint fits narrow back-lip desks cleanly.', daysAgo: 28, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Tanjila Akter', text: 'All screws and spacers for recessed VESA backs came neatly labeled in the box.', daysAgo: 30, helpfulCount: 4 },
    ],
  },
  {
    id: 'nova-prod-014',
    slug: 'epomaker-th26-tri-mode-wireless-mechanical-numpad',
    name: 'EPOMAKER TH26 Tri-Mode Wireless Mechanical Macro Numpad (26-Key + Rotary Knob)',
    sku: 'EPOMAKER-TH26-WH-Yun',
    brand: 'EPOMAKER',
    category: 'Computer & Gaming',
    price: 530,
    regularPrice: 710,
    stock: 30,
    weight: '750g',
    images: [
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/EPOMAKERTH26_01.webp?width=900',
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/EPOMAKERTH26_03.webp?width=900',
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/EPOMAKERTH26_04.webp?width=900',
    ],
    shortDescription:
      'Hot-swappable 26-key wireless mechanical numpad with five dedicated top macro keys, multifunction rotary encoder knob, south-facing RGB, and gasket acoustic dampening.',
    description: `Pair compact 60% or 75% keyboards with instant spreadsheet entry and custom macros via the EPOMAKER TH26 Wireless Mechanical Numpad. Offering 26 programmable keys—including 5 top-row macro shortcuts and a knurled aluminum rotary volume/zoom knob—it brings dedicated control over spreadsheets, audio mixes, or Blender timelines right beside either hand.

Constructed with gasket cushioning and hot-swappable PCB sockets compatible with standard 3-pin/5-pin switches, the TH26 connects cleanly over 2.4GHz wireless, Bluetooth, or USB-C wired with full programmable layers.

Key Highlights:
• 26-Key Numpad + 5 Dedicated Macro Keys + Tactile Aluminum Rotary Knob
• Hot-Swappable Gasket Construction: Creamy switch acoustics matching custom mechanical boards
• Tri-Mode Wireless Flexibility: Switch seamlessly across Bluetooth, 2.4GHz dongle, and USB-C
• Durable Double-Shot PBT Keycaps + Per-Key South-Facing RGB Backlighting`,
    tags: ['epomaker', 'th26', 'mechanical numpad', 'macro pad', 'wireless keypad'],
    specifications: {
      Model: 'EPOMAKER TH26',
      Keys: '26 Mechanical Keys (incl. 5 Macro Keys) + 1 Rotary Knob',
      Connectivity: '2.4GHz Wireless / Bluetooth 5.0 / USB-C Wired',
      Structure: 'Gasket Mount + Multi-Layer Acoustic Foam',
      PCB: 'Hot-Swappable 3-Pin & 5-Pin Switches',
      Keycaps: 'Cherry-Profile Double-Shot PBT',
      Backlight: 'South-Facing RGB LEDs',
      Color: 'Cream White & Gray Accent',
    },
    soldCount: 49,
    sampleReviews: [
      { rating: 5, reviewerName: 'Zakia Hossain', text: 'Pairs neatly on the left side of my compact 75% keyboard so number crunching and mouse room coexist.', daysAgo: 1, helpfulCount: 9 },
      { rating: 5, reviewerName: 'Rashedul Hoque', text: 'Knurled metal knob clicks cleanly on every turn—mapped it directly to Lightroom brush sizing.', daysAgo: 3, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Farhana Karim', text: 'Five extra top macro buttons handle copy, paste, save, and calculator launches with one tap.', daysAgo: 5, helpfulCount: 6 },
      { rating: 4, reviewerName: 'Tahmid Hasan', text: 'Match between gasket foam and factory linear switches sounds pleasantly deep rather than rattly.', daysAgo: 7, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Sumon Barua', text: 'Bluetooth reconnects instantaneously to my work notebook whenever waking from sleep.', daysAgo: 9, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Nadia Yasmin', text: 'Thick PBT keycaps resist finger oils cleanly across accounting heavy weeks.', daysAgo: 11, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Imran Chowdhury', text: 'Heavy 750g weighted feel keeps the pad completely still on slick desk mats.', daysAgo: 13, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Maliha Rahman', text: '2.4GHz wireless adapter wakes with zero missed digits during fast keypad data entry.', daysAgo: 15, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Kazi Tariq', text: 'Hot-swap sockets let me drop left-over tactile switches onto the Enter and Zero keys easily.', daysAgo: 17, helpfulCount: 3 },
      { rating: 4, reviewerName: 'Sadia Islam', text: 'South-facing LEDs light up key borders cleanly at night without blinding eyes.', daysAgo: 19, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Mizanur Haque', text: 'Battery holds weeks per USB-C top-up when running subtle static backlighting.', daysAgo: 21, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Sabiha Rahman', text: 'Two-stage kickstands raise typing angle smoothly to align flush beside taller mechanical boards.', daysAgo: 23, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Nafis Alam', text: 'Built-in dongle garage prevents misplacing the 2.4GHz receiver in laptop backpacks.', daysAgo: 25, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Samiha Sultana', text: 'Mute toggle on pressing the rotary wheel straight down is super convenient on Discord.', daysAgo: 27, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Rohan Ahmed', text: 'Zero-latency wired mode over USB-C doubles as an editing macro box in DaVinci Resolve.', daysAgo: 28, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Adiba Noor', text: 'Clean cream-and-gray palette looks refined right next to minimalist desktop accessories.', daysAgo: 29, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Shakib Mahmud', text: 'Zero stabilizer rattle on the vertical Plus and Enter keys right out of the box.', daysAgo: 30, helpfulCount: 6 },
    ],
  },
  {
    id: 'nova-prod-015',
    slug: 'satechi-form-reversible-vegan-leather-desk-mat-indigo',
    name: 'Satechi Form Reversible Vegan Leather Desk Mat (Indigo)',
    sku: 'ST-LDMFB',
    brand: 'Satechi',
    category: 'Computer & Gaming',
    price: 495,
    regularPrice: 675,
    stock: 36,
    weight: '420g',
    images: [
      'https://cdn.shopify.com/s/files/1/1520/4366/files/FormDeskMatindigo6.webp?width=900',
      'https://cdn.shopify.com/s/files/1/1520/4366/files/FormDeskMatindigo1.webp?width=900',
      'https://cdn.shopify.com/s/files/1/1520/4366/files/FormDeskMatindigo2.webp?width=900',
    ],
    shortDescription:
      'Premium water-resistant vegan PU leather desktop mat featuring reinforced perimeter stitching, smooth precision mouse glide, and a high-grip anti-slip backing.',
    description: `Define and safeguard your desk setup with the Satechi Form Vegan Leather Desk Mat in Indigo. Constructed from smooth, water-resistant polyurethane (PU) leather with cleanly stitched edges and softly rounded corners, it lays flat effortlessly beneath laptops, full keyboards, mice, and writing pads.

The finely pebbled top layer provides frictionless optical mouse tracking and a comfortable, warm writing surface, while the textured non-slip backing grips solid wood, laminate, and glass desktops securely. Quick to wipe clean from accidental coffee drips or dust.

Key Highlights:
• Full-Coverage Desk Pad: Generously accommodates keyboard, mouse & accessories cleanly
• Smooth Water-Resistant PU Leather: Repels coffee spills and wipes dry effortlessly
• Precision Mouse Tracking Surface + Grippy Non-Slip Anti-Curl Base
• Reinforced Perimeter Stitching prevents edge fraying across years of daily use`,
    tags: ['satechi', 'desk mat', 'vegan leather pad', 'indigo desk pad', 'mouse mat'],
    specifications: {
      Model: 'Satechi Form Desk Mat (ST-LDMFB)',
      Material: 'Water-Resistant Vegan Polyurethane (PU) Leather',
      Stitching: 'Reinforced Anti-Fray Edge Stitching',
      Base: 'Textured Non-Slip Anti-Skid Backing',
      Compatibility: 'Optical & Laser Mice / Mechanical & Wireless Keyboards',
      Care: 'Damp Cloth Wipe-Clean Surface',
      Edges: 'Rounded Safety Corners',
      Color: 'Indigo Blue',
    },
    soldCount: 78,
    sampleReviews: [
      { rating: 5, reviewerName: 'Farzana Kabir', text: 'Deep indigo shade brings subtle color to a light oak table while unrolling flat within hours.', daysAgo: 2, helpfulCount: 9 },
      { rating: 5, reviewerName: 'Tanvir Hossain', text: 'Clean edge stitching lies completely flush under my wrists without scratching forearms during coding.', daysAgo: 4, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Sadia Afrin Chowdhury', text: 'Wiped spilled iced tea straight off with a paper towel without leaving any ring mark.', daysAgo: 6, helpfulCount: 8 },
      { rating: 4, reviewerName: 'Asifur Rahman', text: 'Optical wireless mouse glides quietly and tracks accurately without needing a separate cloth pad.', daysAgo: 9, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Nusrat Islam', text: 'Soft cushioned surface makes signing notebooks directly on the mat much smoother.', daysAgo: 11, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Mahmud Khan', text: 'Non-slip underside anchors my mechanical keyboard firmly so it never creeps forward.', daysAgo: 14, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Tasfia Ahmed', text: 'Subtle debossed Satechi corner logo keeps branding classy and understated.', daysAgo: 17, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Imranuzzaman Alam', text: 'Dampens hollow desk vibration nicely when typing on stiffer tactile boards.', daysAgo: 19, helpfulCount: 5 },
      { rating: 4, reviewerName: 'Priti Chowdhury', text: 'Zero synthetic odor straight out of packaging unlike cheap neoprene pads.', daysAgo: 21, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Kazi Sajjad', text: 'Generous width holds a 75% board, numpad, mouse, and notebook comfortably.', daysAgo: 24, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Nabila Rahman', text: 'Rounded corners stay flat instead of curling upwards after months of forearm pressure.', daysAgo: 26, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Shafinul Haque', text: 'Doubles seamlessly as a clean uniform backdrop when shooting overhead desk photography.', daysAgo: 28, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Ruhul Kabir', text: 'Easy weekly wipe keeps dust away far simpler than washing thick cloth gaming mats.', daysAgo: 30, helpfulCount: 4 },
    ],
  },
  {
    id: 'nova-prod-016',
    slug: 'redragon-gcf012-120mm-daisy-chain-argb-pwm-pc-case-fan-3-pack',
    name: 'Redragon GCF012 120mm Daisy-Chain ARGB PWM PC Case Fan (3-Pack, Black)',
    sku: 'RED-GCF012-3PK',
    brand: 'Redragon',
    category: 'Computer & Gaming',
    price: 460,
    regularPrice: 640,
    stock: 42,
    weight: '650g',
    images: [
      'https://cdn.shopify.com/s/files/1/0012/4957/4961/files/RedragonGCF012Standard120mmPCCaseFan_1.png?width=900',
      'https://cdn.shopify.com/s/files/1/0012/4957/4961/files/RedragonGCF012Standard120mmPCCaseFan_2.png?width=900',
      'https://cdn.shopify.com/s/files/1/0012/4957/4961/files/RedragonGCF012Standard120mmPCCaseFan_5.jpg?width=900',
    ],
    shortDescription:
      'Modular 3-pack of 120mm PWM cooling fans featuring effortless interlocking daisy-chain connectors, 5V 3-pin motherboard ARGB sync, side infinity light strips, and anti-vibration pads.',
    description: `Keep GPU and processor temperatures chill while banishing rear-panel cable spaghetti with the Redragon GCF012 120mm ARGB PWM Case Fan 3-Pack. Each fan uses interlocking modular daisy-chain contacts—letting three 120mm fans snap together cleanly and draw both 4-pin PWM speed control and 5V 3-pin ARGB lighting from a single consolidated harness.

Engineered for both mesh case intake and 240mm/360mm liquid radiator mounting, nine sculpted impeller blades push balanced airflow cleanly while integrated corner silicone damper pads minimize chassis humming. Sync effortlessly with ASUS Aura, MSI Mystic Light, Gigabyte RGB Fusion, and ASRock Polychrome.

Key Highlights:
• Clean Daisy-Chain Interlock: Link 3 fans together cleanly to reduce case cabling clutter
• 4-Pin PWM Smart Fan Curve + 5V 3-Pin Motherboard ARGB Sync Support
• Dual-Zone Illumination: Diffused center hub blades + crisp side accent strips
• Corner Silicone Vibration Dampers for quiet idle and gaming acoustics`,
    tags: ['redragon', 'gcf012', 'argb case fan', '120mm pwm fan', 'pc cooling'],
    specifications: {
      Model: 'Redragon GCF012 (3-Pack)',
      Size: '120 × 120 × 25 mm',
      Connection: 'Modular Daisy-Chain + Single Consolidated Lead',
      'Fan Control': '4-Pin PWM Speed Control',
      Lighting: '5V 3-Pin Addressable RGB (Motherboard Sync)',
      Dampening: '8x Integrated Rubber Anti-Vibration Corner Pads',
      Application: 'PC Case Airflow Intake/Exhaust & 120/240/360mm Radiators',
      Color: 'Black Frame',
    },
    soldCount: 93,
    sampleReviews: [
      { rating: 5, reviewerName: 'Siamul Islam', text: 'Daisy-chain interlock cut down my back-panel fan cables from six messy wires to just one clean lead.', daysAgo: 1, helpfulCount: 14 },
      { rating: 5, reviewerName: 'Fahima Sultana', text: '5V 3-pin header synced cleanly with ASUS Aura Sync on the very first boot.', daysAgo: 2, helpfulCount: 11 },
      { rating: 5, reviewerName: 'Naimuddin Ahmed', text: 'Dropped case GPU temperatures by five degrees under synthetic loads once mounted as front intakes.', daysAgo: 4, helpfulCount: 9 },
      { rating: 4, reviewerName: 'Tarikul Hoque', text: 'PWM fan curves ramp smoothly up during gaming and spin quietly around 900 RPM at desktop idle.', daysAgo: 5, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Rasheda Khatun', text: 'Side infinity light strips look awesome peering through tempered glass front-mesh panels.', daysAgo: 7, helpfulCount: 8 },
      { rating: 5, reviewerName: 'Shakibul Alam', text: 'Snap-together bridging contacts fit flush without flimsy sagging gaps between fans.', daysAgo: 8, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Mahmudur Chowdhury', text: 'Corner rubber pads isolate vibration effectively against thinner steel ATX frames.', daysAgo: 10, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Ishrat Chowdhury', text: 'Diffused milky center blades spread soft pastel ARGB colors without glaring LED hotspots.', daysAgo: 11, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Sabbir Rahman', text: 'Mounted all three smoothly onto a 360mm radiator with balanced static pressure airflow.', daysAgo: 13, helpfulCount: 6 },
      { rating: 4, reviewerName: 'Anika Hossain', text: 'Clean braided single harness routes tightly through slim motherboard cable grommets.', daysAgo: 14, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Zobaidul Karim', text: 'Zero bearing ticking noise even when running vertically as front intake fans.', daysAgo: 16, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Tania Akter', text: 'Standard 25mm frame thickness clears tight RAM heatsinks nicely on top radiator mounts.', daysAgo: 17, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Rohanur Islam', text: 'Includes matte black mounting screws for all three fans neatly packed inside.', daysAgo: 19, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Nafisuzzaman Mia', text: 'Easy to swap out single fans in the daisy chain without tearing apart the whole cable tie layout.', daysAgo: 20, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Samira Zaman', text: 'Consistent blade balancing prevents buzzing resonance at high 1600 RPM loads.', daysAgo: 22, helpfulCount: 4 },
      { rating: 4, reviewerName: 'Hasib Rahman', text: 'MSI Mystic Light animated breathing effects look crisp along both side edges.', daysAgo: 23, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Ehsan Kabir', text: 'Value per triple pack rivals fans costing more than twice as much.', daysAgo: 25, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Nadia Chowdhury', text: 'Matte black frame plastic matches blackout motherboards cleanly when lighting is dimmed.', daysAgo: 26, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Kamrul Hasan Mia', text: 'Quick twenty-minute swap completely refreshed airflow inside my mid-tower rig.', daysAgo: 27, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Farhana Alam', text: 'Built-in standard PWM + 3-pin connectors avoid needing proprietary controller boxes.', daysAgo: 29, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Riyadul Hoque', text: 'Zero flicker across rainbow and single-tone motherboard color profiles.', daysAgo: 30, helpfulCount: 4 },
    ],
  },
  {
    id: 'nova-prod-017',
    slug: 'satechi-thunderbolt-5-pro-braided-cable-120gbps-240w',
    name: 'Satechi Thunderbolt 5 Pro Braided USB-C Cable (120Gbps / 240W PD)',
    sku: 'ST-YTB5100K',
    brand: 'Satechi',
    category: 'Computer & Gaming',
    price: 425,
    regularPrice: 590,
    stock: 44,
    weight: '49g',
    images: [
      'https://cdn.shopify.com/s/files/1/1520/4366/files/thunderbolt-5-pro-cable-satechi-314995.webp?width=900',
      'https://cdn.shopify.com/s/files/1/1520/4366/files/thunderbolt-5-pro-cable-satechi-370959.webp?width=900',
      'https://cdn.shopify.com/s/files/1/1520/4366/files/thunderbolt-5-pro-cable-satechi-771066.webp?width=900',
    ],
    shortDescription:
      'Officially certified Thunderbolt 5 braided USB-C cable delivering up to 120Gbps Bandwidth Boost video, 80Gbps bi-directional data, dual 8K displays, and 240W Extended Power Range charging.',
    description: `Unlock flagship display, storage, and charging throughput through a single ultra-durable cord with the Satechi Thunderbolt 5 Pro Cable. Certified to full Thunderbolt 5 specifications, it achieves up to 80Gbps symmetric data transfer (expanding up to 120Gbps uni-directional Bandwidth Boost for high-refresh 4K/8K workstations) alongside full 240W USB Power Delivery EPR fast charging.

Finished in a tangle-free high-density black braided jacket with anodized aluminum connector collars and reinforced strain reliefs, it remains backward compatible with Thunderbolt 4, Thunderbolt 3, USB4, and standard USB-C laptops, tablets, and external NVMe drives.

Key Highlights:
• True Certified Thunderbolt 5: 80Gbps bi-directional data / up to 120Gbps video bandwidth
• Full 240W PD 3.1 Extended Power Range: Fast-charges flagship workstation laptops effortlessly
• Dual 6K/8K or Triple 4K High-Refresh Display Support over single dock connection
• High-Density Braided Nylon Jacket + Aluminum Connector Housings for years of travel`,
    tags: ['satechi', 'thunderbolt 5 cable', '240w usb-c cable', '120gbps', 'usb4 cable'],
    specifications: {
      Model: 'Satechi Thunderbolt 5 Pro Cable (ST-YTB5100K)',
      'Data Bandwidth': '80Gbps Bi-Directional / Up to 120Gbps Bandwidth Boost',
      'Power Delivery': 'Up to 240W USB-C PD 3.1 EPR',
      'Display Support': 'Dual 8K / Dual 6K / High-Refresh 4K Displays',
      Compatibility: 'Thunderbolt 5, Thunderbolt 4, Thunderbolt 3, USB4 & USB-C',
      Jacket: 'Tangle-Free Braided Nylon + Reinforced Aluminum Collars',
      Length: '1.0 Meter (3.3 ft)',
      Color: 'Space Gray / Black',
    },
    soldCount: 64,
    sampleReviews: [
      { rating: 5, reviewerName: 'Tawhidul Islam', text: 'Pushes external NVMe scratch disk speeds to peak bandwidth cleanly with zero random disconnects.', daysAgo: 2, helpfulCount: 9 },
      { rating: 5, reviewerName: 'Nadia Faruk', text: 'Carries both high-wattage laptop charging and dual 4K display output through one desk cord.', daysAgo: 5, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Shadman Kabir', text: 'Aluminum connector collars fit snug without straining notebook Thunderbolt sockets.', daysAgo: 8, helpfulCount: 6 },
      { rating: 4, reviewerName: 'Sadia Hoque', text: 'High-density braided weave coils neatly in pockets while staying flexible enough to snake around docks.', daysAgo: 11, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Rifat Hasan', text: 'Tested with both a 240W GaN charger and an external USB4 SSD chassis—stays cool throughout transfers.', daysAgo: 14, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Maliha Chowdhury', text: 'Laser-etched Thunderbolt 5 marking makes it easy to grab the right cable out of a drawer.', daysAgo: 17, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Ashraful Karim', text: 'Eliminated screen flicker I kept seeing on an external 144Hz monitor using cheaper generic cords.', daysAgo: 20, helpfulCount: 8 },
      { rating: 5, reviewerName: 'Tanisha Rahman', text: '1-meter length hits the sweet spot between desktop dock routing and laptop sleeve carry.', daysAgo: 23, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Faridul Haque', text: 'Backward compatible cleanly with my older Thunderbolt 3 audio interface and iPad Pro.', daysAgo: 26, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Fariha Ahmed', text: 'Reinforced rubber strain cuffs resist kinking tightly near laptop side ports.', daysAgo: 29, helpfulCount: 4 },
    ],
  },
  {
    id: 'nova-prod-018',
    slug: 'satechi-core-usb-c-to-4k-60hz-hdmi-adapter-indigo',
    name: 'Satechi Core USB-C to 4K 60Hz Aluminum HDMI Adapter (Indigo)',
    sku: 'ST-AC4KHY',
    brand: 'Satechi',
    category: 'Computer & Gaming',
    price: 395,
    regularPrice: 550,
    stock: 48,
    weight: '38g',
    images: [
      'https://cdn.shopify.com/s/files/1/1520/4366/files/CoreUSB-Cto4KHDMIAdapterindigo2.webp?width=900',
      'https://cdn.shopify.com/s/files/1/1520/4366/files/CoreUSB-Cto4KHDMIAdapterindigo3.webp?width=900',
      'https://cdn.shopify.com/s/files/1/1520/4366/files/CoreUSB-Cto4KHDMIAdapterindigo4.webp?width=900',
    ],
    shortDescription:
      'Slim plug-and-play anodized aluminum USB-C to HDMI display adapter delivering razor-sharp 4K@60Hz video output via DisplayPort Alt Mode and a durable braided lead.',
    description: `Connect laptops, tablets, or smartphones effortlessly to conference projectors, monitors, and 4K smart TVs with the Satechi Core USB-C to 4K HDMI Adapter in Indigo. Encased in a slim brushed aluminum housing paired with a matching braided cable lead, it runs cool and slips unnoticed into any pocket or tech pouch.

Supporting crystal-clear uncompressed 4K resolution at fluid 60Hz via USB-C DisplayPort Alt Mode, it requires zero driver downloads on macOS, Windows, ChromeOS, Linux, or iPadOS—just plug in to mirror or extend displays instantly.

Key Highlights:
• True 4K @ 60Hz Crystal-Clear Display Output (HDR & Audio Pass-Through)
• Anodized Aluminum Shell + Color-Matched Braided Strain-Relieved Cable
• Zero-Driver Plug-and-Play Compatibility across MacBook, iPad Pro & Windows USB-C
• Ultra-Portable 38g Slim Profile built for conference rooms and daily commute`,
    tags: ['satechi', 'usb-c to hdmi', '4k 60hz adapter', 'macbook hdmi', 'display adapter'],
    specifications: {
      Model: 'Satechi Core USB-C to 4K HDMI Adapter (ST-AC4KHY)',
      Input: 'USB-C (Requires DisplayPort Alt Mode Support)',
      Output: 'Full-Size Female HDMI Port',
      Resolution: 'Up to 4K (3840 × 2160) @ 60Hz',
      Materials: 'Anodized Aluminum Housing + Braided Cable Jacket',
      Installation: 'Driver-Free Plug and Play',
      Compatibility: 'MacBook Air/Pro, iPad Pro/Air, Windows & ChromeOS USB-C',
      Color: 'Indigo',
    },
    soldCount: 35,
    sampleReviews: [
      { rating: 5, reviewerName: 'Rafiul Alam', text: 'Triggered native 4K 60Hz output immediately on a classroom projector and my home LG monitor.', daysAgo: 6, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Samiha Tabassum', text: 'Color-matched indigo braided lead looks sharp and resists twisting inside my backpack pocket.', daysAgo: 17, helpfulCount: 5 },
    ],
  },
  {
    id: 'nova-prod-019',
    slug: 'epomaker-whisper-factory-lubed-linear-switches-100-pack',
    name: 'EPOMAKER Whisper Factory-Lubed Linear Mechanical Keyboard Switches (100-Pack)',
    sku: 'EPOMAKER-KEYSWITCH-Whisper-100pcs',
    brand: 'EPOMAKER',
    category: 'Computer & Gaming',
    price: 365,
    regularPrice: 515,
    stock: 38,
    weight: '360g',
    images: [
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/EPOMAKERWhisperLinearKeyboardSwitcheswhiteBG_1.webp?width=900',
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/EPOMAKERWhisperLinearKeyboardSwitcheswhiteBG_2.webp?width=900',
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/EPOMAKERWhisperLinearKeyboardSwitcheswhiteBG_3.webp?width=900',
    ],
    shortDescription:
      'Smooth factory pre-lubed 5-pin linear mechanical switch set (100 switches) tuned for deep creamy acoustics, tight stem wobble tolerance, and long-lasting typing comfort.',
    description: `Elevate any hot-swappable mechanical keyboard to custom-tuned acoustics with the EPOMAKER Whisper Linear Switch 100-Pack. Engineered for buttery-smooth keystrokes and a deep, rounded bottom-out sound free of annoying spring ping, each switch is precision-lubricated at the factory so you can install an entire TKL, 75%, or full-size board straight from the jar.

Tight stem tolerances minimize side-to-side keycap wobble for focused gaming and crisp touch-typing, while a standard 5-pin MX footprint and built-in SMD LED condenser window fit seamlessly across virtually all custom and prebuilt mechanical PCBs.

Key Highlights:
• Full 100-Switch Pack: Enough switches to outfit 60%, 75%, TKL, or 96% mechanical boards
• Precision Factory Pre-Lubrication: Silky zero-scratch travel straight out of the tub
• Deep Creamy Acoustic Tuning with minimal metallic spring resonance
• Universal 5-Pin MX Stem + Transparent Diffuser Window for bright per-key RGB`,
    tags: ['epomaker', 'whisper switches', 'linear switch', 'custom keyboard switches', 'mechanical switches'],
    specifications: {
      Model: 'EPOMAKER Whisper Linear Switch Set',
      Quantity: '100 Switches per Pack',
      Type: 'Linear Mechanical Switch (Factory Pre-Lubed)',
      Mount: '5-Pin PCB Mount (MX Cross Stem)',
      Acoustics: 'Deep Thocky / Creamy Sound Profile',
      Lighting: 'Built-In SMD RGB Light Diffuser Window',
      Compatibility: 'Hot-Swappable 5-Pin MX Keyboards & Cherry/OEM/MAO Keycaps',
      Packaging: 'Reusable Protective Clear Tub',
    },
    soldCount: 88,
    sampleReviews: [
      { rating: 5, reviewerName: 'Zarif Mahmud', text: 'Dropped all 84 switches onto my 75% board and every single key felt evenly lubed with zero scratchiness.', daysAgo: 1, helpfulCount: 11 },
      { rating: 5, reviewerName: 'Sabnam Rahman', text: 'Eliminated hollow metallic spring ping on an aluminum board without needing hours of manual hand-lubing.', daysAgo: 3, helpfulCount: 9 },
      { rating: 5, reviewerName: 'Ahsanul Kabir', text: 'Rich deep bottom-out tone gives satisfying tactile feedback to the ears even though travel stays smooth.', daysAgo: 5, helpfulCount: 8 },
      { rating: 4, reviewerName: 'Maliha Hoque', text: 'Stem tolerances feel impressively tight so wide Spacebar and Shift keycaps barely wobble sideways.', daysAgo: 7, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Sajibur Islam', text: 'Packed cleanly with straight pins—did not have to straighten a single leg across all 100 switches.', daysAgo: 9, helpfulCount: 7 },
      { rating: 5, reviewerName: 'Fariha Kabir', text: '100-count jar left me with plenty of spares after populating a 96% office keyboard.', daysAgo: 11, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Tanvirul Haque', text: 'Light spring weight keeps fingers relaxed during three-hour coding sprints.', daysAgo: 13, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Nusrat Chowdhuri', text: 'Built-in light diffuser spreads per-key SMD RGB evenly across south-facing boards.', daysAgo: 15, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Mahfuz Alam', text: 'Reusable plastic tub is great for storing old spare switches neatly on a shelf.', daysAgo: 17, helpfulCount: 3 },
      { rating: 4, reviewerName: 'Zerin Sultana', text: 'Noticeably quieter and deeper than noisy stock clicky switches for shared study rooms.', daysAgo: 19, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Rashedul Alam', text: 'Consistent factory lubing feels comparable to switches that take a whole weekend to lube by hand.', daysAgo: 21, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Tasnim Kabir', text: 'Standard MX cross stems held both thick PBT Cherry and novelty rounded caps snugly.', daysAgo: 22, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Niaz Ahmed', text: 'Responsive quick rebound helped fast double-tapping in rhythm games cleanly.', daysAgo: 24, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Afia Sultana', text: '5-pin PCB legs aligned squarely without bending on PC and FR4 switch plates.', daysAgo: 25, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Tariq Chowdhury', text: 'Replaced harsh scratchy red switches on a friend’s keyboard—transformed typing sound completely.', daysAgo: 26, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Sumaiya Yasmin', text: 'Clean muted sound won approval from everyone on group Discord voice calls.', daysAgo: 28, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Adnan Kabir', text: 'Zero stem bind even when pressing corners of off-center modifier keys.', daysAgo: 29, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Rumana Islam', text: 'Immediate upgrade in smoothness and sound character for minimal installation time.', daysAgo: 30, helpfulCount: 4 },
    ],
  },
  {
    id: 'nova-prod-020',
    slug: 'epomaker-jellypaw-mao-profile-translucent-keycap-set',
    name: 'EPOMAKER JellyPaw MAO-Profile Translucent ABS/PC Keycap Set (Pink & Yellow)',
    sku: 'EPOMAKER-KEYCAP-MAO-JP-PKYL',
    brand: 'EPOMAKER',
    category: 'Computer & Gaming',
    price: 330,
    regularPrice: 470,
    stock: 33,
    weight: '730g',
    images: [
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/EPOMAKERJellyPawKeycapsSetWhiteBG_1.webp?width=900',
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/EPOMAKERJellyPawKeycapsSetWhiteBG_2.webp?width=900',
      'https://cdn.shopify.com/s/files/1/0280/3931/5529/files/EPOMAKERJellyPawKeycapsSetWhiteBG_3.webp?width=900',
    ],
    shortDescription:
      'Playful cat-themed glossy crystal translucent ABS+PC keycap set in sculpted MAO profile, offering glowing RGB underglow dispersion and broad ANSI layout compatibility.',
    description: `Bring playful crystal shine and vivid backlighting diffusion to your custom keyboard with the EPOMAKER JellyPaw Keycap Set. Molded in adorable sculpted MAO profile with gentle cat-ear contours out of dual-layer translucent ABS+PC, each cap wraps key switches in a smooth jelly gloss finish while adorable crisp cat artwork and legends sit safely inside.

Generous key compatibility fits 60%, 65%, 75%, TKL, and full-size ANSI MX-stem mechanical keyboards effortlessly—giving backlit keyboards an unmistakable glowing pastel desk aesthetic.

Key Highlights:
• Crystal-Jelly Translucent ABS+PC Construction: Softly glows when paired with RGB PCBs
• Ergonomic MAO Sculpted Cat-Ear Profile: Rounded dish cradling fingertips naturally
• Playful Pink & Pastel Yellow Theme with Crisp Non-Fading Sub-Surface Graphics
• Broad Layout Coverage: Fits 60%, 65%, 75%, TKL & 100% MX-Stem Keyboards`,
    tags: ['epomaker', 'jellypaw keycaps', 'mao profile', 'translucent keycaps', 'kawaii keycaps'],
    specifications: {
      Model: 'EPOMAKER JellyPaw Keycap Set',
      Profile: 'Sculpted MAO Cat-Ear Profile',
      Material: 'Dual-Layer Translucent ABS + Polycarbonate (Glossy Jelly Finish)',
      Colorway: 'Pastel Pink & Sunny Yellow',
      'Stem Support': 'Universal Cross (+) MX Mechanical Stems',
      Layouts: 'Compatible with 60%, 65%, 75%, TKL & Full-Size Keyboards',
      Legends: 'Protected Graphic Artwork & Crisp Side/Top Symbols',
      Packaging: 'Custom Protective Sorting Trays',
    },
    soldCount: 74,
    sampleReviews: [
      { rating: 5, reviewerName: 'Tasfia Akter', text: 'RGB LEDs glow softly through the translucent pink and butter-yellow jelly shells—looks magical at night.', daysAgo: 1, helpfulCount: 12 },
      { rating: 5, reviewerName: 'Nabila Zaman', text: 'Rounded MAO cat-ear silhouette feels surprisingly comfy under fingertips once you settle in.', daysAgo: 2, helpfulCount: 9 },
      { rating: 5, reviewerName: 'Rohanur Alam', text: 'Gift-boxed my sister’s 75% keyboard with these caps and all extra novelty paws fit cleanly.', daysAgo: 4, helpfulCount: 7 },
      { rating: 4, reviewerName: 'Saima Islam', text: 'Smooth glossy finish makes switches sound slightly poppier compared to matte rough PBT sets.', daysAgo: 5, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Kamrun Nahar', text: 'Dual-layer graphic caps keep the cute paw motifs protected underneath the shiny clear coat.', daysAgo: 7, helpfulCount: 8 },
      { rating: 5, reviewerName: 'Zayeda Khatun', text: 'Sorting trays kept every row organized neatly so swapping the whole board took fifteen minutes.', daysAgo: 8, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Fariha Noor', text: 'Zero tight stem splitting—slipped cleanly onto linear MX stems and stayed firmly seated.', daysAgo: 10, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Mahim Chowdhury', text: 'Pastel pink and sunny yellow mix pops vividly against clean white keyboard frames.', daysAgo: 12, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Sharmeen Chowdhury', text: 'Includes extra 1.75u Shift and 1u modifiers so compact 65% and 75% boards map properly.', daysAgo: 14, helpfulCount: 7 },
      { rating: 4, reviewerName: 'Tanjina Karim', text: 'Quick microfiber wipe clears fingerprints right off the high-gloss polycarbonate shell.', daysAgo: 15, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Nafisa Sultana', text: 'Deepened key sound nicely on gasket-mount keyboards for a satisfying marble-like click.', daysAgo: 17, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Alvi Rahman', text: 'Cute cat novelty escape and enter keys add instant personality to video desk tours.', daysAgo: 18, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Lubna Haque', text: 'Bright translucent sides diffuse south-facing RGB cleanly even in daytime study sessions.', daysAgo: 20, helpfulCount: 6 },
      { rating: 5, reviewerName: 'Arpita Chakraborty', text: 'Precision molding left zero sharp plastic flashing beneath any spacebar or modifier cap.', daysAgo: 22, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Mehnaz Kabir', text: 'Gentle rounded dish naturally centers each fingertip toward the middle of every switch.', daysAgo: 23, helpfulCount: 5 },
      { rating: 5, reviewerName: 'Sanjida Alam', text: 'Both 6.25u spacebar options arrived straight and flat without any warp.', daysAgo: 25, helpfulCount: 4 },
      { rating: 4, reviewerName: 'Ruhana Parvin', text: 'Crisp sub-surface legends stay clean and sharp under colorful animated gradients.', daysAgo: 27, helpfulCount: 3 },
      { rating: 5, reviewerName: 'Tasfia Noor', text: 'Sturdy two-tray retail box keeps unused extra novelty keycaps safe from scratches.', daysAgo: 28, helpfulCount: 4 },
      { rating: 5, reviewerName: 'Sadiya Hoque', text: 'Turned a plain everyday work keyboard into the centerpiece of my pastel desk setup.', daysAgo: 30, helpfulCount: 6 },
    ],
  },
];
