import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { autoAssignOrder } from '@/lib/auto-assign'

export async function POST(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!['manager', 'super_admin'].includes(payload.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { orderId, userId, type } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Champ requis: orderId' },
        { status: 400 }
      )
    }

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    // Assignation automatique
    if (type === 'automatique' || !userId) {
      const result = await autoAssignOrder(orderId)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({
        message: 'Commande assignée automatiquement',
        assignedTo: result.assignedTo,
      })
    }

    // Assignation manuelle
    const confirmateur = await db.user.findUnique({
      where: { id: userId },
    })
    if (!confirmateur || !confirmateur.isActive || confirmateur.role !== 'confirmateur') {
      return NextResponse.json(
        { error: 'Confirmateur invalide ou inactif' },
        { status: 400 }
      )
    }

    await db.order.update({
      where: { id: orderId },
      data: {
        assignedTo: userId,
        statut: 'assignee',
      },
    })

    await db.assignment.create({
      data: {
        orderId,
        userId,
        assignedBy: payload.userId,
        type: 'manuel',
      },
    })

    await db.orderLog.create({
      data: {
        orderId,
        userId: payload.userId,
        action: 'assignation_manuelle',
        details: `Assigné manuellement à ${confirmateur.name}`,
      },
    })

    return NextResponse.json({
      message: 'Commande assignée manuellement',
      assignedTo: userId,
    })
  } catch (error) {
    console.error('Erreur assignation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
