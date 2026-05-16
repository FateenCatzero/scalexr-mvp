# SCALEXR — AI DEVELOPMENT OPERATING SYSTEM

This file defines how Claude must behave, think, and operate across ALL sessions in this project.
It is a persistent system-level instruction for building a production SaaS product.

---

# 1. PROJECT OVERVIEW

ScaleXR is a multi-tenant SaaS platform for restaurants built for the Pakistan market (currency: PKR — always use `formatPrice()` from `lib/utils.ts`).

Core concept:
- Customers scan QR code → browse interactive 2D/3D/AR food menu → place orders → track status in real-time
- Staff (waiter/kitchen) manage order flow via live dashboards
- Restaurant admins manage menu, analytics, staff, and tables
- Master admin manages the entire platform

Core differentiator:
- 3D food visualization + AR preview
- Analytics-driven restaurant intelligence
- Staff workflow system with online presence + performance tracking

---

# 2. TECH STACK (DO NOT CHANGE)

## Frontend
- Next.js 15 (App Router, Server Components)
- React, TypeScript
- Tailwind CSS, shadcn/ui

## Backend
- Supabase — PostgreSQL, Auth, Storage, Realtime

## State Management
- Zustand v5 (client/UI state)
- TanStack Query v5 (server state + caching)

## Validation
- React Hook Form + Zod

## 3D / AR
- Three.js, React Three Fiber, Drei
- model-viewer (primary AR system — uses native device capabilities)

## Utilities
- date-fns (relative timestamps)

## Deployment
- Vercel (auto-deploys from GitHub `main`)

---

# 3. ROLE SYSTEM (CRITICAL)

Roles live in TWO separate tables:

| Layer | Table | Values |
|-------|-------|--------|
| Platform | `users.role` | `master_admin` only |
| Restaurant | `restaurant_users.role` | `restaurant_admin`, `waiter`, `kitchen` |

Role capabilities:

**master_admin** — full platform control, can view/suspend all restaurants, read-only on operational data unless explicitly granted write access. Routes: `/admin/master/*` + any `/admin/[slug]/*` (oversight). Denied: `/staff/*`.

**restaurant_admin** — manages one restaurant (menu, staff, tables, analytics). Route: `/admin/[their-slug]/*` only.

**waiter** — confirms and delivers orders. Route: `/staff/[their-slug]/waiter` only.

**kitchen** — prepares orders, marks ready. Route: `/staff/[their-slug]/kitchen` only.

Route protection uses TWO independent layers (defence in depth):
1. `middleware.ts` — fast unauthenticated bounce only (no DB role check)
2. Layout files — full role + restaurant authorization via `lib/auth.ts`

**Never** write auth logic inline in layouts or pages. Always import from `lib/auth.ts`.

---

# 4. SECURITY MODEL (NON-NEGOTIABLE)

- ALL route access must be server-side protected
- NO frontend-only security logic
- NO trust in client state for permissions
- Every query must filter by `restaurant_id` — no global queries without scoping
- Never use `supabase.auth.getSession()` — use `supabase.auth.getUser()` (validates JWT server-side)
- restaurant_admin cannot access other restaurants
- staff cannot access admin panels
- Cross-restaurant data leaks are a critical bug — always scope queries

---

# 5. ARCHITECTURE RULES

**Multi-tenant:** All data MUST be scoped by `restaurant_id`. Never run global queries without filters.

**State separation:**
- UI/local state → Zustand
- Server/remote state → TanStack Query
- DB logic → Supabase only

**Components:**
- Keep components reusable
- Do NOT duplicate UI logic
- Prefer composition over duplication
- React Three Fiber is optional 3D fallback — model-viewer is the primary AR system

**Supabase clients:**
- Server components / layouts / `lib/auth.ts` → `createClient()` from `lib/supabase/server.ts`
- `'use client'` components → `createClient()` from `lib/supabase/client.ts`
- NEVER expose the service role key in frontend code

---

# 6. PROJECT STRUCTURE

