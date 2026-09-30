import { rtdbGet } from '../lib/rtdb';

export async function handleVendorAccess(userId?: string) {
  try {
    const data = await rtdbGet<any>('settings/appConfig');
    
    if (data) {
      if (!data.vendorEnabled) {
        return {
          type: "redirect",
          url: `https://wa.me/${data.whatsappNumber || ''}?text=${encodeURIComponent("আমি আমার প্রোডাক্ট বিক্রি করতে চাই")}`
        };
      }
    }
  } catch (error) {
    console.error("Error checking vendor access:", error);
  }

  return {
    type: "allow",
    route: "/become-vendor"
  };
}
