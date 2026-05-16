import { db } from '@/lib/db'
import type { Order } from '@prisma/client'

export async function checkExactDuplicate(
  shopId: string,
  reference: string,
  telephone: string
): Promise<boolean> {
  const count = await db.order.count({
    where: {
      shopId,
      reference,
      telephone,
      statut: { notIn: ['annulee', 'refusee'] },
    },
  })
  return count > 0
}

export async function checkProbableDuplicate(
  shopId: string,
  telephone: string,
  produit: string,
  montant: number
): Promise<Order[]> {
  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)

  const orders = await db.order.findMany({
    where: {
      shopId,
      telephone,
      produit,
      montant,
      createdAt: { gte: yesterday },
      statut: { notIn: ['annulee', 'refusee'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  return orders
}

export async function checkRecurrentClient(
  shopId: string,
  telephone: string
): Promise<Order[]> {
  const orders = await db.order.findMany({
    where: {
      shopId,
      telephone,
      statut: { notIn: ['annulee'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return orders
}
