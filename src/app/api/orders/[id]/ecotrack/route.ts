import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { retryEcotrack } from '@/lib/ecotrack'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['manager', 'super_admin', 'confirmateur'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params

    const result = await retryEcotrack(id)

    if (result.success) {
      return NextResponse.json({
        message: 'Commande envoyée à Ecotrack avec succès',
        tracking: result.tracking,
      })
    } else {
      return NextResponse.json(
        {
          error: 'Erreur lors de l\'envoi à Ecotrack',
          details: result.error,
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Erreur ecotrack retry:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