```
src/
  app/
    r/[restaurantSlug]/          ← Customer menu + ordering (public)
    admin/[restaurantSlug]/      ← Restaurant admin panel
    admin/master/                ← Master admin
    admin/login/                 ← Shared login (all roles)
    admin/reset-password/
    staff/[restaurantSlug]/
      waiter/                    ← Waiter dashboard
      kitchen/                   ← Kitchen display

  components/
    admin/                       ← AdminNav, ItemForm, ImageUpload, ModelUpload, MasterControlBanner
    staff/                       ← OrderCard, EditOrderDrawer, StatusBadge
    menu/                        ← MenuGrid, ItemCard, CategoryFilter
    cart/                        ← CartButton, CartSheet
    viewer/                      ← ThreeDViewer, ARLauncher, ModelViewer
    ui/                          ← shadcn components

  lib/
    auth.ts                      ← SINGLE SOURCE OF TRUTH for all auth/RBAC
    supabase/client.ts           ← Browser Supabase client
    supabase/server.ts           ← Server Supabase client
    queries/
      admin.ts                   ← Restaurant admin hooks
      adminStaff.ts              ← Staff management hooks
      staff.ts                   ← Waiter/kitchen order hooks + heartbeat
      menu.ts                    ← Customer menu hooks
      orders.ts                  ← Customer order hooks
      master.ts                  ← Master admin hooks
      restaurant.ts              ← Restaurant lookup hooks
    store/cartStore.ts           ← Zustand cart (cross-restaurant guard built in)
    store/orderStore.ts          ← Zustand order history
    types/index.ts               ← ALL TypeScript types (mirror DB schema exactly)
    analytics.ts
    utils.ts

  middleware.ts                  ← Session refresh + unauthenticated route bounce
```

---

# 7. DATABASE

**Migrations:** `supabase/migrations/` (001 through 009). Always check before touching the schema.

| Table | Purpose |
|-------|---------|
| `restaurants` | One row per restaurant. `slug` = URL key. `is_active` = suspension flag. |
| `users` | Mirrors `auth.users`. `role` = platform role. |
| `restaurant_users` | Links users to restaurants. `role` = tenant role. `is_active` = soft-deactivate. |
| `categories` | Menu categories. Sorted by `sort_order`. |
| `menu_items` | `has_3d_model` + `has_ar` are denormalized flags updated on asset upload/delete. |
| `item_assets` | Files in Supabase Storage bucket `restaurant-assets`. |
| `restaurant_tables` | Physical tables with QR URLs. Soft-deleted via `is_active = false`. |
| `orders` | Flow: `pending → confirmed → preparing → ready → delivered`. |
| `order_items` | `subtotal` is a generated column (`quantity * unit_price`). |
| `analytics_events` | Raw event log. Aggregated client-side in admin.ts. |
| `admin_logs` | Audit trail. |
| `staff_activity` | Heartbeat presence. One row per `(user_id, restaurant_id)`. |
| `staff_performance` | Cumulative order counters per staff member. |

**DB rules:**
- Use UUIDs for all primary keys
- Always reference `restaurant_id` in related tables
- Never assume implicit relationships
- All restaurant customization should eventually move to `restaurant_settings (jsonb)` — design new systems to be compatible, but do not implement the full settings system yet

---

# 8. KEY PATTERNS

### Server Component Page (standard pattern)
```tsx
// page.tsx — server, fetches data, passes to client component
export default async function SomePage({ params }) {
  const { restaurantSlug } = await params   // params is a Promise in Next.js 15
  const cookieStore = await cookies()
  const supabase = createServerClient(url, key, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} }
  })
  const { data: restaurant } = await supabase
    .from('restaurants').select('*').eq('slug', restaurantSlug).single()
  if (!restaurant) redirect('/admin/login')
  return <SomeClient restaurant={restaurant} />
}
// SomeClient.tsx — 'use client', receives all data as props
```

### TanStack Query Key Namespaces
| Context | Key pattern |
|---------|------------|
| Customer | `['menu-items', restaurantId]`, `['order', orderId]` |
| Admin | `['admin-menu-items', restaurantId]`, `['admin-stats', restaurantId, period]` |
| Staff orders | `['orders', restaurantId, statuses]` |
| Staff management | `['staff', restaurantId]` |
| Master | `['master', ...]` |

Mutations always `queryClient.invalidateQueries(...)` on success.

---

# 9. STAFF SYSTEM (migration 009)

**Online status:** `last_active_at > now() - '3 minutes'` — derived at query time.

**Heartbeat:** `useStaffHeartbeat(restaurantId)` in `lib/queries/staff.ts`. Add to `WaiterClient` and `KitchenClient`. Fires immediately on mount, then every 30s.

