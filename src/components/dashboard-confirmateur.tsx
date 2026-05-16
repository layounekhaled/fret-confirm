'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingCart, CheckCircle, Bell, TrendingUp, Phone, MessageCircle } from 'lucide-react'

interface ConfirmateurData {
  todayAssigned: number
  todayConfirmed: number
  todayRefused: number
  totalConfirmed: number
  totalAssigned: number
  performance: number
  pendingReminders: number
  activeOrders: Array<{
    id: string
    reference: string
    nomClient: string
    telephone: string
    produit: string
    montant: number
    statut: string
    shop: { name: string }
  }>
}

const statusBadgeClasses: Record<string, string> = {
  nouvelle: 'bg-blue-100 text-blue-700',
  assignee: 'bg-cyan-100 text-cyan-700',
  en_cours: 'bg-yellow-100 text-yellow-700',
  confirmee: 'bg-green-100 text-green-700',
  refusee: 'bg-red-100 text-red-700',
  injoignable: 'bg-orange-100 text-orange-700',
  rappel: 'bg-purple-100 text-purple-700',
}

const statusLabels: Record<string, string> = {
  nouvelle: 'Nouvelle', assignee: 'Assignée', en_cours: 'En cours',
  confirmee: 'Confirmée', refusee: 'Refusée', injoignable: 'Injoignable',
  rappel: 'Rappel',
}

export function DashboardConfirmateur({ token }: { token: string }) {
  const [data, setData] = useState<ConfirmateurData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/confirmateur', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <DashboardSkeleton />
  if (!data) return <div className="p-6 text-center text-muted-foreground">Erreur de chargement</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tableau de bord</h2>
        <p className="text-muted-foreground">Votre activité du jour</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Commandes du jour</p>
                <p className="text-2xl font-bold mt-1">{data.todayAssigned}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <ShoppingCart className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confirmées aujourd&apos;hui</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{data.todayConfirmed}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rappels en attente</p>
                <p className="text-2xl font-bold mt-1 text-amber-600">{data.pendingReminders}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                <Bell className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Performance</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{data.performance}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commandes actives</CardTitle>
        </CardHeader>
        <CardContent>
          {data.activeOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune commande active</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data.activeOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{order.reference}</span>
                      <Badge className={`${statusBadgeClasses[order.statut] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                        {statusLabels[order.statut] || order.statut}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {order.nomClient} - {order.produit} - {order.montant.toLocaleString('fr-FR')} DA
                    </p>
                    <p className="text-xs text-muted-foreground">{order.shop.name}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`tel:${order.telephone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={`https://wa.me/${order.telephone.replace(/^0/, '213')}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    </div>
  )
}
