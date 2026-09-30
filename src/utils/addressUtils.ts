/**
 * Safely converts any address data (string, object with keys {city, country, district, division, state, street, upazila, zip},
 * or nested object) into a human-readable string.
 * Guarantees that it NEVER returns an object or crashes React with "Objects are not valid as a React child".
 */
export function formatAddress(addr: any, fallback: string = 'N/A'): string {
  if (addr === null || addr === undefined) return fallback;
  if (typeof addr === 'string') {
    const trimmed = addr.trim();
    return trimmed || fallback;
  }
  if (typeof addr === 'number') {
    return String(addr);
  }
  if (typeof addr === 'object') {
    // Check if it has a string fullAddress or address property
    if (typeof addr.fullAddress === 'string' && addr.fullAddress.trim()) {
      return addr.fullAddress.trim();
    }
    if (typeof addr.address === 'string' && addr.address.trim()) {
      return addr.address.trim();
    }

    // Build from parts
    const parts: string[] = [];
    const street = addr.street || addr.road || addr.area || '';
    if (typeof street === 'string' && street.trim()) parts.push(street.trim());

    const upazila = addr.upazila || addr.thana || addr.city || '';
    if (typeof upazila === 'string' && upazila.trim() && !parts.includes(upazila.trim())) {
      parts.push(upazila.trim());
    }

    const district = addr.district || addr.state || '';
    if (typeof district === 'string' && district.trim() && !parts.includes(district.trim())) {
      parts.push(district.trim());
    }

    const division = addr.division || '';
    if (typeof division === 'string' && division.trim() && !parts.includes(division.trim())) {
      parts.push(division.trim());
    }

    const zip = addr.zip || addr.zipCode || addr.postalCode || '';
    if (zip && (typeof zip === 'string' || typeof zip === 'number') && String(zip).trim()) {
      parts.push(String(zip).trim());
    }

    const country = addr.country || '';
    if (country && typeof country === 'string' && country.trim() && country.trim() !== 'Bangladesh') {
      parts.push(country.trim());
    }

    if (parts.length > 0) {
      return parts.join(', ');
    }

    // If it's another kind of object, try to extract all string values
    const stringValues = Object.values(addr).filter(v => typeof v === 'string' && v.trim()) as string[];
    if (stringValues.length > 0) {
      return stringValues.join(', ');
    }
  }

  return fallback;
}

/**
 * Ensures any value rendered in JSX is safe (never an object that throws "Objects are not valid as a React child")
 */
export function safeRenderText(val: any, fallback: string = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') return formatAddress(val, fallback);
  return fallback;
}
