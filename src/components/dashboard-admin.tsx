'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, TrendingUp, DollarSign, AlertTriangle, Truck, Globe, Zap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface DashboardData {
  totalOrders: number
  ordersByStatus: Record<string, number>
  confirmationRate: number
  caConfirmee: number
  ecotrackErrors: number
  topShops: { shopId: string; name: string; count: number }[]
  topAgents: { userId: string; name: string; count: number }[]
  ordersLast7Days: { date: string; count: number }[]
  deliveryStats: {
    ecotrackSent: number
    customApiSent: number
    totalSent: number
    apiErrors: number
    errorRate: number
    providerDistribution: Record<string, number>
  }
}

const statusColors: Record<string, string> = {
  nouvelle: '#3b82f6', assignee: '#06b6d4', en_cours: '#eab308',
  confirmee: '#22c55e', refusee: '#ef4444', injoignable: '#f97316',
  rappel: '#a855f7', doublon_suspect: '#ec4899', annulee: '#6b7280',
  en_preparation: '#14b8a6', emballee: '#10b981', prete_expedition: '#84cc16',
  envoyee_ecotrack: '#15803d', erreur_ecotrack: '#b91c1c', rupture_stock: '#d97706',
  envoyee_api_externe: '#0d9488', erreur_api_externe: '#be123c',
}

const statusLabels: Record<string, string> = {
  nouvelle: 'Nouvelle', assignee: 'Assignée', en_cours: 'En cours',
  confirmee: 'Confirmée', refusee: 'Refusée', injoignable: 'Injoignable',
  rappel: 'Rappel', doublon_suspect: 'Doublon', annulee: 'Annulée',
  en_preparation: 'En préparation', emballee: 'Emballée', prete_expedition: 'Prête expéd.',
  envoyee_ecotrack: 'Envoyée Eco.', erreur_ecotrack: 'Erreur Eco.', rupture_stock: 'Rupture',
  envoyee_api_externe: 'Envoyée API', erreur_api_externe: 'Erreur API',
}

export function DashboardAdmin({ token }: { token: string }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/admin', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <DashboardSkeleton />
  if (!data) return <div className="p-6 text-center text-muted-foreground">Erreur de chargement</div>

  const pieData = Object.entries(data.ordersByStatus || {}).map(([statut, count]) => ({
    name: statusLabels[statut] || statut,
    value: count,
    color: statusColors[statut] || '#6b7280',
  }))

  const barData = data.ordersLast7Days.map(d => ({
    date: new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
    commandes: d.count,
  }))

  const ds = data.deliveryStats || { ecotrackSent: 0, customApiSent: 0, totalSent: 0, apiErrors: 0, errorRate: 0 }

  const providerData = [
    { name: 'Ecotrack', value: ds.ecotrackSent, color: '#10b981' },
    { name: 'API Externe', value: ds.customApiSent, color: '#0d9488' },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tableau de bord</h2>
        <p className="text-muted-foreground">Vue d&apos;ensemble de la plateforme FRET.CONFIRM</p>
      </div>

      {/* Stats Cards - Ligne 1 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total commandes" value={data.totalOrders.toLocaleString('fr-FR')} icon={ShoppingCart} color="emerald" />
        <StatCard title="Taux de confirmation" value={`${data.confirmationRate}%`} icon={TrendingUp} color="emerald" />
        <StatCard title="CA confirmé" value={`${data.caConfirmee.toLocaleString('fr-FR')} DA`} icon={DollarSign} color="emerald" />
        <StatCard title="Erreurs livraison" value={(data.ecotrackErrors + (ds.apiErrors - data.ecotrackErrors || 0)).toString()} icon={AlertTriangle} color="red" />
      </div>

      {/* Stats Cards - Ligne 2 : Routage */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Envoyées Ecotrack" value={ds.ecotrackSent.toString()} icon={Truck} color="emerald" />
        <StatCard title="Envoyées API externe" value={ds.customApiSent.toString()} icon={Globe} color="teal" />
        <StatCard title="Total expédiées" value={ds.totalSent.toString()} icon={Zap} color="emerald" />
        <StatCard title="Taux erreur API" value={`${ds.errorRate}%`} icon={AlertTriangle} color={ds.errorRate > 10 ? 'red' : 'emerald'} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commandes - 7 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="commandes" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Distribution + Top lists */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {providerData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4" /> Prestataires livraison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={providerData} cx="50%" cy="50%" outerRadius={60} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}>
                      {providerData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Boutiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topShops.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
              {data.topShops.map((shop, i) => (
                <div key={shop.shopId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{i + 1}</span>
                    <span className="text-sm font-medium">{shop.name}</span>
                  </div>
                  <Badge variant="secondary">{shop.count} cmd</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topAgents.length === 0 && <p className="text-sm text-muted-foreground">Aucune donnée</p>}
              {data.topAgents.map((agent, i) => (
                <div key={agent.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{i + 1}</span>
                    <span className="text-sm font-medium">{agent.name}</span>
                  </div>
                  <Badge variant="secondary">{agent.count} conf.</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ElementType; color: string }) {
  const bgColor = color === 'red' ? 'bg-red-50' : color === 'teal' ? 'bg-teal-50' : 'bg-emerald-50'
  const iconColor = color === 'red' ? 'text-red-600' : color === 'teal' ? 'text-teal-600' : 'text-emerald-600'
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bgColor}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-72 w-full" /></CardContent></Card>
        ))}
      </div>
    </div>
  )
}
