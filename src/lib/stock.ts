import { db } from '@/lib/db'

export async function reserveStock(productId: string, quantite: number): Promise<boolean> {
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product || product.stockDispo < quantite) return false

  await db.product.update({
    where: { id: productId },
    data: {
      stockDispo: product.stockDispo - quantite,
      stockReserve: product.stockReserve + quantite,
    },
  })

  await db.stockMovement.create({
    data: {
      productId,
      type: 'reservation',
      quantite,
      reference: 'Réservation commande',
    },
  })

  return true
}

export async function releaseStock(productId: string, quantite: number): Promise<boolean> {
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product || product.stockReserve < quantite) return false

  await db.product.update({
    where: { id: productId },
    data: {
      stockReserve: product.stockReserve - quantite,
      stockDispo: product.stockDispo + quantite,
    },
  })

  await db.stockMovement.create({
    data: {
      productId,
      type: 'retour',
      quantite,
      reference: 'Libération stock réservé',
    },
  })

  return true
}

export async function shipStock(productId: string, quantite: number): Promise<boolean> {
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product || product.stockReserve < quantite) return false

  await db.product.update({
    where: { id: productId },
    data: {
      stockReserve: product.stockReserve - quantite,
      stockExpedie: product.stockExpedie + quantite,
    },
  })

  await db.stockMovement.create({
    data: {
      productId,
      type: 'expedition',
      quantite,
      reference: 'Expédition commande',
    },
  })

  return true
}

export async function addStock(
  productId: string,
  quantite: number,
  reference?: string
): Promise<boolean> {
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) return false

  await db.product.update({
    where: { id: productId },
    data: {
      stockTotal: product.stockTotal + quantite,
      stockDispo: product.stockDispo + quantite,
    },
  })

  await db.stockMovement.create({
    data: {
      productId,
      type: 'entree',
      quantite,
      reference: reference || 'Entrée stock',
    },
  })

  return true
}

export async function adjustStock(
  productId: string,
  newTotal: number,
  reason?: string
): Promise<boolean> {
  const product = await db.product.findUnique({ where: { id: productId } })
  if (!product) return false

  const difference = newTotal - product.stockTotal

  await db.product.update({
    where: { id: productId },
    data: {
      stockTotal: newTotal,
      stockDispo: Math.max(0, product.stockDispo + difference),
    },
  })

  await db.stockMovement.create({
    data: {
      productId,
      type: 'ajustement',
      quantite: Math.abs(difference),
      reference: reason || `Ajustement: ${product.stockTotal} → ${newTotal}`,
      notes: difference >= 0 ? 'ajustement_positif' : 'ajustement_negatif',
    },
  })

  return true
}
