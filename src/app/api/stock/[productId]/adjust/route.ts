import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { adjustStock } from '@/lib/stock'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['super_admin', 'manager', 'operateur_stock'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { productId } = await params
    const body = await request.json()
    const { newTotal, reason } = body

    if (newTotal === undefined || newTotal === null) {
      return NextResponse.json(
        { error: 'Champ requis: newTotal' },
        { status: 400 }
      )
    }

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }

    const success = await adjustStock(productId, Number(newTotal), reason)
    if (!success) {
      return NextResponse.json({ error: 'Erreur ajustement stock' }, { status: 500 })
    }

    const updatedProduct = await db.product.findUnique({ where: { id: productId } })
    return NextResponse.json({ product: updatedProduct })
  } catch (error) {
    console.error('Erreur ajustement stock:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
