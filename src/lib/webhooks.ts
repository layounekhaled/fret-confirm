import { db } from '@/lib/db'

type WebhookEvent = 'confirmee' | 'refusee' | 'envoyee_ecotrack'

export async function sendWebhook(
  shopId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const webhooks = await db.webhook.findMany({
    where: {
      shopId,
      event,
      isActive: true,
    },
  })

  for (const webhook of webhooks) {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          data,
        }),
      })

      await db.webhook.update({
        where: { id: webhook.id },
        data: {
          lastSentAt: new Date(),
          lastStatus: response.ok ? 'succes' : `erreur_${response.status}`,
        },
      })
    } catch {
      await db.webhook.update({
        where: { id: webhook.id },
        data: {
          lastSentAt: new Date(),
          lastStatus: 'erreur_reseau',
        },
      })
    }
  }
}
