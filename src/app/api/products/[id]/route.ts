import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    const product = await db.product.findUnique({
      where: { id },
      include: {
        shop: { select: { id: true, name: true } },
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Erreur détail produit:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['super_admin', 'manager', 'operateur_stock'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const product = await db.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }

    const allowedFields = ['name', 'sku', 'barcode', 'weight', 'fragile', 'price']
    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length > 0) {
      await db.product.update({ where: { id }, data: updateData })
    }

    const updatedProduct = await db.product.findUnique({ where: { id } })
    return NextResponse.json({ product: updatedProduct })
  } catch (error) {
    console.error('Erreur mise à jour produit:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['super_admin', 'manager'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params

    const product = await db.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }

    // Supprimer les mouvements de stock associés d'abord
    await db.stockMovement.deleteMany({ where: { productId: id } })
    await db.product.delete({ where: { id } })

    return NextResponse.json({ message: 'Produit supprimé' })
  } catch (error) {
    console.error('Erreur suppression produit:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
