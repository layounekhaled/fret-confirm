'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Edit, Copy, RefreshCw, Eye, Truck, Globe, Zap, Send } from 'lucide-react'
import { toast } from 'sonner'

interface Shop {
  id: string
  name: string
  responsible: string
  phone: string
  email: string
  address: string | null
  isActive: boolean
  apiKey: string
  modeService: string
  deliveryProvider: string
  deliveryMode: string
  ecotrackToken: string | null
  ecotrackUrl: string | null
  customApiUrl: string | null
  customApiMethod: string
  customApiHeaders: string | null
  customApiBodyTemplate: string | null
  customApiAuthType: string
  customApiAuthToken: string | null
  customApiMapping: string | null
  autoSendAfterConfirmation: boolean
  createdAt: string
  _count: { orders: number; products: number }
}

const modeLabels: Record<string, string> = {
  confirmation_only: 'Confirmation',
  fulfillment_only: 'Préparation',
  full_service: 'Service complet',
}

const modeColors: Record<string, string> = {
  confirmation_only: 'bg-emerald-100 text-emerald-700',
  fulfillment_only: 'bg-blue-100 text-blue-700',
  full_service: 'bg-purple-100 text-purple-700',
}

const providerLabels: Record<string, string> = {
  ecotrack: 'Ecotrack',
  custom_api: 'API Externe',
}

const providerColors: Record<string, string> = {
  ecotrack: 'bg-emerald-100 text-emerald-700',
  custom_api: 'bg-teal-100 text-teal-700',
}

const defaultForm = {
  name: '', responsible: '', phone: '', email: '', address: '',
  modeService: 'confirmation_only',
  deliveryProvider: 'ecotrack', deliveryMode: 'internal',
  ecotrackToken: '', ecotrackUrl: '',
  customApiUrl: '', customApiMethod: 'POST',
  customApiHeaders: '', customApiBodyTemplate: '',
  customApiAuthType: 'bearer', customApiAuthToken: '',
  customApiMapping: '', autoSendAfterConfirmation: true,
  prixConfirmation: '0', prixStockage: '0', prixEmballage: '0',
}

