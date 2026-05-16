import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const payload = getAuthUser(request.headers)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (payload.role !== 'confirmateur') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const userId = payload.userId
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      todayAssigned,
      todayConfirmed,
      todayRefused,
      totalConfirmed,
      totalAssigned,
      pendingReminders,
      activeOrders,
    ] = await Promise.all([
      // Commandes assignées aujourd'hui
      db.order.count({
        where: {
          assignedTo: userId,
          createdAt: { gte: today },
        },
      }),

      // Confirmées aujourd'hui
      db.order.count({
        where: {
          assignedTo: userId,
          statut: 'confirmee',
          confirmedAt: { gte: today },
        },
      }),

      // Refusées aujourd'hui
      db.order.count({
        where: {
          assignedTo: userId,
          statut: 'refusee',
          updatedAt: { gte: today },
        },
      }),

      // Total confirmées (performance globale)
      db.order.count({
        where: { assignedTo: userId, statut: 'confirmee' },
      }),

      // Total assignées
      db.order.count({
        where: { assignedTo: userId },
      }),

      // Rappels en attente
      db.reminder.count({
        where: {
          userId,
          completed: false,
          dateRappel: { lte: new Date() },
        },
      }),

      // Commandes actives
      db.order.findMany({
        where: {
          assignedTo: userId,
          statut: { in: ['assignee', 'en_cours', 'rappel'] },
        },
        include: {
          shop: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      }),
    ])

    const performance = totalAssigned > 0
      ? Math.round((totalConfirmed / totalAssigned) * 100)
      : 0

    return NextResponse.json({
      todayAssigned,
      todayConfirmed,
      todayRefused,
      totalConfirmed,
      totalAssigned,
      performance,
      pendingReminders,
      activeOrders,
    })
  } catch (error) {
    console.error('Erreur dashboard confirmateur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
