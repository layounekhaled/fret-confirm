import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (payload.role !== 'boutique' || !payload.shopId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const shopId = payload.shopId

    const [
      totalOrders,
      confirmedOrders,
      refusedOrders,
      caData,
      shop,
      products,
    ] = await Promise.all([
      db.order.count({ where: { shopId } }),
      db.order.count({ where: { shopId, statut: 'confirmee' } }),
      db.order.count({ where: { shopId, statut: 'refusee' } }),
      db.order.aggregate({
        _sum: { montant: true },
        where: { shopId, statut: 'confirmee' },
      }),
      db.shop.findUnique({
        where: { id: shopId },
        select: {
          id: true,
          name: true,
          apiKey: true,
          modeService: true,
          ecotrackToken: true,
          ecotrackUrl: true,
          prixConfirmation: true,
          prixStockage: true,
          prixEmballage: true,
        },
      }),
      db.product.findMany({
        where: { shopId },
        select: {
          id: true,
          name: true,
          stockTotal: true,
          stockDispo: true,
          stockReserve: true,
        },
      }),
    ])

    const confirmationRate = totalOrders > 0
      ? Math.round((confirmedOrders / totalOrders) * 100)
      : 0

    const stockSummary = {
      totalProducts: products.length,
      totalStock: products.reduce((sum, p) => sum + p.stockTotal, 0),
      stockDispo: products.reduce((sum, p) => sum + p.stockDispo, 0),
      stockReserve: products.reduce((sum, p) => sum + p.stockReserve, 0),
      lowStockProducts: products.filter(p => p.stockDispo < 5),
    }

    return NextResponse.json({
      totalOrders,
      confirmedOrders,
      refusedOrders,
      ca: caData._sum.montant || 0,
      confirmationRate,
      shop,
      stockSummary,
    })
  } catch (error) {
    console.error('Erreur dashboard boutique:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
