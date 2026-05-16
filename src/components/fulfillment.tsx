'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Order {
  id: string
  reference: string
  nomClient: string
  produit: string
  quantite: number
  statut: string
  shop: { id: string; name: string }
}

const pipelineStatuses = [
  { key: 'en_preparation', label: 'À préparer', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { key: 'emballée', label: 'Emballée', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { key: 'prete_expedition', label: 'Prête expédition', color: 'bg-lime-100 text-lime-700 border-lime-200' },
  { key: 'envoyee_ecotrack', label: 'Envoyée', color: 'bg-green-100 text-green-700 border-green-200' },
]

const statusLabels: Record<string, string> = {
  en_preparation: 'En préparation', emballée: 'Emballée', prete_expedition: 'Prête expéd.', envoyee_ecotrack: 'Envoyée',
}

const nextStatusMap: Record<string, string> = {
  en_preparation: 'emballée',
  emballée: 'prete_expedition',
  prete_expedition: 'envoyee_ecotrack',
}

export function Fulfillment({ token }: { token: string }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    Promise.all(
      pipelineStatuses.map(s =>
        fetch(`/api/orders?status=${s.key}&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.json())
          .then(d => ({ status: s.key, orders: d.orders || [] }))
          .catch(() => ({ status: s.key, orders: [] }))
      )
    ).then(results => {
      const allOrders: Order[] = []
      results.forEach(r => allOrders.push(...r.orders))
      setOrders(allOrders)
    }).finally(() => setLoading(false))
  }, [token, refreshKey])

  const advanceOrder = async (orderId: string, currentStatus: string) => {
    const next = nextStatusMap[currentStatus]
    if (!next) return

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ statut: next }),
      })
      if (res.ok) {
        toast.success(`Commande passée en : ${statusLabels[next]}`)
        setRefreshKey(k => k + 1)
      } else {
        toast.error('Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const ordersByStatus = (status: string) => orders.filter(o => o.statut === status)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Préparation</h2>
        <p className="text-muted-foreground">Pipeline de préparation des commandes</p>
      </div>

      {/* Pipeline overview */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {pipelineStatuses.map((stage) => (
          <Card key={stage.key} className={`${stage.color} border`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {stage.label}
                <Badge variant="secondary" className="bg-white/60">{ordersByStatus(stage.key).length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[...Array(2)].map((_, j) => <Skeleton key={j} className="h-12 w-full" />)}</div>
              ) : ordersByStatus(stage.key).length === 0 ? (
                <p className="text-sm text-center py-4 opacity-60">Aucune commande</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {ordersByStatus(stage.key).map(order => (
                    <div key={order.id} className="bg-white/80 rounded-lg p-2 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{order.reference}</p>
                          <p className="text-xs text-muted-foreground">{order.nomClient} - {order.produit}</p>
                          <p className="text-xs text-muted-foreground">{order.shop.name}</p>
                        </div>
                        {nextStatusMap[order.statut] && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => advanceOrder(order.id, order.statut)}
                            title={`Passer en ${statusLabels[nextStatusMap[order.statut]]}`}
                          >
                            {order.statut === 'prete_expedition' ? <CheckCircle className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
