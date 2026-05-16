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

    const order = await db.order.findUnique({
      where: { id },
      include: {
        shop: { select: { id: true, name: true, modeService: true } },
        assignee: { select: { id: true, name: true, email: true } },
        orderLogs: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        reminders: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        ecotrackLogs: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Commande introuvable' },
        { status: 404 }
      )
    }

    // Vérifier les permissions
    if (payload.role === 'boutique' && order.shopId !== payload.shopId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Erreur détail commande:', error)
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

    const { id } = await params
    const body = await request.json()

    const order = await db.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    // Vérifier les permissions
    if (payload.role === 'boutique') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    const logActions: string[] = []

    if (body.statut && body.statut !== order.statut) {
      updateData.statut = body.statut
      logActions.push(`Statut: ${order.statut} → ${body.statut}`)
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes
      logActions.push('Notes mises à jour')
    }

    if (body.assignedTo && body.assignedTo !== order.assignedTo) {
      updateData.assignedTo = body.assignedTo
      logActions.push(`Réassigné à ${body.assignedTo}`)

      // Créer l'assignation
      await db.assignment.create({
        data: {
          orderId: id,
          userId: body.assignedTo,
          assignedBy: payload.userId,
          type: 'manuel',
        },
      })
    }

    if (body.remarque !== undefined) {
      updateData.remarque = body.remarque
    }

    if (body.rappelDate) {
      updateData.rappelDate = new Date(body.rappelDate)
      logActions.push(`Rappel programmé: ${body.rappelDate}`)
    }

    if (Object.keys(updateData).length > 0) {
      await db.order.update({ where: { id }, data: updateData })
    }

    if (logActions.length > 0) {
      await db.orderLog.create({
        data: {
          orderId: id,
          userId: payload.userId,
          action: 'mise_a_jour',
          details: logActions.join(', '),
        },
      })
    }

    const updatedOrder = await db.order.findUnique({
      where: { id },
      include: {
        shop: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ order: updatedOrder })
  } catch (error) {
    console.error('Erreur mise à jour commande:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
