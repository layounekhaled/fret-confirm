/**
 * Normalisation des numéros de téléphone algériens
 * Accepte: +213550123456, 213550123456, 00213550123456, 550123456, 0550 12 34 56
 * Convertit vers: 0550123456
 */

export function normalizePhone(phone: string): string {
  if (!phone) throw new Error('phone_invalid')

  // Supprimer tous les espaces, tirets, points, parenthèses
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, '')

  // Retirer le préfixe international
  if (cleaned.startsWith('+213')) {
    cleaned = '0' + cleaned.slice(4)
  } else if (cleaned.startsWith('00213')) {
    cleaned = '0' + cleaned.slice(5)
  } else if (cleaned.startsWith('213') && cleaned.length >= 12) {
    cleaned = '0' + cleaned.slice(3)
  }

  // Vérifier que le numéro commence par 05, 06 ou 07 et fait 10 chiffres
  if (!/^0[567]\d{8}$/.test(cleaned)) {
    throw new Error('phone_invalid')
  }

  return cleaned
}

export function isValidPhone(phone: string): boolean {
  try {
    normalizePhone(phone)
    return true
  } catch {
    return false
  }
}
