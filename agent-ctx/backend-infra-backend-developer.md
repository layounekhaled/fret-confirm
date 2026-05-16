# Backend Infrastructure - Work Summary

## Agent: Backend Developer
## Task ID: backend-infra
## Date: 2026-05-16

## Completed Tasks

### Library Files (8 files in /src/lib/)

1. **auth.ts** - JWT-based authentication
   - hashPassword, verifyPassword (bcryptjs)
   - generateToken, verifyToken (jsonwebtoken)
   - getAuthUser, getTokenFromHeaders helpers
   - Secret: process.env.JWT_SECRET or 'fret-confirm-secret-key-2024'
   - Token payload: { userId, email, role, shopId }

2. **phone.ts** - Algerian phone normalization
   - normalizePhone(): +213/213/00213/0 prefix → 0550123456 format
   - isValidPhone(): boolean validation
   - Throws 'phone_invalid' on invalid input

3. **ecotrack.ts** - Ecotrack shipping integration
   - sendOrderToEcotrack(): sends order to shop's ecotrack URL
   - retryEcotrack(): manual retry
   - Logs all requests/responses in EcotrackLog table
   - Updates order status to 'envoyee_ecotrack' or 'erreur_ecotrack'

4. **duplicates.ts** - Duplicate order detection
   - checkExactDuplicate(): shopId + reference + telephone
   - checkProbableDuplicate(): within 24h window by phone + product + amount
   - checkRecurrentClient(): client order history lookup

5. **stock.ts** - Stock management system
   - reserveStock(): stockDispo → stockReserve
   - releaseStock(): stockReserve → stockDispo
   - shipStock(): stockReserve → stockExpedie
   - addStock(): increases stockTotal + stockDispo
   - adjustStock(): adjusts stock with movement logging

6. **webhooks.ts** - Webhook delivery
   - sendWebhook(): POST to shop's webhook URLs for matching events
   - Events: 'confirmee', 'refusee', 'envoyee_ecotrack'
   - Logs delivery status

7. **auto-assign.ts** - Auto order assignment
   - autoAssignOrder(): assigns to confirmateur with fewest active orders
   - Creates assignment record and order log

8. **invoices.ts** - Invoice generation
   - generateInvoice(): calculates monthly invoice for shop
   - getInvoice(): returns invoice details with shop info

### API Routes (22 route files in /src/app/api/)

**Authentication:**
- POST /api/auth/login - email/password login, returns JWT token + user info
- GET /api/auth/me - returns current user from Bearer token

**Orders:**
- POST /api/orders/create - public endpoint (API key auth), duplicate detection
- GET /api/orders - list with filters, pagination, role-based access
- GET/PUT /api/orders/[id] - detail with logs/assignments, update with permissions
- POST /api/orders/[id]/confirm - confirm order, route by shop modeService
- POST /api/orders/[id]/ecotrack - manual ecotrack send/retry

**Shops:**
- GET/POST /api/shops - list (admin/manager), create (admin)
- GET/PUT/DELETE /api/shops/[id] - detail, update, deactivate
- POST /api/shops/[id]/regenerate-key - regenerate API key

**Products:**
- GET/POST /api/products - list with filters, create with stock
- GET/PUT/DELETE /api/products/[id] - CRUD operations

**Stock:**
- GET/POST /api/stock/movements - list/create stock movements
- POST /api/stock/[productId]/adjust - adjust stock levels

**Users:**
- GET/POST /api/users - list (admin/manager), create (admin)
- GET/PUT/DELETE /api/users/[id] - detail, update, deactivate

**Dashboards:**
- GET /api/dashboard/admin - total orders, by status, CA, top shops/agents
- GET /api/dashboard/shop - shop-specific stats + stock summary
- GET /api/dashboard/confirmateur - agent performance + active orders
- GET /api/dashboard/stock - stock levels, low stock alerts, movements

**Other:**
- GET/POST /api/reminders - list/create reminders
- POST /api/assignments - manual/auto order assignment
- GET/POST /api/invoices - list/generate invoices
- GET /api/invoices/[id] - invoice details
- GET/POST /api/webhooks - list/create webhooks

### Seed Script

**File:** /prisma/seed.ts
**Run with:** `bunx tsx prisma/seed.ts`

Created data:
- 1 super admin: admin@fret.confirm / Admin@123
- 1 manager: manager@fret.confirm / Manager@123
- 3 confirmateurs: conf1-3@fret.confirm / Conf@123
- 2 opérateurs stock: stock1-2@fret.confirm / Stock@123
- 3 boutiques: TechDZ (full_service), ModeAlgerie (confirmation_only), DZMarket (fulfillment_only)
- 3 boutique users: boutique@techdz.com, etc. / Boutique@123
- 15 products (5 per shop)
- 45 orders (15 per shop, various statuses)
- Stock movements, invoices, webhooks

## Technical Details
- All imports use `@/lib/db` for database client
- Bearer token auth for protected routes
- API key auth for public order creation
- Role-based access control throughout
- French language for all user-facing messages
- Proper HTTP status codes (400, 401, 403, 404, 409, 500)
- ESLint passes with no errors
