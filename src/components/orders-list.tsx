'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Search, Download, Filter, X } from 'lucide-react'
import { toast } from 'sonner'

interface Order {
  id: string
  reference: string
  nomClient: string
  telephone: string
  produit: string
  montant: number
  wilaya: string | null
  statut: string
  createdAt: string
  shop: { id: string; name: string }
  assignee: { id: string; name: string } | null
}

interface OrdersListProps {
  token: string
  userRole: string
  onSelectOrder: (orderId: string) => void
}

const statusBadgeClasses: Record<string, string> = {
  nouvelle: 'bg-blue-100 text-blue-700',
  assignee: 'bg-cyan-100 text-cyan-700',
  en_cours: 'bg-yellow-100 text-yellow-700',
  confirmee: 'bg-green-100 text-green-700',
  refusee: 'bg-red-100 text-red-700',
  injoignable: 'bg-orange-100 text-orange-700',
  rappel: 'bg-purple-100 text-purple-700',
  doublon_suspect: 'bg-pink-100 text-pink-700',
  annulee: 'bg-gray-100 text-gray-700',
  en_preparation: 'bg-teal-100 text-teal-700',
  emballée: 'bg-emerald-100 text-emerald-700',
  prete_expedition: 'bg-lime-100 text-lime-700',
  envoyee_ecotrack: 'bg-green-800 text-white',
  erreur_ecotrack: 'bg-red-800 text-white',
  rupture_stock: 'bg-amber-100 text-amber-700',
}

const statusLabels: Record<string, string> = {
  nouvelle: 'Nouvelle', assignee: 'Assignée', en_cours: 'En cours',
  confirmee: 'Confirmée', refusee: 'Refusée', injoignable: 'Injoignable',
  rappel: 'Rappel', doublon_suspect: 'Doublon', annulee: 'Annulée',
  en_preparation: 'En préparation', emballée: 'Emballée', prete_expedition: 'Prête expéd.',
  envoyee_ecotrack: 'Envoyée', erreur_ecotrack: 'Erreur Eco.', rupture_stock: 'Rupture stock',
}

export function OrdersList({ token, userRole, onSelectOrder }: OrdersListProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [shopFilter, setShopFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [shops, setShops] = useState<Array<{ id: string; name: string }>>([])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (shopFilter !== 'all') params.set('shopId', shopFilter)
      params.set('page', page.toString())
      params.set('limit', '20')

      const res = await fetch(`/api/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.orders) {
        setOrders(data.orders)
        setTotalPages(data.pagination?.totalPages || 1)
      }
    } catch {
      toast.error('Erreur de chargement des commandes')
    } finally {
      setLoading(false)
    }
  }, [token, search, statusFilter, shopFilter, page])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Fetch shops for filter
  useEffect(() => {
    if (userRole === 'super_admin' || userRole === 'manager') {
      fetch('/api/shops', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => d.shops && setShops(d.shops.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))))
        .catch(() => {})
    }
  }, [token, userRole])

  const exportCSV = () => {
    const headers = ['Référence', 'Client', 'Téléphone', 'Produit', 'Montant', 'Wilaya', 'Statut', 'Boutique', 'Date']
    const rows = orders.map(o => [
      o.reference, o.nomClient, o.telephone, o.produit,
      o.montant.toString(), o.wilaya || '', statusLabels[o.statut] || o.statut,
      o.shop.name, new Date(o.createdAt).toLocaleDateString('fr-FR'),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commandes_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export CSV téléchargé')
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setShopFilter('all')
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Commandes</h2>
          <p className="text-muted-foreground">Gestion des commandes</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="shrink-0">
          <Download className="h-4 w-4 mr-2" /> Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher réf, client, téléphone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(userRole === 'super_admin' || userRole === 'manager') && shops.length > 0 && (
              <Select value={shopFilter} onValueChange={(v) => { setShopFilter(v); setPage(1) }}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Boutique" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les boutiques</SelectItem>
                  {shops.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(search || statusFilter !== 'all' || shopFilter !== 'all') && (
              <Button variant="ghost" size="icon" onClick={clearFilters} title="Effacer les filtres">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Réf</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Client</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Téléphone</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Produit</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Montant</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden sm:table-cell">Wilaya</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Statut</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Boutique</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden xl:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b">
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="p-3"><Skeleton className="h-4 w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    Aucune commande trouvée
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr
                    key={order.id}
                    className="border-b hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => onSelectOrder(order.id)}
                  >
                    <td className="p-3 text-sm font-medium">{order.reference}</td>
                    <td className="p-3 text-sm">{order.nomClient}</td>
                    <td className="p-3 text-sm hidden md:table-cell">{order.telephone}</td>
                    <td className="p-3 text-sm hidden lg:table-cell truncate max-w-32">{order.produit}</td>
                    <td className="p-3 text-sm font-medium">{order.montant.toLocaleString('fr-FR')} DA</td>
                    <td className="p-3 text-sm hidden sm:table-cell">{order.wilaya || '-'}</td>
                    <td className="p-3">
                      <Badge className={`${statusBadgeClasses[order.statut] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                        {statusLabels[order.statut] || order.statut}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm hidden lg:table-cell">{order.shop.name}</td>
                    <td className="p-3 text-xs text-muted-foreground hidden xl:table-cell">
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
}
