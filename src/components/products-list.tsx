'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  weight: number | null
  fragile: boolean
  price: number
  stockTotal: number
  stockDispo: number
  stockReserve: number
  shop: { id: string; name: string }
}

interface Shop {
  id: string
  name: string
}

interface ProductsListProps {
  token: string
  userRole: string
  userShopId?: string | null
}

export function ProductsList({ token, userRole, userShopId }: ProductsListProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [shopFilter, setShopFilter] = useState(userShopId || 'all')
  const [form, setForm] = useState({
    shopId: '', name: '', sku: '', barcode: '', weight: '', fragile: false, price: '', stockTotal: '',
  })

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const params = new URLSearchParams()
    if (shopFilter !== 'all') params.set('shopId', shopFilter)
    fetch(`/api/products?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => d.products && setProducts(d.products))
      .catch(() => toast.error('Erreur'))
      .finally(() => setLoading(false))
  }, [token, shopFilter, refreshKey])

  useEffect(() => {
    if (userRole === 'super_admin' || userRole === 'manager' || userRole === 'operateur_stock') {
      fetch('/api/shops', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => d.shops && setShops(d.shops.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name }))))
        .catch(() => {})
    }
  }, [token, userRole])

  const openCreate = () => {
    setEditingProduct(null)
    setForm({ shopId: shops[0]?.id || '', name: '', sku: '', barcode: '', weight: '', fragile: false, price: '', stockTotal: '' })
    setDialogOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditingProduct(product)
    setForm({
      shopId: product.shop.id, name: product.name, sku: product.sku || '',
      barcode: product.barcode || '', weight: product.weight?.toString() || '',
      fragile: product.fragile, price: product.price.toString(), stockTotal: product.stockTotal.toString(),
    })
    setDialogOpen(true)
  }

  const saveProduct = async () => {
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      const body = {
        ...form,
        shopId: userRole === 'boutique' ? userShopId : form.shopId,
        weight: form.weight ? Number(form.weight) : null,
        price: Number(form.price) || 0,
        stockTotal: Number(form.stockTotal) || 0,
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(editingProduct ? 'Produit modifié' : 'Produit créé')
        setDialogOpen(false)
        setRefreshKey(k => k + 1)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success('Produit supprimé')
        setRefreshKey(k => k + 1)
      } else {
        toast.error('Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const stockColor = (dispo: number) => {
    if (dispo === 0) return 'text-red-600 bg-red-50'
    if (dispo < 5) return 'text-amber-600 bg-amber-50'
    return 'text-green-600 bg-green-50'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Produits</h2>
          <p className="text-muted-foreground">Gestion des produits</p>
        </div>
        <div className="flex items-center gap-2">
          {(userRole === 'super_admin' || userRole === 'manager' || userRole === 'operateur_stock') && shops.length > 0 && (
            <Select value={shopFilter} onValueChange={setShopFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Boutique" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les boutiques</SelectItem>
                {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Nom</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">SKU</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Code barre</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Poids</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Fragile</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Prix</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Stock dispo</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden sm:table-cell">Boutique</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 text-sm font-medium">{p.name}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{p.sku || '-'}</td>
                    <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{p.barcode || '-'}</td>
                    <td className="p-3 text-sm hidden lg:table-cell">{p.weight ? `${p.weight}kg` : '-'}</td>
                    <td className="p-3">
                      {p.fragile && <Badge className="bg-red-100 text-red-700 border-0 text-xs">Fragile</Badge>}
                    </td>
                    <td className="p-3 text-sm">{p.price.toLocaleString('fr-FR')} DA</td>
                    <td className="p-3">
                      <Badge className={`${stockColor(p.stockDispo)} border-0 text-xs`}>{p.stockDispo}</Badge>
                    </td>
                    <td className="p-3 text-sm hidden sm:table-cell">{p.shop.name}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteProduct(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              {(userRole !== 'boutique') && (
                <div className="col-span-2">
                  <Label>Boutique *</Label>
                  <Select value={form.shopId} onValueChange={v => setForm({ ...form, shopId: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
              <div><Label>Code barre</Label><Input value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></div>
              <div><Label>Poids (kg)</Label><Input type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
              <div><Label>Prix (DA)</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
              {!editingProduct && (
                <div><Label>Stock initial</Label><Input type="number" value={form.stockTotal} onChange={e => setForm({ ...form, stockTotal: e.target.value })} /></div>
              )}
              <div className="flex items-center gap-2 pt-6">
                <Checkbox checked={form.fragile} onCheckedChange={v => setForm({ ...form, fragile: !!v })} />
                <Label>Fragile</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveProduct}>{editingProduct ? 'Modifier' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
