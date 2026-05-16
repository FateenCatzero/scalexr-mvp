# ScaleXR MVP — Claude Context Guide

This file helps Claude (and any developer) get up to speed instantly on this project.
Read this before making any changes.

---

## What This Project Is

**ScaleXR** is a multi-tenant restaurant SaaS platform built for the Pakistan market.
Restaurants use it to:
- Show customers a digital AR menu (scan QR → browse → order)
- Manage their menu, staff, tables, and analytics
- Run a kitchen display + waiter dashboard for real-time order management

**Tech stack:**
- Next.js 15 (App Router, Server Components)
- Supabase (Postgres + Auth + Realtime + Storage)
- TanStack Query v5 (data fetching + caching)
- Zustand v5 (cart store, order store)
- shadcn/ui + Tailwind CSS
- React Hook Form + Zod
- React Three Fiber / Drei (3D viewer)
- date-fns (relative timestamps)

**Currency:** PKR (Pakistani Rupee). Use `formatPrice()` from `lib/utils.ts`.

---

## Project Structure

```
src/
  app/
    r/[restaurantSlug]/          ← Customer-facing menu + ordering
    admin/[restaurantSlug]/      ← Restaurant admin panel
    admin/master/                ← Master admin (ScaleXR platform owner)
    admin/login/                 ← Shared login page
    admin/reset-password/
    staff/[restaurantSlug]/
      waiter/                    ← Waiter dashboard (confirm/deliver orders)
      kitchen/                   ← Kitchen display (prepare orders)

  components/
    admin/                       ← AdminNav, ItemForm, ImageUpload, ModelUpload, etc.
    staff/                       ← OrderCard, EditOrderDrawer, StatusBadge
    menu/                        ← MenuGrid, ItemCard, CategoryFilter
    cart/                        ← CartButton, CartSheet
    viewer/                      ← ThreeDViewer, ARLauncher, ModelViewer
    ui/                          ← shadcn components (button, input, badge, etc.)

  lib/
    auth.ts                      ← SINGLE SOURCE OF TRUTH for all auth/RBAC logic
    supabase/
      client.ts                  ← Browser Supabase client
      server.ts                  ← Server Supabase client (SSR)
    queries/
      admin.ts                   ← Admin panel TanStack Query hooks
      adminStaff.ts              ← Staff management hooks
      staff.ts                   ← Waiter/kitchen order hooks + heartbeat
      menu.ts                    ← Customer menu hooks
      orders.ts                  ← Customer order hooks
      master.ts                  ← Master admin hooks
      restaurant.ts              ← Restaurant lookup hooks
    store/
      cartStore.ts               ← Zustand cart (cross-restaurant guard included)
      orderStore.ts              ← Zustand order history
    types/
      index.ts                   ← ALL TypeScript types (mirror DB schema exactly)
    analytics.ts
    utils.ts

  middleware.ts                  ← Auth session refresh + route protection
```

---

## Role System (CRITICAL — read carefully)

There are TWO layers of roles:

| Layer | Table | Roles stored |
|-------|-------|-------------|
| Platform | `users.role` | `master_admin` only |
| Restaurant | `restaurant_users.role` | `restaurant_admin`, `waiter`, `kitchen` |

**Access matrix:**

| Role | Can access |
|------|-----------|
| `master_admin` | `/admin/master/*` + any `/admin/[slug]/*` (oversight) |
| `restaurant_admin` | `/admin/[their-slug]/*` only |
| `waiter` | `/staff/[their-slug]/waiter` only |
| `kitchen` | `/staff/[their-slug]/kitchen` only |

**Route protection is TWO layers:**
1. `middleware.ts` — fast early bounce (unauthenticated users only, no DB call for role)
2. Layout files — full role + restaurant check via `lib/auth.ts`

**Never** add auth logic directly in layouts or pages — always import from `lib/auth.ts`.

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `restaurants` | One row per restaurant. `slug` = URL identifier. |
| `users` | Mirrors Supabase Auth. `role` = platform role. |
| `restaurant_users` | Links users to restaurants with a role. `is_active` for soft-deactivation. |
| `categories` | Menu categories per restaurant. |
| `menu_items` | Menu items. `has_3d_model`, `has_ar` are denormalized flags. |
| `item_assets` | GLB/USDZ/image files stored in Supabase Storage. |
| `restaurant_tables` | Physical tables with QR codes. Soft-deleted via `is_active`. |
| `orders` | Customer orders. Status: `pending → confirmed → preparing → ready → delivered`. |
| `order_items` | Line items in an order. |
| `analytics_events` | Raw event log (item views, AR launches, etc.). |
| `admin_logs` | Admin audit trail. |
| `staff_activity` | Heartbeat presence. One row per (user, restaurant). |
| `staff_performance` | Cumulative order counters per staff member. |