**Performance tracking:** `useUpdateOrderStatus` requires `{ orderId, status, restaurantId }`. Calls `increment_staff_performance()` RPC (fire-and-forget) after each status change.

Status → counter: `confirmed→orders_confirmed`, `preparing→orders_preparing`, `ready|delivered→orders_delivered`, `cancelled→orders_cancelled`.

**Admin staff page:** `/admin/[slug]/staff` — search, role/online filters, change role, toggle active, remove.

**Add staff:** `add_staff_by_email()` RPC — user must already have a ScaleXR account.

**`EditOrderDrawer`** requires a `restaurantId` prop.

---

# 10. CART

`cartStore.ts` — Zustand persisted to `sessionStorage`. Cross-restaurant guard in `addItem`: if items from restaurant A are in the cart and a restaurant B item is added, cart auto-clears (including `tableNumber`) before adding.

---

# 11. DEVELOPMENT WORKFLOW (MANDATORY)

### Step 1 — Plan
Before writing any code:
- Explain the approach in plain English
- List all files that will be created or modified
- Identify risks or breaking changes

### Step 2 — Implement
- Minimal required changes only
- Do NOT refactor or clean up unrelated code
- Follow existing patterns — do not invent new ones

### Step 3 — Verify
- Run `npx tsc --noEmit` — zero errors required before reporting done
- Confirm all Supabase queries are scoped by `restaurant_id`
- Confirm types match DB schema

---

# 12. GIT WORKFLOW (MANDATORY)

After EVERY completed feature or fix:

```bash
git add <specific files>    # never blindly git add -A or git add .
git commit -m "feat: <clear description>"
git push origin main
```

Semantic prefixes: `feat:` / `fix:` / `refactor:` / `security:` / `docs:` / `chore:`

Keep commits small and meaningful. Never bundle unrelated changes.

---

# 13. MIGRATION WORKFLOW

1. Create `supabase/migrations/0XX_description.sql`
2. Tell user: **"Run this in Supabase Dashboard → SQL Editor → New Query → Run"**
3. Never assume the migration has been run until the user confirms

---

# 14. RESPONSE STYLE

Claude must always be:
- Concise and technical
- Focused on architecture and correctness
- Clear about risks

Response format for non-trivial changes:
1. Summary
2. Plan (files affected)
3. Changes
4. Risks (if any)

Avoid unnecessary explanations unless asked.

---

# 15. OPERATING RULES

1. **Read before writing** — always read the relevant file before editing it
2. **Scope is sacred** — only change what was explicitly requested
3. **No feature creep** — do not add features, refactor, or clean up during a bug fix
4. **Comments required** — all new code must be documented so anyone can understand it
5. **Security over convenience** — always choose the more secure approach
6. **Migrations are manual** — write the file, tell the user to run it, never assume it ran
7. **`params` is a Promise** — always `await params` in Next.js 15 server components
8. **Controlled steps** — for refactors, do one step at a time, wait for user confirmation
9. **Never overengineer** — no unused abstractions, no experimental patterns
10. **Never break working features** — changing UI unnecessarily or creating duplicate systems is forbidden

---

# 16. THINKING MODEL

Claude should always think:

> "How does this scale to 500 restaurants and 50,000 daily users?"

NOT: "How do I solve this single feature quickly?"

Every change must be: **scalable · secure · minimal · production-grade**

---

# 17. ACTIVE PRODUCT BACKLOG (AWARENESS ONLY)

These are known incomplete or missing system components. Claude must design all new systems to remain compatible with them, but implement ONLY when explicitly asked.

| Item | Status | Notes |
|------|--------|-------|
| Staff invitation system | Not built | Email invite → Supabase Auth auto-creation → role assignment |
| Master admin cross-restaurant staff view | Not built | Will be needed for enterprise dashboard |
| Push notifications | Not built | New order + status update alerts (currently only Supabase Realtime in-app) |
| QR code generation UI | Partial | DB + field exist; generation UI not implemented |
| `is_out_of_stock` consistency | Partial | Exists on edit page; missing from inline admin menu form + bulk upload |

---

# 18. ENVIRONMENT

- **OS:** Windows 11, PowerShell
- **Dev server:** `npm run dev` → `http://localhost:3000`
- **GitHub:** https://github.com/FateenCatzero/scalexr-mvp (branch: `main`)
- **Supabase:** credentials in `.env.local` (not committed)
- **Vercel:** auto-deploys from `main`
