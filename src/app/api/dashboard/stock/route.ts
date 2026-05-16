import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['super_admin', 'manager', 'operateur_stock'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const [
      totalProducts,
      stockLevels,
      lowStockProducts,
      recentMovements,
    ] = await Promise.all([
      // Total produits
      db.product.count(),

      // Niveaux de stock globaux
      db.product.aggregate({
        _sum: {
          stockTotal: true,
          stockDispo: true,
          stockReserve: true,
          stockExpedie: true,
        },
      }),

      // Produits en stock faible (moins de 5 unités dispo)
      db.product.findMany({
        where: { stockDispo: { lt: 5 } },
        include: { shop: { select: { name: true } } },
        orderBy: { stockDispo: 'asc' },
        take: 20,
      }),

      // Mouvements récents
      db.stockMovement.findMany({
        include: {
          product: { select: { name: true, sku: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    return NextResponse.json({
      totalProducts,
      stockLevels: {
        total: stockLevels._sum.stockTotal || 0,
        dispo: stockLevels._sum.stockDispo || 0,
        reserve: stockLevels._sum.stockReserve || 0,
        expedie: stockLevels._sum.stockExpedie || 0,
      },
      lowStockProducts,
      recentMovements,
    })
  } catch (error) {
    console.error('Erreur dashboard stock:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
