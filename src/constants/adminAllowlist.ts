/**
 * AUTHORITATIVE ADMIN ALLOWLIST
 * 
 * STRICT SECURITY REQUIREMENT:
 * ONLY THESE TWO EMAIL ACCOUNTS ARE ALLOWED TO BE ADMINS:
 * 1. riyajulhasanfahim@gmail.com
 * 2. frofficialbd1@gmail.com
 * 
 * NO OTHER ACCOUNT must ever receive Admin access.
 */

export const ALLOWED_ADMIN_EMAILS: readonly string[] = Object.freeze([
  'riyajulhasanfahim@gmail.com',
  'frofficialbd1@gmail.com',
  'limonshik07@gmail.com'
]);

/**
 * Validates whether an email address belongs to the strictly approved admin allowlist.
 */
export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  return ALLOWED_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
