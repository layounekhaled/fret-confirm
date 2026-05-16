'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, AlertTriangle, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  sku: string | null
  stockTotal: number
  stockDispo: number
  stockReserve: number
  stockExpedie: number
  shop: { id: string; name: string }
}

interface Movement {
  id: string
  type: string
  quantite: number
  reference: string | null
  notes: string | null
  createdAt: string
  product: { name: string; sku: string | null; shop: { name: string } }
}

const typeLabels: Record<string, string> = {
  entree: 'Entrée', sortie: 'Sortie', retour: 'Retour',
  ajustement: 'Ajustement', reservation: 'Réservation', expedition: 'Expédition',
}

const typeColors: Record<string, string> = {
  entree: 'bg-green-100 text-green-700', sortie: 'bg-red-100 text-red-700',
  retour: 'bg-blue-100 text-blue-700', ajustement: 'bg-amber-100 text-amber-700',
  reservation: 'bg-purple-100 text-purple-700', expedition: 'bg-teal-100 text-teal-700',
}

export function StockManagement({ token }: { token: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [moveType, setMoveType] = useState('entree')
  const [moveQty, setMoveQty] = useState('')
  const [moveRef, setMoveRef] = useState('')
  const [moveNotes, setMoveNotes] = useState('')

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    Promise.all([
      fetch('/api/products', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/stock/movements?limit=20', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([productsData, movementsData]) => {
        if (productsData.products) setProducts(productsData.products)
        if (movementsData.movements) setMovements(movementsData.movements)
      })
      .catch(() => toast.error('Erreur'))
      .finally(() => setLoading(false))
  }, [token, refreshKey])

  const addMovement = async () => {
    if (!selectedProduct || !moveQty) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    try {
      const res = await fetch('/api/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: selectedProduct, type: moveType, quantite: Number(moveQty),
          reference: moveRef, notes: moveNotes,
        }),
      })
      if (res.ok) {
        toast.success('Mouvement de stock créé')
        setDialogOpen(false)
        setSelectedProduct('')
        setMoveQty('')
        setMoveRef('')
        setMoveNotes('')
        setRefreshKey(k => k + 1)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const stockColor = (dispo: number) => {
    if (dispo === 0) return 'text-red-700 bg-red-100'
    if (dispo < 5) return 'text-amber-700 bg-amber-100'
    return 'text-green-700 bg-green-100'
  }

  const lowStockProducts = products.filter(p => p.stockDispo < 5)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion du Stock</h2>
          <p className="text-muted-foreground">Suivi des niveaux de stock</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Mouvement de stock
        </Button>
      </div>

      {/* Low stock alerts */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" /> Alertes stock faible ({lowStockProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded bg-white border border-amber-100">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.shop.name}</p>
                  </div>
                  <Badge className={`${stockColor(p.stockDispo)} border-0`}>
                    {p.stockDispo === 0 ? 'Rupture' : `${p.stockDispo} dispo`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Produit</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden sm:table-cell">Boutique</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Total</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Dispo</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Réservé</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Expédié</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={6} className="p-3"><Skeleton className="h-4 w-full" /></td></tr>
                ))
              ) : products.map(p => (
                <tr key={p.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 text-sm font-medium">{p.name}</td>
                  <td className="p-3 text-sm hidden sm:table-cell">{p.shop.name}</td>
                  <td className="p-3 text-sm">{p.stockTotal}</td>
                  <td className="p-3"><Badge className={`${stockColor(p.stockDispo)} border-0 text-xs`}>{p.stockDispo}</Badge></td>
                  <td className="p-3 text-sm text-blue-600 hidden md:table-cell">{p.stockReserve}</td>
                  <td className="p-3 text-sm text-teal-600 hidden lg:table-cell">{p.stockExpedie}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent movements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" /> Mouvements récents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun mouvement</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {movements.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <Badge className={`${typeColors[m.type] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                      {typeLabels[m.type] || m.type}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{m.product.name}</p>
                      <p className="text-xs text-muted-foreground">{m.product.shop.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{m.quantite > 0 ? '+' : ''}{m.quantite}</p>
                    <p className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movement dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau mouvement de stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Produit *</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.shop.name})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={moveType} onValueChange={setMoveType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entree">Entrée</SelectItem>
                  <SelectItem value="ajustement">Ajustement</SelectItem>
                  <SelectItem value="sortie">Sortie</SelectItem>
                  <SelectItem value="retour">Retour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantité *</Label><Input type="number" value={moveQty} onChange={e => setMoveQty(e.target.value)} /></div>
            <div><Label>Référence</Label><Input value={moveRef} onChange={e => setMoveRef(e.target.value)} /></div>
            <div><Label>Notes</Label><Input value={moveNotes} onChange={e => setMoveNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={addMovement}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
