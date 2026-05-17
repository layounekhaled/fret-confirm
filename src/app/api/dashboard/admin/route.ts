import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['super_admin', 'manager'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Total des commandes et par statut
    const [
      totalOrders,
      ordersByStatus,
      confirmedOrders,
      totalCA,
      ecotrackErrors,
      topShops,
      topAgents,
      ordersLast7Days,
      deliveryStats,
    ] = await Promise.all([
      db.order.count(),
      db.order.groupBy({
        by: ['statut'],
        _count: { statut: true },
      }),
      db.order.count({ where: { statut: 'confirmee' } }),
      db.order.aggregate({
        _sum: { montant: true },
        where: { statut: 'confirmee' },
      }),
      db.order.count({ where: { statut: 'erreur_ecotrack' } }),
      db.order.groupBy({
        by: ['shopId'],
        _count: { shopId: true },
        orderBy: { _count: { shopId: 'desc' } },
        take: 5,
      }),
      db.order.groupBy({
        by: ['assignedTo'],
        _count: { assignedTo: true },
        where: { statut: 'confirmee', assignedTo: { not: null } },
        orderBy: { _count: { assignedTo: 'desc' } },
        take: 5,
      }),
      getOrdersLast7Days(),
      getDeliveryStats(),
    ])

    // Enrichir top boutiques
    const topShopsWithNames = await Promise.all(
      topShops.map(async (s) => {
        const shop = await db.shop.findUnique({
          where: { id: s.shopId },
          select: { name: true },
        })
        return { shopId: s.shopId, name: shop?.name || 'Inconnu', count: s._count.shopId }
      })
    )

    // Enrichir top agents
    const topAgentsWithNames = await Promise.all(
      topAgents.map(async (a) => {
        const user = await db.user.findUnique({
          where: { id: a.assignedTo! },
          select: { name: true },
        })
        return { userId: a.assignedTo, name: user?.name || 'Inconnu', count: a._count.assignedTo }
      })
    )

    const confirmationRate = totalOrders > 0
      ? Math.round((confirmedOrders / totalOrders) * 100)
      : 0

    const statusMap: Record<string, number> = {}
    for (const s of ordersByStatus) {
      statusMap[s.statut] = s._count.statut
    }

    return NextResponse.json({
      totalOrders,
      ordersByStatus: statusMap,
      confirmationRate,
      caConfirmee: totalCA._sum.montant || 0,
      ecotrackErrors,
      topShops: topShopsWithNames,
      topAgents: topAgentsWithNames,
      ordersLast7Days,
      deliveryStats,
    })
  } catch (error) {
    console.error('Erreur dashboard admin:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function getOrdersLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const start = new Date(date.setHours(0, 0, 0, 0))
    const end = new Date(date.setHours(23, 59, 59, 999))

    const count = await db.order.count({
      where: { createdAt: { gte: start, lte: end } },
    })

    days.push({ date: start.toISOString().split('T')[0], count })
  }
  return days
}

async function getDeliveryStats() {
  const [
    ecotrackSent,
    customApiSent,
    apiErrors,
    providerByShop,
  ] = await Promise.all([
    db.order.count({ where: { deliveryProvider: 'ecotrack', statut: { in: ['envoyee_ecotrack', 'erreur_ecotrack'] } } }),
    db.order.count({ where: { deliveryProvider: 'custom', statut: { in: ['envoyee_api_externe', 'erreur_api_externe'] } } }),
    db.order.count({ where: { statut: { in: ['erreur_ecotrack', 'erreur_api_externe'] } } }),
    db.shop.groupBy({
      by: ['deliveryProvider'],
      _count: { deliveryProvider: true },
    }),
  ])

  const totalSent = ecotrackSent + customApiSent
  const errorRate = totalSent > 0 ? Math.round((apiErrors / totalSent) * 100) : 0

  const providerDistribution: Record<string, number> = {}
  for (const p of providerByShop) {
    providerDistribution[p.deliveryProvider] = p._count.deliveryProvider
  }

  return {
    ecotrackSent,
    customApiSent,
    totalSent,
    apiErrors,
    errorRate,
    providerDistribution,
  }
}
