import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { addStock } from '@/lib/stock'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const type = searchParams.get('type')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (productId) where.productId = productId
    if (type) where.type = type
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      }
    }

    const [movements, total] = await Promise.all([
      db.stockMovement.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, sku: true, shop: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.stockMovement.count({ where }),
    ])

    return NextResponse.json({
      movements,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Erreur liste mouvements:', error)
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
    const { productId, type, quantite, reference, notes } = body

    if (!productId || !type || !quantite) {
      return NextResponse.json(
        { error: 'Champs requis: productId, type, quantite' },
        { status: 400 }
      )
    }

    if (type === 'entree') {
      const success = await addStock(productId, Number(quantite), reference)
      if (!success) {
        return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
      }
    } else if (type === 'ajustement') {
      const { adjustStock } = await import('@/lib/stock')
      const success = await adjustStock(productId, Number(quantite), reference)
      if (!success) {
        return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
      }
    } else {
      // Autres types: créer directement le mouvement
      await db.stockMovement.create({
        data: {
          productId,
          type,
          quantite: Number(quantite),
          reference: reference || null,
          notes: notes || null,
        },
      })
    }

    return NextResponse.json({ message: 'Mouvement de stock créé' }, { status: 201 })
  } catch (error) {
    console.error('Erreur création mouvement:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