export function ShopsList({ token }: { token: string }) {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [apiKeyDialog, setApiKeyDialog] = useState<Shop | null>(null)
  const [testLoading, setTestLoading] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)

  useEffect(() => {
    fetch('/api/shops', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => d.shops && setShops(d.shops))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [token, refreshKey])

  const openCreate = () => {
    setEditingShop(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  const openEdit = (shop: Shop) => {
    setEditingShop(shop)
    setForm({
      name: shop.name, responsible: shop.responsible, phone: shop.phone,
      email: shop.email, address: shop.address || '', modeService: shop.modeService,
      deliveryProvider: shop.deliveryProvider || 'ecotrack',
      deliveryMode: shop.deliveryMode || 'internal',
      ecotrackToken: shop.ecotrackToken || '', ecotrackUrl: shop.ecotrackUrl || '',
      customApiUrl: shop.customApiUrl || '', customApiMethod: shop.customApiMethod || 'POST',
      customApiHeaders: shop.customApiHeaders || '',
      customApiBodyTemplate: shop.customApiBodyTemplate || '',
      customApiAuthType: shop.customApiAuthType || 'bearer',
      customApiAuthToken: shop.customApiAuthToken || '',
      customApiMapping: shop.customApiMapping || '',
      autoSendAfterConfirmation: shop.autoSendAfterConfirmation ?? true,
      prixConfirmation: '0', prixStockage: '0', prixEmballage: '0',
    })
    setDialogOpen(true)
  }

  const saveShop = async () => {
    try {
      const url = editingShop ? `/api/shops/${editingShop.id}` : '/api/shops'
      const method = editingShop ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success(editingShop ? 'Boutique modifiée' : 'Boutique créée')
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

  const regenerateKey = async (shopId: string) => {
    try {
      const res = await fetch(`/api/shops/${shopId}/regenerate-key`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success('Clé API régénérée')
        setRefreshKey(k => k + 1)
      } else {
        toast.error('Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('Clé copiée')
  }

  const testApi = async (shopId: string) => {
    setTestLoading(shopId)
    try {
      const res = await fetch(`/api/shops/test-api/${shopId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Test API réussi ! Connexion établie.')
      } else {
        toast.error(`Test API échoué : ${data.error || 'Erreur inconnue'}`)
      }
    } catch {
      toast.error('Erreur lors du test')
    } finally {
      setTestLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Boutiques</h2>
          <p className="text-muted-foreground">Gestion des boutiques et routage livraison</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
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
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Responsable</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Mode service</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden sm:table-cell">Prestataire</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Livraison</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden sm:table-cell">Statut</th>
                  <th className="text-left text-xs font-medium text-muted-foreground p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shops.map(shop => (
                  <tr key={shop.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">
                      <p className="text-sm font-medium">{shop.name}</p>
                      <p className="text-xs text-muted-foreground">{shop._count.orders} cmd, {shop._count.products} prod.</p>
                    </td>
                    <td className="p-3 text-sm hidden md:table-cell">{shop.responsible}</td>
                    <td className="p-3">
                      <Badge className={`${modeColors[shop.modeService] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                        {modeLabels[shop.modeService] || shop.modeService}
                      </Badge>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <Badge className={`${providerColors[shop.deliveryProvider] || 'bg-gray-100 text-gray-700'} border-0 text-xs flex items-center gap-1 w-fit`}>
                        {shop.deliveryProvider === 'ecotrack' ? <Truck className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        {providerLabels[shop.deliveryProvider] || shop.deliveryProvider}
                      </Badge>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <Badge className={shop.deliveryMode === 'internal' ? 'bg-slate-100 text-slate-700 border-0 text-xs' : 'bg-amber-100 text-amber-700 border-0 text-xs'}>
                        {shop.deliveryMode === 'internal' ? 'Interne' : 'Externe'}
                      </Badge>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <Badge className={shop.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                        {shop.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(shop)} title="Modifier">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setApiKeyDialog(shop)} title="Voir clé API">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {shop.deliveryProvider === 'custom_api' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => testApi(shop.id)} title="Tester API" disabled={testLoading === shop.id}>
                            <Zap className={`h-4 w-4 ${testLoading === shop.id ? 'animate-pulse' : ''}`} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit dialog avec tabs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShop ? 'Modifier la boutique' : 'Nouvelle boutique'}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="general" className="flex-1">Général</TabsTrigger>
              <TabsTrigger value="livraison" className="flex-1">Livraison</TabsTrigger>
              <TabsTrigger value="api-externe" className="flex-1">API Externe</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Responsable *</Label><Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} /></div>
                <div><Label>Téléphone *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="col-span-2"><Label>Adresse</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                <div>
                  <Label>Mode service</Label>
                  <Select value={form.modeService} onValueChange={v => setForm({ ...form, modeService: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmation_only">Confirmation uniquement</SelectItem>
                      <SelectItem value="fulfillment_only">Préparation uniquement</SelectItem>
                      <SelectItem value="full_service">Service complet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.autoSendAfterConfirmation} onCheckedChange={v => setForm({ ...form, autoSendAfterConfirmation: v })} />
                  <Label>Envoi auto après confirmation</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="livraison" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prestataire de livraison</Label>
                  <Select value={form.deliveryProvider} onValueChange={v => setForm({ ...form, deliveryProvider: v, deliveryMode: v === 'ecotrack' ? 'internal' : form.deliveryMode })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ecotrack">Ecotrack</SelectItem>
                      <SelectItem value="custom_api">API Externe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mode livraison</Label>
                  <Select value={form.deliveryMode} onValueChange={v => setForm({ ...form, deliveryMode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Interne (FRET.DIRECT)</SelectItem>
                      <SelectItem value="external">Externe (prestataire)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.deliveryProvider === 'ecotrack' && (
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium"><Truck className="h-4 w-4 text-emerald-600" /> Configuration Ecotrack</div>
                    <div><Label>Token Ecotrack</Label><Input value={form.ecotrackToken} onChange={e => setForm({ ...form, ecotrackToken: e.target.value })} placeholder="Votre token Ecotrack" /></div>
                    <div><Label>URL Ecotrack</Label><Input value={form.ecotrackUrl} onChange={e => setForm({ ...form, ecotrackUrl: e.target.value })} placeholder="https://api.ecotrack.dz/..." /></div>
                  </CardContent>
                </Card>
              )}

              {form.deliveryProvider === 'custom_api' && (
                <Card className="border-teal-200 bg-teal-50/30">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Configurez votre API externe dans l&apos;onglet <strong>API Externe</strong>
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="api-externe" className="space-y-4 mt-4">
              <Card className="border-teal-200">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium"><Globe className="h-4 w-4 text-teal-600" /> Configuration API Externe</div>

                  <div><Label>URL de l&apos;API *</Label><Input value={form.customApiUrl} onChange={e => setForm({ ...form, customApiUrl: e.target.value })} placeholder="https://api.votre-prestataire.com/orders" /></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Méthode HTTP</Label>
                      <Select value={form.customApiMethod} onValueChange={v => setForm({ ...form, customApiMethod: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="GET">GET</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Type d&apos;authentification</Label>
                      <Select value={form.customApiAuthType} onValueChange={v => setForm({ ...form, customApiAuthType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="api_key">API Key</SelectItem>
                          <SelectItem value="none">Aucune</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {form.customApiAuthType !== 'none' && (
                    <div>
                      <Label>{form.customApiAuthType === 'bearer' ? 'Token Bearer' : 'Clé API'}</Label>
                      <Input value={form.customApiAuthToken} onChange={e => setForm({ ...form, customApiAuthToken: e.target.value })} placeholder={form.customApiAuthType === 'bearer' ? 'eyJhbGci...' : 'your-api-key'} type="password" />
                    </div>
                  )}

                  <div>
                    <Label>Headers personnalisés (JSON)</Label>
                    <Textarea value={form.customApiHeaders} onChange={e => setForm({ ...form, customApiHeaders: e.target.value })} rows={3} placeholder='{"X-Custom-Header": "value"}' />
                    <p className="text-xs text-muted-foreground mt-1">Format JSON optionnel pour des headers supplémentaires</p>
                  </div>

                  <div>
                    <Label>Template du corps (JSON dynamique)</Label>
                    <Textarea value={form.customApiBodyTemplate} onChange={e => setForm({ ...form, customApiBodyTemplate: e.target.value })} rows={6} placeholder={'{\n  "client_name": "{{nom_client}}",\n  "phone": "{{telephone}}",\n  "address": "{{adresse}}",\n  "price": "{{montant}}"\n}'} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Variables disponibles : {'{{reference}}, {{nom_client}}, {{telephone}}, {{telephone_2}}, {{adresse}}, {{wilaya}}, {{commune}}, {{produit}}, {{quantite}}, {{montant}}, {{type_livraison}}, {{remarque}}'}
                    </p>
                  </div>

                  <div>
                    <Label>Mapping des champs (alternative au template)</Label>
                    <Textarea value={form.customApiMapping} onChange={e => setForm({ ...form, customApiMapping: e.target.value })} rows={4} placeholder={'{\n  "name": "nom_client",\n  "phone": "telephone",\n  "city": "wilaya"\n}'} />
                    <p className="text-xs text-muted-foreground mt-1">Mapping champ API → champ FRET.CONFIRM (optionnel si template utilisé)</p>
                  </div>

                  {editingShop && form.customApiUrl && (
                    <Button variant="outline" className="w-full" onClick={() => testApi(editingShop.id)} disabled={testLoading === editingShop.id}>
                      <Send className="h-4 w-4 mr-2" /> {testLoading === editingShop.id ? 'Test en cours...' : 'Tester la connexion API'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={saveShop}>{editingShop ? 'Modifier' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key dialog */}
      <Dialog open={!!apiKeyDialog} onOpenChange={() => setApiKeyDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clé API - {apiKeyDialog?.name}</DialogTitle>
          </DialogHeader>
          {apiKeyDialog && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Clé API FRET.CONFIRM</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-mono truncate">{apiKeyDialog.apiKey}</code>
                  <Button variant="outline" size="icon" onClick={() => copyKey(apiKeyDialog.apiKey)}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Prestataire</Label>
                  <p className="text-sm mt-1"><Badge className={`${providerColors[apiKeyDialog.deliveryProvider]} border-0`}>{providerLabels[apiKeyDialog.deliveryProvider]}</Badge></p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Mode livraison</Label>
                  <p className="text-sm mt-1">{apiKeyDialog.deliveryMode === 'internal' ? 'Interne' : 'Externe'}</p>
                </div>
              </div>
              {apiKeyDialog.deliveryProvider === 'ecotrack' && (
                <>
                  <div><Label className="text-xs text-muted-foreground">Token Ecotrack</Label><p className="text-sm mt-1 bg-slate-50 px-3 py-2 rounded">{apiKeyDialog.ecotrackToken || 'Non configuré'}</p></div>
                  <div><Label className="text-xs text-muted-foreground">URL Ecotrack</Label><p className="text-sm mt-1 bg-slate-50 px-3 py-2 rounded">{apiKeyDialog.ecotrackUrl || 'Non configuré'}</p></div>
                </>
              )}
              {apiKeyDialog.deliveryProvider === 'custom_api' && (
                <div><Label className="text-xs text-muted-foreground">URL API Externe</Label><p className="text-sm mt-1 bg-slate-50 px-3 py-2 rounded">{apiKeyDialog.customApiUrl || 'Non configuré'}</p></div>
              )}
              <Button variant="outline" onClick={() => regenerateKey(apiKeyDialog.id)} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" /> Régénérer la clé API
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
