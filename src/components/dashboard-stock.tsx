'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Package, Warehouse, AlertTriangle, ArrowUpDown } from 'lucide-react'

interface StockData {
  totalProducts: number
  stockLevels: {
    total: number
    dispo: number
    reserve: number
    expedie: number
  }
  lowStockProducts: Array<{
    id: string
    name: string
    stockTotal: number
    stockDispo: number
    stockReserve: number
    shop: { name: string }
  }>
  recentMovements: Array<{
    id: string
    type: string
    quantite: number
    reference: string | null
    notes: string | null
    createdAt: string
    product: { name: string; sku: string | null }
  }>
}

const typeLabels: Record<string, string> = {
  entree: 'Entrée', sortie: 'Sortie', retour: 'Retour',
  ajustement: 'Ajustement', reservation: 'Réservation', expedition: 'Expédition',
}

const typeColors: Record<string, string> = {
  entree: 'bg-green-100 text-green-700',
  sortie: 'bg-red-100 text-red-700',
  retour: 'bg-blue-100 text-blue-700',
  ajustement: 'bg-amber-100 text-amber-700',
  reservation: 'bg-purple-100 text-purple-700',
  expedition: 'bg-teal-100 text-teal-700',
}

export function DashboardStock({ token }: { token: string }) {
  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stock', {
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
        <h2 className="text-2xl font-bold tracking-tight">Tableau de bord Stock</h2>
        <p className="text-muted-foreground">Vue d&apos;ensemble du stock</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total produits</p>
                <p className="text-2xl font-bold mt-1">{data.totalProducts}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <Package className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock disponible</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">{data.stockLevels.dispo.toLocaleString('fr-FR')}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <Warehouse className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alertes rupture</p>
                <p className="text-2xl font-bold mt-1 text-amber-600">{data.lowStockProducts.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock réservé</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">{data.stockLevels.reserve.toLocaleString('fr-FR')}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <ArrowUpDown className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Produits en stock faible
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune alerte de stock</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.shop.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={p.stockDispo === 0 ? 'bg-red-100 text-red-700 border-0' : 'bg-amber-100 text-amber-700 border-0'}>
                      {p.stockDispo === 0 ? 'Rupture' : `${p.stockDispo} dispo`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent movements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" /> Mouvements récents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun mouvement récent</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.recentMovements.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Badge className={`${typeColors[m.type] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                      {typeLabels[m.type] || m.type}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{m.product.name}</p>
                      {m.reference && <p className="text-xs text-muted-foreground">{m.reference}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{m.quantite > 0 ? '+' : ''}{m.quantite}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                    </p>
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
