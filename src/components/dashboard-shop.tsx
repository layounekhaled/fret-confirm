'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, CheckCircle, XCircle, DollarSign, Key, Truck, Package, AlertTriangle, Copy, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ShopDashboardData {
  totalOrders: number
  confirmedOrders: number
  refusedOrders: number
  ca: number
  confirmationRate: number
  shop: {
    id: string
    name: string
    apiKey: string
    modeService: string
    ecotrackToken: string | null
    ecotrackUrl: string | null
    prixConfirmation: number
    prixStockage: number
    prixEmballage: number
  }
  stockSummary: {
    totalProducts: number
    totalStock: number
    stockDispo: number
    stockReserve: number
    lowStockProducts: { id: string; name: string; stockTotal: number; stockDispo: number; stockReserve: number }[]
  }
}

export function DashboardShop({ token }: { token: string }) {
  const [data, setData] = useState<ShopDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/shop', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copié dans le presse-papiers')
  }

  if (loading) return <DashboardSkeleton />

  if (!data) return <div className="p-6 text-center text-muted-foreground">Erreur de chargement</div>

  const modeLabels: Record<string, string> = {
    confirmation_only: 'Confirmation uniquement',
    fulfillment_only: 'Préparation uniquement',
    full_service: 'Service complet',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tableau de bord</h2>
        <p className="text-muted-foreground">{data.shop.name}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total commandes</p>
                <p className="text-2xl font-bold mt-1">{data.totalOrders}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Confirmées</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{data.confirmedOrders}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Refusées</p>
                <p className="text-2xl font-bold mt-1 text-red-600">{data.refusedOrders}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CA confirmé</p>
                <p className="text-2xl font-bold mt-1">{data.ca.toLocaleString('fr-FR')} DA</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Taux de confirmation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Taux de confirmation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={data.confirmationRate} className="flex-1 h-3" />
            <span className="text-2xl font-bold text-emerald-600">{data.confirmationRate}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Clé API */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" /> Clé API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-mono truncate">
                {data.shop.apiKey}
              </code>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(data.shop.apiKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Config Ecotrack */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> Configuration Ecotrack
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Token</p>
              <code className="text-sm bg-slate-100 px-2 py-1 rounded block truncate">
                {data.shop.ecotrackToken || 'Non configuré'}
              </code>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">URL</p>
              <code className="text-sm bg-slate-100 px-2 py-1 rounded block truncate">
                {data.shop.ecotrackUrl || 'Non configuré'}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Résumé Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-4">
            <div className="text-center p-3 rounded-lg bg-slate-50">
              <p className="text-2xl font-bold">{data.stockSummary.totalProducts}</p>
              <p className="text-xs text-muted-foreground">Produits</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50">
              <p className="text-2xl font-bold text-emerald-600">{data.stockSummary.stockDispo}</p>
              <p className="text-xs text-muted-foreground">Disponible</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-amber-50">
              <p className="text-2xl font-bold text-amber-600">{data.stockSummary.stockReserve}</p>
              <p className="text-xs text-muted-foreground">Réservé</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50">
              <p className="text-2xl font-bold text-blue-600">{data.stockSummary.totalStock}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
          {data.stockSummary.lowStockProducts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" /> Alertes stock faible
              </p>
              {data.stockSummary.lowStockProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded bg-amber-50">
                  <span>{p.name}</span>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">{p.stockDispo} dispo</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mode service + Prix */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mode de service</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-sm">
              {modeLabels[data.shop.modeService] || data.shop.modeService}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Confirmation</span>
              <span className="font-medium">{data.shop.prixConfirmation} DA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stockage</span>
              <span className="font-medium">{data.shop.prixStockage} DA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Emballage</span>
              <span className="font-medium">{data.shop.prixEmballage} DA</span>
            </div>
          </CardContent>
        </Card>
      </div>
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
