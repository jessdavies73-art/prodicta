// Centralised sender address for all transactional PRODICTA emails.
// Every Resend send call should import EMAIL_FROM from here so sender
// changes happen in one place and DMARC / deliverability stays consistent.
export const EMAIL_FROM = 'PRODICTA <hello@prodicta.co.uk>'
