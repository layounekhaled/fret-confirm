import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
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

    const shop = await db.shop.findUnique({ where: { id } })
    if (!shop) {
      return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
    }

    const newApiKey = `fret_${uuidv4().replace(/-/g, '')}`

    await db.shop.update({
      where: { id },
      data: { apiKey: newApiKey },
    })

    // Désactiver les anciennes clés API
    await db.apiKey.updateMany({
      where: { shopId: id, isActive: true },
      data: { isActive: false },
    })

    // Créer une nouvelle clé dans la table ApiKey
    await db.apiKey.create({
      data: {
        shopId: id,
        key: newApiKey,
        name: 'Clé régénérée',
      },
    })

    return NextResponse.json({
      message: 'Clé API régénérée avec succès',
      apiKey: newApiKey,
    })
  } catch (error) {
    console.error('Erreur régénération clé:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
