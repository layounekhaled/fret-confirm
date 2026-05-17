import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { testExternalAPI } from '@/lib/delivery-router'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['super_admin', 'manager', 'boutique'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await params

    const result = await testExternalAPI(id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erreur test API:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