**Migrations location:** `supabase/migrations/` (001 through 009)

---

## Key Patterns

### Server Component Page Pattern
```tsx
// page.tsx (server)
export default async function SomePage({ params }) {
  const { restaurantSlug } = await params  // params is a Promise in Next.js 15
  const cookieStore = await cookies()
  const supabase = createServerClient(url, key, { cookies: ... })
  const { data: restaurant } = await supabase.from('restaurants').select('*').eq('slug', restaurantSlug).single()
  if (!restaurant) redirect('/admin/login')
  return <SomeClient restaurant={restaurant} />
}

// SomeClient.tsx — add 'use client' at top, receives data as props
```

### TanStack Query Keys
- Customer: `['menu-items', restaurantId]`, `['order', orderId]`
- Admin: `['admin-menu-items', restaurantId]`, `['admin-stats', restaurantId, period]`
- Staff: `['orders', restaurantId, statuses]`
- Staff management: `['staff', restaurantId]`
- Master: `['master', ...]`

### Mutations always invalidate on success
```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['admin-menu-items', restaurantId] })
}
```

### Supabase client usage
- **Browser components** → `createClient()` from `lib/supabase/client.ts`
- **Server components / layouts** → `createClient()` from `lib/supabase/server.ts`
- **Never use** `supabase.auth.getSession()` — use `supabase.auth.getUser()` (validates JWT)

---

## Staff System (migration 009)

**Online status:** `last_active_at > now() - '3 minutes'` (3 min threshold, 30s heartbeat)

**Heartbeat:** `useStaffHeartbeat(restaurantId)` — call inside WaiterClient and KitchenClient.

**Performance tracking:** `useUpdateOrderStatus` now takes `restaurantId` as a required third param
and calls `increment_staff_performance()` RPC after each status change.
Status → counter mapping:
- `confirmed` → `orders_confirmed`
- `preparing` → `orders_preparing`
- `ready` or `delivered` → `orders_delivered`
- `cancelled` → `orders_cancelled`

**Admin staff page:** `/admin/[slug]/staff` — search, role filter, online filter, CRUD actions.

**Add staff flow:** Admin enters email → `add_staff_by_email()` RPC looks up user → adds to
`restaurant_users`. User must already have a ScaleXR account (no invite system yet).

**EditOrderDrawer** now requires a `restaurantId` prop (needed by `useUpdateOrderStatus`).

---

## Cart

`cartStore.ts` uses Zustand with sessionStorage persistence.
Cross-restaurant guard is in `addItem`: if items from a different restaurant are in the cart,
the cart is auto-cleared before adding the new item. `tableNumber` is also cleared.

---

## Important Rules (from past sessions)

1. **Do NOT modify unrelated features** when fixing something specific.
2. **Do NOT add features** during bug fixes or refactors.
3. **Do NOT redesign architecture** — work within the existing patterns.
4. **Comments are required** — all code must be documented so anyone can read and understand it.
5. **Security first** — never use `getSession()`, always filter by `restaurant_id`, never trust
   client-supplied IDs without DB verification.
6. **Migrations are manual** — after writing a `.sql` file, tell the user to run it in
   Supabase Dashboard → SQL Editor → New Query → Run.
7. **`params` is a Promise** in Next.js 15 — always `await params` before destructuring.
8. **Controlled refactors** — one step at a time, wait for user confirmation before the next step.

---

## Workflow When User Asks for a Feature

1. Read the relevant existing files before writing anything.
2. Check `supabase/migrations/` — understand the schema before touching DB.
3. Check `lib/auth.ts` — understand role enforcement before adding routes.
4. Follow the existing page/client component split pattern.
5. Add types to `lib/types/index.ts` first, then write queries, then UI.
6. Run `npx tsc --noEmit` to verify no type errors before reporting done.
7. Write the migration SQL file, then tell the user to run it manually.

---

## Environment

- **Platform:** Windows 11, PowerShell
- **Dev server:** `npm run dev` → `http://localhost:3000`
- **GitHub repo:** https://github.com/FateenCatzero/scalexr-mvp
- **Branch:** `main`
- **Supabase project:** connected via `.env.local` (not committed)
- **Vercel:** deployed from GitHub (optional, set up separately)

---

## What Is NOT Built Yet

- Invite system for new staff (email invite → account creation via Supabase Auth)
- Master admin visibility into all staff across all restaurants
- Push notifications for new orders
- QR code generation (field exists in DB, UI not implemented)
- `is_out_of_stock` toggle in the admin inline menu form (only available on edit page)
