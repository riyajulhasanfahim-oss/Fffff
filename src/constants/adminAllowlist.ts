/**
 * AUTHORITATIVE ADMIN ALLOWLIST FOR RJ WORLD BD
 *
 * CRITICAL SECURITY INVARIANT:
 * ONLY these two exact email addresses are permitted to have Admin privileges.
 * NO OTHER ACCOUNT must EVER receive Admin access under any circumstances.
 *
 * Any automatic Admin granting mechanism based on signup, display name, UID, 
 * database role field, query parameter, localStorage flag, or client claim is strictly forbidden.
 */

export const ALLOWED_ADMIN_EMAILS = Object.freeze([
  'riyajulhasanfahim@gmail.com',
  'frofficialbd1@gmail.com'
]);

/**
 * Returns true strictly if the given email is one of the two authorized admin emails.
 */
export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return ALLOWED_ADMIN_EMAILS.includes(normalized);
}
