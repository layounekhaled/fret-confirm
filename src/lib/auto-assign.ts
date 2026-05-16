import { db } from '@/lib/db'

export async function autoAssignOrder(orderId: string): Promise<{
  success: boolean
  assignedTo?: string
  error?: string
}> {
  // Récupérer les confirmateurs actifs avec leur charge actuelle
  const confirmateurs = await db.user.findMany({
    where: {
      role: 'confirmateur',
      isActive: true,
    },
    include: {
      assignedOrders: {
        where: {
          statut: { in: ['assignee', 'en_cours', 'rappel'] },
        },
      },
    },
  })

  if (confirmateurs.length === 0) {
    return { success: false, error: 'Aucun confirmateur disponible' }
  }

  // Trier par charge (nombre de commandes actives), puis par performance
  const sorted = confirmateurs.sort((a, b) => {
    const loadA = a.assignedOrders.length
    const loadB = b.assignedOrders.length
    return loadA - loadB
  })

  const bestConfirmateur = sorted[0]

  // Mettre à jour la commande
  await db.order.update({
    where: { id: orderId },
    data: {
      assignedTo: bestConfirmateur.id,
      statut: 'assignee',
    },
  })

  // Créer l'assignation
  await db.assignment.create({
    data: {
      orderId,
      userId: bestConfirmateur.id,
      type: 'automatique',
    },
  })

  // Créer le log
  await db.orderLog.create({
    data: {
      orderId,
      userId: bestConfirmateur.id,
      action: 'assignation_automatique',
      details: `Assigné automatiquement à ${bestConfirmateur.name}`,
    },
  })

  return { success: true, assignedTo: bestConfirmateur.id }
}
