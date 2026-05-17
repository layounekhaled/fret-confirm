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

    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const provider = searchParams.get('provider')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (shopId) where.shopId = shopId
    if (provider) where.provider = provider
    if (status) where.status = status

    const logs = await db.deliveryLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        order: { select: { id: true, reference: true, nomClient: true } },
        shop: { select: { id: true, name: true } },
      },
    })

    // Stats résumé
    const [ecotrackCount, customCount, errorCount] = await Promise.all([
      db.deliveryLog.count({ where: { provider: 'ecotrack', ...where } }),
      db.deliveryLog.count({ where: { provider: 'custom', ...where } }),
      db.deliveryLog.count({ where: { status: 'error', ...where } }),
    ])

    return NextResponse.json({
      logs,
      stats: {
        ecotrackCount,
        customCount,
        errorCount,
        total: ecotrackCount + customCount,
        errorRate: (ecotrackCount + customCount) > 0
          ? Math.round((errorCount / (ecotrackCount + customCount)) * 100)
          : 0,
      },
    })
  } catch (error) {
    console.error('Erreur delivery logs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
