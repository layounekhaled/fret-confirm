import { db } from '@/lib/db'

export async function generateInvoice(
  shopId: string,
  mois: string // format YYYY-MM
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  // Vérifier si une facture existe déjà pour ce mois
  const existing = await db.invoice.findFirst({
    where: { shopId, mois },
  })

  if (existing) {
    return { success: false, error: 'Facture déjà existante pour ce mois' }
  }

  // Calculer les dates du mois
  const [year, month] = mois.split('-').map(Number)
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)

  // Récupérer la boutique
  const shop = await db.shop.findUnique({ where: { id: shopId } })
  if (!shop) {
    return { success: false, error: 'Boutique introuvable' }
  }

  // Compter les commandes confirmées
  const confirmedOrders = await db.order.findMany({
    where: {
      shopId,
      statut: 'confirmee',
      confirmedAt: { gte: startDate, lt: endDate },
    },
  })

  const nbConfirmees = confirmedOrders.length
  const montantConfirm = nbConfirmees * shop.prixConfirmation

  // Compter les commandes envoyées pour stockage et emballage
  const shippedOrders = await db.order.findMany({
    where: {
      shopId,
      statut: { in: ['envoyee_ecotrack', 'en_preparation', 'emballée', 'prete_expedition'] },
      sentToEcotrackAt: { gte: startDate, lt: endDate },
    },
  })

  const nbExpediees = shippedOrders.length
  const montantStockage = nbExpediees * shop.prixStockage
  const montantEmballage = nbExpediees * shop.prixEmballage
  const montantTotal = montantConfirm + montantStockage + montantEmballage

  // Créer la facture
  const invoice = await db.invoice.create({
    data: {
      shopId,
      mois,
      nbConfirmees,
      montantConfirm,
      montantStockage,
      montantEmballage,
      montantTotal,
      statut: 'en_attente',
    },
  })

  return { success: true, invoiceId: invoice.id }
}

export async function getInvoice(invoiceId: string) {
  return db.invoice.findUnique({
    where: { id: invoiceId },
    include: { shop: true },
  })
}
