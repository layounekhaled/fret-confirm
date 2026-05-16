'use client'

import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  Package,
  Warehouse,
  Box,
  Headphones,
  Receipt,
  Users,
  Webhook,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface UserInfo {
  id: string
  name: string
  email: string
  role: string
  shop?: { id: string; name: string } | null
}

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
}

const navItemsByRole: Record<string, NavItem[]> = {
  super_admin: [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'orders', label: 'Commandes', icon: ShoppingCart },
    { id: 'shops', label: 'Boutiques', icon: Store },
    { id: 'products', label: 'Produits', icon: Package },
    { id: 'stock', label: 'Stock', icon: Warehouse },
    { id: 'fulfillment', label: 'Préparation', icon: Box },
    { id: 'confirmateurs', label: 'Confirmateurs', icon: Headphones },
    { id: 'invoices', label: 'Facturation', icon: Receipt },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  ],
  manager: [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'orders', label: 'Commandes', icon: ShoppingCart },
    { id: 'shops', label: 'Boutiques', icon: Store },
    { id: 'products', label: 'Produits', icon: Package },
    { id: 'stock', label: 'Stock', icon: Warehouse },
    { id: 'fulfillment', label: 'Préparation', icon: Box },
    { id: 'confirmateurs', label: 'Confirmateurs', icon: Headphones },
    { id: 'invoices', label: 'Facturation', icon: Receipt },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  ],
  confirmateur: [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'orders', label: 'Mes commandes', icon: ShoppingCart },
    { id: 'reminders', label: 'Rappels', icon: Bell },
  ],
  operateur_stock: [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'products', label: 'Produits', icon: Package },
    { id: 'stock', label: 'Stock', icon: Warehouse },
    { id: 'fulfillment', label: 'Préparation', icon: Box },
  ],
  boutique: [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'orders', label: 'Commandes', icon: ShoppingCart },
    { id: 'products', label: 'Produits', icon: Package },
    { id: 'stock', label: 'Stock', icon: Warehouse },
    { id: 'invoices', label: 'Facturation', icon: Receipt },
    { id: 'config', label: 'Configuration', icon: Settings },
  ],
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  confirmateur: 'Confirmateur',
  operateur_stock: 'Opérateur Stock',
  boutique: 'Boutique',
}

interface AppSidebarProps {
  user: UserInfo
  currentPage: string
  onNavigate: (page: string) => void
  onLogout: () => void
}

export function AppSidebar({ user, currentPage, onNavigate, onLogout }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const items = navItemsByRole[user.role] || []

  const navSection = (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = currentPage === item.id
        return (
          <button
            key={item.id}
            onClick={() => {
              onNavigate(item.id)
              setMobileOpen(false)
            }}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-emerald-600/20 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-emerald-400')} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        )
      })}
    </nav>
  )

  const logoSection = (
    <div className="px-4 py-5 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20">
        <Package className="h-5 w-5 text-emerald-400" />
      </div>
      {!collapsed && (
        <div className="overflow-hidden">
          <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
            FRET<span className="text-emerald-400">.CONFIRM</span>
          </h1>
          <p className="text-[10px] text-slate-500 leading-tight">par FRET.DIRECT</p>
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto hidden lg:flex h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
        onClick={() => setCollapsed(!collapsed)}
      >
        <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
      </Button>
    </div>
  )

  const userSection = (
    <div className="p-3">
      <div className={cn('flex items-center gap-3 rounded-lg p-2', collapsed && 'justify-center')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-medium text-white">
          {user.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{roleLabels[user.role] || user.role}</p>
          </div>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10 shrink-0"
            onClick={onLogout}
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-3 left-3 z-50 bg-slate-900 text-white hover:bg-slate-800 h-10 w-10"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-700/50 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {logoSection}
          <Separator className="bg-slate-700/50 mx-2" />
          {navSection}
          <Separator className="bg-slate-700/50 mx-2" />
          {userSection}
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-slate-900 border-r border-slate-700/50 h-screen sticky top-0 transition-all duration-300 shrink-0',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {logoSection}
          <Separator className="bg-slate-700/50 mx-2" />
          {navSection}
          <Separator className="bg-slate-700/50 mx-2" />
          {userSection}
        </div>
      </aside>
    </>
  )
}
