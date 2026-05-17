'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Key, Truck, Settings, Copy, RefreshCw, Save, Globe, Zap, Send } from 'lucide-react'
import { toast } from 'sonner'

interface ShopConfig {
  id: string
  name: string
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
  webhookUrl: string | null
  prixConfirmation: number
  prixStockage: number
  prixEmballage: number
}

const modeLabels: Record<string, string> = {
  confirmation_only: 'Confirmation uniquement',
  fulfillment_only: 'Préparation uniquement',
  full_service: 'Service complet',
}

const providerLabels: Record<string, string> = {
  ecotrack: 'Ecotrack',
  custom_api: 'API Externe',
}

export function ShopConfig({ token }: { token: string }) {
  const [shop, setShop] = useState<ShopConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testLoading, setTestLoading] = useState(false)

  // Form state
  const [ecotrackToken, setEcotrackToken] = useState('')
  const [ecotrackUrl, setEcotrackUrl] = useState('')
  const [deliveryProvider, setDeliveryProvider] = useState('ecotrack')
  const [deliveryMode, setDeliveryMode] = useState('internal')
  const [customApiUrl, setCustomApiUrl] = useState('')
  const [customApiMethod, setCustomApiMethod] = useState('POST')
  const [customApiHeaders, setCustomApiHeaders] = useState('')
  const [customApiBodyTemplate, setCustomApiBodyTemplate] = useState('')
  const [customApiAuthType, setCustomApiAuthType] = useState('bearer')
  const [customApiAuthToken, setCustomApiAuthToken] = useState('')
  const [customApiMapping, setCustomApiMapping] = useState('')
  const [autoSend, setAutoSend] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/shop', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const s = d.shop
        setShop(s)
        setEcotrackToken(s?.ecotrackToken || '')
        setEcotrackUrl(s?.ecotrackUrl || '')
        setDeliveryProvider(s?.deliveryProvider || 'ecotrack')
        setDeliveryMode(s?.deliveryMode || 'internal')
        setCustomApiUrl(s?.customApiUrl || '')
        setCustomApiMethod(s?.customApiMethod || 'POST')
        setCustomApiHeaders(s?.customApiHeaders || '')
        setCustomApiBodyTemplate(s?.customApiBodyTemplate || '')
        setCustomApiAuthType(s?.customApiAuthType || 'bearer')
        setCustomApiAuthToken(s?.customApiAuthToken || '')
        setCustomApiMapping(s?.customApiMapping || '')
        setAutoSend(s?.autoSendAfterConfirmation ?? true)
      })
      .catch(() => toast.error('Erreur'))
      .finally(() => setLoading(false))
  }, [token])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copié')
  }

  const regenerateKey = async () => {
    if (!shop) return
    try {
      const res = await fetch(`/api/shops/${shop.id}/regenerate-key`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const d = await res.json()
        setShop({ ...shop, apiKey: d.shop?.apiKey || d.apiKey || '' })
        toast.success('Clé API régénérée')
      } else {
        toast.error('Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    }
  }

  const saveConfig = async () => {
    if (!shop) return
    setSaving(true)
    try {
      const res = await fetch(`/api/shops/${shop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          deliveryProvider, deliveryMode,
          ecotrackToken, ecotrackUrl,
          customApiUrl, customApiMethod, customApiHeaders,
          customApiBodyTemplate, customApiAuthType, customApiAuthToken,
          customApiMapping, autoSendAfterConfirmation: autoSend,
        }),
      })
      if (res.ok) {
        toast.success('Configuration sauvegardée')
        const d = await res.json()
        setShop({ ...shop, ...d.shop })
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur')
      }
    } catch {
      toast.error('Erreur serveur')
    } finally {
      setSaving(false)
    }
  }

  const testApi = async () => {
    if (!shop) return
    setTestLoading(true)
    try {
      const res = await fetch(`/api/shops/test-api/${shop.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Test API réussi ! La connexion est établie.')
      } else {
        toast.error(`Test API échoué : ${data.error || 'Erreur inconnue'}`)
      }
    } catch {
      toast.error('Erreur lors du test')
    } finally {
      setTestLoading(false)
    }
  }

  if (loading) return <div className="space-y-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
  if (!shop) return <p className="text-center text-muted-foreground py-12">Erreur de chargement</p>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuration</h2>
        <p className="text-muted-foreground">{shop.name}</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="livraison">Livraison</TabsTrigger>
          <TabsTrigger value="api-externe">API Externe</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-4">
          {/* Shop info */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Informations boutique</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Nom:</span><p className="font-medium">{shop.name}</p></div>
                <div><span className="text-muted-foreground">Mode service:</span>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 ml-2">{modeLabels[shop.modeService]}</Badge>
                </div>
                <div><span className="text-muted-foreground">Prestataire:</span>
                  <Badge className="bg-teal-100 text-teal-700 border-0 ml-2">{providerLabels[shop.deliveryProvider]}</Badge>
                </div>
                <div><span className="text-muted-foreground">Envoi auto:</span>
                  <Badge className={shop.autoSendAfterConfirmation ? 'bg-green-100 text-green-700 border-0 ml-2' : 'bg-gray-100 text-gray-700 border-0 ml-2'}>
                    {shop.autoSendAfterConfirmation ? 'Oui' : 'Non'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Key */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" /> Clé API</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-mono truncate">{shop.apiKey}</code>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(shop.apiKey)}><Copy className="h-4 w-4" /></Button>
              </div>
              <Button variant="outline" onClick={regenerateKey} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" /> Régénérer la clé API
              </Button>
              <p className="text-xs text-muted-foreground">
                Utilisez cette clé dans l&apos;en-tête <code className="bg-slate-100 px-1 rounded">Authorization: Bearer VOTRE_CLE</code> pour l&apos;API publique.
              </p>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader><CardTitle className="text-base">Tarification</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm p-2 rounded bg-slate-50">
                  <span className="text-muted-foreground">Confirmation</span><span className="font-medium">{shop.prixConfirmation} DA</span>
                </div>
                <div className="flex justify-between text-sm p-2 rounded bg-slate-50">
                  <span className="text-muted-foreground">Stockage</span><span className="font-medium">{shop.prixStockage} DA</span>
                </div>
                <div className="flex justify-between text-sm p-2 rounded bg-slate-50">
                  <span className="text-muted-foreground">Emballage</span><span className="font-medium">{shop.prixEmballage} DA</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="livraison" className="space-y-6 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Routage livraison</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prestataire de livraison</Label>
                  <Select value={deliveryProvider} onValueChange={v => { setDeliveryProvider(v); if (v === 'ecotrack') setDeliveryMode('internal') }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ecotrack">Ecotrack</SelectItem>
                      <SelectItem value="custom_api">API Externe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mode livraison</Label>
                  <Select value={deliveryMode} onValueChange={setDeliveryMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Interne (FRET.DIRECT)</SelectItem>
                      <SelectItem value="external">Externe (prestataire)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={autoSend} onCheckedChange={setAutoSend} />
                <Label>Envoi automatique après confirmation</Label>
              </div>

              {/* Ecotrack config */}
              {deliveryProvider === 'ecotrack' && (
                <div className="space-y-4 p-4 border rounded-lg bg-emerald-50/30">
                  <div className="flex items-center gap-2 text-sm font-medium"><Truck className="h-4 w-4 text-emerald-600" /> Configuration Ecotrack</div>
                  <div><Label>Token Ecotrack</Label><Input value={ecotrackToken} onChange={e => setEcotrackToken(e.target.value)} placeholder="Votre token" /></div>
                  <div><Label>URL API Ecotrack</Label><Input value={ecotrackUrl} onChange={e => setEcotrackUrl(e.target.value)} placeholder="https://api.ecotrack.dz/..." /></div>
                </div>
              )}

              {deliveryProvider === 'custom_api' && (
                <div className="p-4 border border-teal-200 rounded-lg bg-teal-50/30">
                  <p className="text-sm text-muted-foreground">Configurez votre API externe dans l&apos;onglet <strong>API Externe</strong></p>
                </div>
              )}

              <Button onClick={saveConfig} className="w-full" disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
              </Button>
            </CardContent>
          </Card>

          {/* Webhook */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> URL Webhook</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm">{shop.webhookUrl || 'Non configuré'}</p>
              <p className="text-xs text-muted-foreground mt-2">Les notifications seront envoyées à cette URL.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-externe" className="space-y-6 mt-4">
          <Card className="border-teal-200">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-teal-600" /> Configuration API Externe</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>URL de l&apos;API *</Label><Input value={customApiUrl} onChange={e => setCustomApiUrl(e.target.value)} placeholder="https://api.votre-prestataire.com/orders" /></div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Méthode HTTP</Label>
                  <Select value={customApiMethod} onValueChange={setCustomApiMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type d&apos;authentification</Label>
                  <Select value={customApiAuthType} onValueChange={setCustomApiAuthType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="none">Aucune</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {customApiAuthType !== 'none' && (
                <div>
                  <Label>{customApiAuthType === 'bearer' ? 'Token Bearer' : 'Clé API'}</Label>
                  <Input value={customApiAuthToken} onChange={e => setCustomApiAuthToken(e.target.value)} type="password" placeholder={customApiAuthType === 'bearer' ? 'eyJhbGci...' : 'your-api-key'} />
                </div>
              )}

              <div>
                <Label>Headers personnalisés (JSON)</Label>
                <Textarea value={customApiHeaders} onChange={e => setCustomApiHeaders(e.target.value)} rows={3} placeholder='{"X-Custom-Header": "value"}' />
              </div>

              <div>
                <Label>Template du corps de requête (JSON dynamique)</Label>
                <Textarea value={customApiBodyTemplate} onChange={e => setCustomApiBodyTemplate(e.target.value)} rows={6} placeholder={'{\n  "client_name": "{{nom_client}}",\n  "phone": "{{telephone}}",\n  "address": "{{adresse}}",\n  "price": "{{montant}}"\n}'} />
                <p className="text-xs text-muted-foreground mt-1">
                  Variables : {'{{reference}}, {{nom_client}}, {{telephone}}, {{adresse}}, {{wilaya}}, {{commune}}, {{produit}}, {{quantite}}, {{montant}}, {{type_livraison}}, {{remarque}}'}
                </p>
              </div>

              <div>
                <Label>Mapping des champs (alternative)</Label>
                <Textarea value={customApiMapping} onChange={e => setCustomApiMapping(e.target.value)} rows={4} placeholder={'{\n  "name": "nom_client",\n  "phone": "telephone",\n  "city": "wilaya"\n}'} />
              </div>

              <div className="flex gap-3">
                <Button onClick={saveConfig} className="flex-1" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
                {customApiUrl && (
                  <Button variant="outline" onClick={testApi} disabled={testLoading}>
                    <Send className="h-4 w-4 mr-2" /> {testLoading ? 'Test...' : 'Tester'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
