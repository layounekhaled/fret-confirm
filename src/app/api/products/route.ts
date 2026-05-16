import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')

    // Les boutiques ne voient que leurs produits
    const filterShopId = payload.role === 'boutique' ? payload.shopId : shopId

    const where: Record<string, unknown> = {}
    if (filterShopId) where.shopId = filterShopId

    const products = await db.product.findMany({
      where,
      include: {
        shop: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Erreur liste produits:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['super_admin', 'manager', 'operateur_stock'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const {
      shopId,
      name,
      sku,
      barcode,
      weight,
      fragile,
      price,
      stockTotal,
    } = body

    if (!shopId || !name) {
      return NextResponse.json(
        { error: 'Champs requis: shopId, name' },
        { status: 400 }
      )
    }

    const total = Number(stockTotal) || 0

    const product = await db.product.create({
      data: {
        shopId,
        name,
        sku: sku || null,
        barcode: barcode || null,
        weight: weight ? Number(weight) : null,
        fragile: fragile || false,
        price: Number(price) || 0,
        stockTotal: total,
        stockDispo: total,
        stockReserve: 0,
        stockExpedie: 0,
      },
    })

    // Créer un mouvement de stock si stock initial
    if (total > 0) {
      await db.stockMovement.create({
        data: {
          productId: product.id,
          type: 'entree',
          quantite: total,
          reference: 'Stock initial',
        },
      })
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Erreur création produit:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
