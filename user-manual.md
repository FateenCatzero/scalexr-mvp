# ScaleXR — User Manual & Operations Guide

> **Living Document** — Update this file whenever a feature is added, changed, or removed.
> Last reviewed: 2026-05-16

---

## Table of Contents

1. [Overview](#1-overview)
2. [Portal Directory](#2-portal-directory)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [New Restaurant Setup Guide](#4-new-restaurant-setup-guide)
5. [Asset Upload Guide](#5-asset-upload-guide)
6. [Customer Ordering Flow](#6-customer-ordering-flow)
7. [Waiter Workflow](#7-waiter-workflow)
8. [Kitchen Workflow](#8-kitchen-workflow)
9. [Analytics Guide](#9-analytics-guide)
10. [Troubleshooting](#10-troubleshooting)
11. [Deployment & Environment Info](#11-deployment--environment-info)
12. [Changelog](#12-changelog)

---

## 1. Overview

### What is ScaleXR?

ScaleXR is a **QR-code-based restaurant ordering platform** built for the Pakistani market. It lets restaurants offer their customers a fully digital ordering experience — from scanning a table QR code, to browsing a 3D interactive menu, to placing an order that lands directly on the waiter's and kitchen's screens.

### Core Features

| Feature | Description |
|---|---|
| **QR Ordering** | Each table gets a unique QR code. Customers scan it to open the menu with their table number pre-filled. |
| **2D Menu** | Standard photo-based menu with categories, prices (PKR), and availability toggles. |
| **3D Viewer** | Customers can rotate and inspect a 3D model of any dish before ordering. |
| **AR Viewer** | Customers can place a dish on their real table using their phone camera (iOS and Android). |
| **Cart & Checkout** | Add items, adjust quantities, confirm table number, and place an order. |
| **Live Order Tracking** | Customers see their order status update in real-time after placing. |
| **Waiter Portal** | Waiters receive incoming orders, confirm them, and push them to the kitchen. |
| **Kitchen Portal** | Kitchen staff see confirmed orders and update status (preparing → ready → delivered). |
| **Admin Dashboard** | Each restaurant manages its own menu, tables, QR codes, settings, and analytics. |
| **Master Admin** | Platform owner can create, suspend, or activate restaurants and view audit logs. |
| **Analytics** | Tracks menu views, item views, 3D views, AR launches, orders, and revenue. |

---

### How It All Connects — Order Flow

```
Customer scans QR code at table
        │
        ▼
Menu loads (table number pre-filled)
        │
        ▼
Customer browses menu, views 3D/AR
        │
        ▼
Customer adds items to cart
        │
        ▼
Customer places order → status: PENDING
        │
        ▼
Waiter receives order notification
        │
        ▼
Waiter confirms order → status: CONFIRMED
        │
        ▼
Kitchen receives confirmed order → status: PREPARING
        │
        ▼
Kitchen marks order ready → status: READY
        │
        ▼
Waiter delivers to table → status: DELIVERED
```

---

## 2. Portal Directory

All portals are part of the same web application. Replace `[your-domain]` with the live production URL.

---

### Master Admin Portal

| | |
|---|---|
| **Purpose** | Platform owner controls all restaurants — create, suspend, activate, view platform-wide stats and audit logs |
| **URL** | `https://[your-domain]/admin/master` |
| **Login** | `https://[your-domain]/admin/login` |
| **Access** | Master admins only |
| **Notes** | Only accounts with `role = master_admin` in the database can access this. All others are redirected to the login page. |

---

### Restaurant Admin Portal

| | |
|---|---|
| **Purpose** | Restaurant managers control their own menu, categories, items, 3D models, table QR codes, settings, and analytics |
| **URL** | `https://[your-domain]/admin/[restaurant-slug]` |
| **Login** | `https://[your-domain]/admin/login` |
| **Access** | Restaurant admins only |
| **Notes** | Each restaurant has a unique slug. An admin from Restaurant A cannot access Restaurant B's portal. |

**Sub-pages within the Restaurant Admin Portal:**

| Page | URL |
|---|---|
| Dashboard | `/admin/[slug]` |
| Menu Management | `/admin/[slug]/menu` |
| Add New Item | `/admin/[slug]/menu/new` |
| Edit Item | `/admin/[slug]/menu/[itemId]/edit` |
| Bulk 3D Model Upload | `/admin/[slug]/menu/models` |
| Table & QR Management | `/admin/[slug]/tables` |
| Analytics | `/admin/[slug]/analytics` |
| Settings | `/admin/[slug]/settings` |

---

### Waiter Portal

| | |
|---|---|
| **Purpose** | Waiters view incoming customer orders, confirm them with the customer, and push them to the kitchen |
| **URL** | `https://[your-domain]/staff/[restaurant-slug]/waiter` |
| **Access** | No login required — designed for shared tablets at the restaurant |
| **Notes** | Any person who knows the URL can access it. Keep the URL internal. |

---

### Kitchen Portal

| | |
|---|---|
| **Purpose** | Kitchen staff view confirmed orders, mark them as preparing, ready, and delivered |
| **URL** | `https://[your-domain]/staff/[restaurant-slug]/kitchen` |
| **Access** | No login required — designed for a dedicated kitchen screen |
| **Notes** | Same as waiter portal — access is controlled by who knows the URL. |

---

### Customer Menu Portal

| | |
|---|---|
| **Purpose** | Customers browse the menu, view 3D/AR food models, add items to cart, place orders, and track order status |
| **URL (via QR code)** | `https://[your-domain]/r/[restaurant-slug]?table=[table-number]` |
| **URL (without table)** | `https://[your-domain]/r/[restaurant-slug]` |
| **Access** | Public — no login required |
| **Notes** | The `?table=` query parameter is encoded into each QR code. When a customer scans a table's QR code, the table number is automatically pre-filled at checkout. |

**Customer sub-pages:**

| Page | URL |
|---|---|
| Menu listing | `/r/[slug]` |
| Item detail (2D/3D/AR) | `/r/[slug]/item/[itemId]` |
| Cart | `/r/[slug]/cart` |
| Checkout | `/r/[slug]/checkout` |
| Order status (live) | `/r/[slug]/order/[orderId]` |

---

### Admin Login & Password Reset

| Page | URL |
|---|---|
| Login / Sign Up | `https://[your-domain]/admin/login` |
| Password Reset | `https://[your-domain]/admin/reset-password` |

---

## 3. User Roles & Permissions

### Role Summary

| Role | Authentication | Portal |
|---|---|---|
| Master Admin | Email + password | `/admin/master` |
| Restaurant Admin | Email + password | `/admin/[slug]` |
| Waiter | No login (URL access) | `/staff/[slug]/waiter` |
| Kitchen Staff | No login (URL access) | `/staff/[slug]/kitchen` |
| Customer | No login | `/r/[slug]` |

---

### Master Admin

The platform owner. There is typically only one master admin account, though multiple can exist in the database.

**Can do:**
- View all restaurants on the platform
- Create new restaurant entries
- Suspend (deactivate) any restaurant — hidden from customers immediately
- Re-activate a suspended restaurant
- Edit any restaurant's name and description
- View platform-wide stats: total restaurants, active count, orders today, new this month
- View the audit log of all master admin actions
- Navigate into any restaurant's admin dashboard as a visitor

**Cannot do:**
- Directly edit menu items (must enter the restaurant's own admin portal)
- Create admin accounts for restaurants (the restaurant owner creates their own account at signup using the slug)
- Delete restaurants permanently (only suspend/activate)

---

### Restaurant Admin

A restaurant owner or manager. Each admin is linked to one restaurant by their slug at signup.

**Can do:**
- Manage categories (create, rename, delete)
- Manage menu items (add, edit, delete, toggle available/unavailable, toggle out of stock)
- Upload item photos (JPG, PNG, WebP)
- Upload 3D models (GLB for 3D viewer + Android AR)
- Upload AR models (USDZ for iOS AR)
- Create and manage table entries
- Download QR codes as PNG files for printing
- View analytics (menu views, item views, AR launches, orders, revenue)
- Edit restaurant name, description, and logo
- Reset their own password

**Cannot do:**
- Access another restaurant's admin portal
- Access the master admin portal
- Delete orders
- Access the waiter or kitchen portals (those are URL-only, no admin account required)

---

### Waiter

A front-of-house staff member using the waiter portal on a shared tablet.

**Can do:**
- View all incoming (pending) orders for their restaurant
- View currently active orders (confirmed/preparing/ready)
- Confirm a pending order (pushes it to kitchen)
- Cancel a pending order
- Edit a confirmed order (change item quantities or remove items before it goes to kitchen)
- Mark an order as delivered
- Request bill / mark complete

**Cannot do:**
- Log in (no account needed)
- Access the admin portal
- Modify the menu
- View analytics

---

### Kitchen Staff

Back-of-house staff using the kitchen portal on a dedicated screen.

**Can do:**
- View all confirmed orders in a queue
- View orders currently being prepared
- Mark an order as "Preparing"
- Mark an order as "Ready"
- Mark an order as "Delivered"

**Cannot do:**
- See pending orders (those haven't been confirmed by a waiter yet)
- Edit or cancel orders
- Access any admin or waiter portal
- View customer details beyond table number and items

---

### Customer / Guest

Anyone who scans a QR code or visits the customer URL.

**Can do:**
- Browse the full menu
- Filter by category
- View 2D item photos
- Launch the 3D viewer for any item with a GLB model
- Launch AR on Android (GLB via Scene Viewer) or iOS (USDZ via Quick Look)
- Add items to cart, adjust quantities
- Place an order with a table number and optional name
- Track their order status in real-time

**Cannot do:**
- Access any admin, waiter, or kitchen portal
- Modify or cancel an order after placing it
- View other customers' orders

---

## 4. New Restaurant Setup Guide

Follow these steps **in order** to fully onboard a new restaurant client.

---

### Step 1 — Create the Restaurant (Master Admin)

1. Log in at `https://[your-domain]/admin/login` with your **master admin** credentials.
2. You will be redirected to the Master Admin Dashboard (`/admin/master`).
3. Tap the **"+ New"** button in the Restaurants section.
4. Fill in:
   - **Restaurant name** — e.g., `Karahi Palace`
   - **URL slug** — auto-generated from the name, e.g., `karahi-palace`. This becomes part of every URL for this restaurant. It cannot be changed later without breaking QR codes.
   - **Description** (optional)
5. Tap **"Create restaurant"**.
6. You will see a confirmation panel with:
   - The **signup URL**: `https://[your-domain]/admin/login`
   - The **slug** they will need during signup.

> **Share with the restaurant owner:**
> "Go to [signup URL]. Create an account, and when asked for your restaurant slug, enter: `karahi-palace`"

---

### Step 2 — Restaurant Admin Creates Their Account

The restaurant owner:
1. Goes to `https://[your-domain]/admin/login`.
2. Switches to **"Create account"** mode.
3. Enters their email, a password, and their restaurant slug.
4. Their account is created and linked to the restaurant.
5. They are now logged in to the Restaurant Admin Portal.

---

### Step 3 — Create Categories

Inside the Restaurant Admin Portal at `/admin/[slug]/menu`:

1. Scroll to the **Categories** tab.
2. Tap **"+ Add category"**.
3. Enter a category name (e.g., `Starters`, `Mains`, `Drinks`, `Desserts`).
4. Repeat for all categories.
5. Categories appear as filter tabs on the customer menu in the order you create them.

---

### Step 4 — Add Menu Items

Still in the Menu tab:

1. Tap **"+ Add item"** (top of the page) or navigate to `/admin/[slug]/menu/new`.
2. Fill in:
   - **Photo** — upload a clear, high-quality photo of the dish
   - **Name** — e.g., `Chicken Karahi`
   - **Description** (optional) — ingredient highlights, spice level, etc.
   - **Price** — in PKR, e.g., `850`
   - **Category** — select from your created categories
   - **Available** toggle — turn off to hide the item completely from the menu
3. Tap **"Add item"**.
4. The item now appears in the menu list.

---

### Step 5 — Upload Item Photos

Photos can be uploaded during item creation or editing.

1. In the item form, tap the **photo upload area**.
2. Either:
   - Click to open a file browser and select an image
   - Drag and drop an image file onto the upload area
3. Supported formats: **JPG, PNG, WebP**
4. The image is uploaded to Supabase Storage and the URL is saved automatically.

> **Tip:** Use square or landscape photos. At least 800×800px recommended for clear display.

---

### Step 6 — Upload 3D Models (GLB)

GLB files enable the **3D viewer** and **Android AR**.

1. Go to `/admin/[slug]/menu/[itemId]/edit` for the item you want to add a model to,
   OR use the bulk upload page at `/admin/[slug]/menu/models` to upload for all items at once.
2. In the **"GLB model"** slot, tap the upload area or drag a `.glb` file onto it.
3. The file uploads to Supabase Storage.
4. The item's `has_3d_model` flag is automatically set to `true`.
5. A **"3D"** badge now appears on the item card in the customer menu.

> **Note:** GLB is the universal 3D format. It handles both the in-app 3D viewer and Android AR (Google Scene Viewer).

---

### Step 7 — Upload iOS AR Models (USDZ)

USDZ files add **iOS AR** via Apple Quick Look.

1. In the same edit page or bulk models page, use the **"USDZ model"** slot.
2. Upload a `.usdz` or `.reality` file.
3. The item's `has_ar` flag is set to `true`.
4. An **"AR"** badge appears on the item in the customer menu.

> **Note:** USDZ is required for AR on iPhones. Android AR works with GLB alone. For full cross-platform AR, upload both formats.

---

### Step 8 — Generate Table QR Codes

1. Go to `/admin/[slug]/tables`.
2. In the text field, enter a table identifier — can be a number (`1`, `2`, `3`) or a name (`Window`, `Patio A`).
3. Tap **"Add"** or press Enter.
4. A QR code is generated instantly in the browser.
5. Tap **"Download PNG"** to save the QR code image.
6. Print and place it on the physical table.

> **How the QR code works:** Each code encodes the URL `https://[your-domain]/r/[slug]?table=[table-number]`. When a customer scans it, the menu opens with their table number already filled in.

> **Important:** Once a QR code is printed and distributed, do not delete or change the table entry — the QR code will stop working. If you need to retire a table, keep the entry and just stop using the physical code.

---

### Step 9 — Set Up the Waiter Tablet

1. Open a browser on the waiter's tablet.
2. Navigate to `https://[your-domain]/staff/[restaurant-slug]/waiter`.
3. Bookmark or add to home screen.
4. No login is needed — the page is always accessible.

> **Security note:** Do not share this URL with customers. The URL itself is the access control.

---

### Step 10 — Set Up the Kitchen Screen

1. Open a browser on the kitchen's screen or tablet.
2. Navigate to `https://[your-domain]/staff/[restaurant-slug]/kitchen`.
3. Bookmark or add to home screen.
4. No login is needed.

---

### Step 11 — Test the Full Order Flow

Before going live, do a complete end-to-end test:

- [ ] Scan one of the table QR codes with a phone
- [ ] Verify the menu loads with the correct table number
- [ ] Browse to an item with a 3D model — confirm the 3D viewer opens
- [ ] Try the AR button (Android and iOS if possible)
- [ ] Add 2-3 items to cart
- [ ] Proceed to checkout — confirm table number is pre-filled
- [ ] Place the order
- [ ] On the waiter tablet — confirm the order appears under "Incoming"
- [ ] Confirm the order on the waiter portal
- [ ] On the kitchen screen — confirm the order appears
- [ ] Mark it as "Preparing", then "Ready", then "Delivered"
- [ ] On the customer's phone — confirm the status updates in real-time
- [ ] Check analytics at `/admin/[slug]/analytics` — verify the view and order events recorded

---

## 5. Asset Upload Guide

### 2D Photos (Menu Item Images)

| Property | Details |
|---|---|
| **Accepted formats** | JPG, PNG, WebP |
| **Recommended size** | Minimum 800 × 800 px |
| **Aspect ratio** | Square or landscape (1:1 or 4:3) |
| **Max file size** | Determined by Supabase Storage policy (default: 50 MB) |
| **Where stored** | `restaurant-assets` Supabase Storage bucket at path `restaurants/{restaurantId}/menu/{timestamp}.{ext}` |

**Best practices:**
- Use good lighting and a plain or neutral background.
- Avoid text or watermarks — they look unprofessional at small sizes.
- Keep file size under 2 MB for fast loading on mobile.
- Use consistent aspect ratios across all items for a clean grid.

---

### GLB Models (3D Viewer + Android AR)

| Property | Details |
|---|---|
| **Accepted format** | `.glb` |
| **What it enables** | In-app 3D viewer (all platforms) + AR on Android via Google Scene Viewer |
| **Where stored** | `restaurant-assets` bucket at path `restaurants/{restaurantId}/models/{itemId}.glb` |
| **Recommended poly count** | Under 50,000 polygons for smooth mobile performance |
| **Recommended file size** | Under 10 MB for reasonable load times on mobile |
| **Textures** | Embed textures inside the GLB (not separate files) |

**Best practices:**
- Export from Blender, Cinema 4D, or any tool that supports glTF 2.0 / GLB.
- Use `Draco` compression if your tool supports it — cuts file size 60–80%.
- Include a physically-based material (PBR) for realistic lighting.
- Test the file on Google's [model-viewer editor](https://modelviewer.dev/editor/) before uploading.
- Name your files descriptively before upload (the storage path uses the item ID, but good filenames help during production).

**Uploading a GLB:**
1. Go to `/admin/[slug]/menu/[itemId]/edit` OR `/admin/[slug]/menu/models`
2. Drag and drop the `.glb` file onto the **"GLB model"** upload slot
3. Wait for the progress indicator to finish
4. The slot will show the filename and a delete button — upload is complete

---

### USDZ Models (iOS AR via Apple Quick Look)

| Property | Details |
|---|---|
| **Accepted formats** | `.usdz`, `.reality` |
| **What it enables** | AR on iPhone and iPad via Apple Quick Look |
| **Where stored** | `restaurant-assets` bucket at path `restaurants/{restaurantId}/models/{itemId}.usdz` |
| **Recommended file size** | Under 20 MB (Quick Look has generous limits but large files are slow to load) |

**Best practices:**
- Convert your GLB to USDZ using Apple's `Reality Converter` app (free, macOS only) or using online converters.
- Test USDZ files directly on an iPhone before uploading — open the file in Safari to trigger Quick Look.
- USDZ scale matters: 1 unit in USDZ = 1 meter. Scale your model so a plate is roughly 25 cm across.
- If you only have a GLB and need USDZ, use [Reality Converter](https://developer.apple.com/augmented-reality/tools/) or `usdzconvert` CLI.

---

### Troubleshooting Failed Uploads

| Problem | Cause | Fix |
|---|---|---|
| Upload hangs / never finishes | Network timeout or large file | Try a smaller file; check your internet connection |
| "Failed to upload" error | Supabase Storage policy violation or bucket missing | Verify the `restaurant-assets` bucket exists and is public |
| 3D badge doesn't appear after GLB upload | Flag update query failed | Refresh the page; if still missing, check Supabase `item_assets` table for the record |
| Image shows broken icon after upload | Image URL saved but file missing from storage | Re-upload the image |
| USDZ not triggering Quick Look on iPhone | Wrong MIME type served | Ensure Supabase serves `.usdz` with MIME type `model/vnd.usdz+zip` |

---

## 6. Customer Ordering Flow

This section describes the experience from a customer's perspective.

---

### Step 1 — Scan the QR Code

The customer uses their phone camera (or a QR scanner app) to scan the QR code on their table.

- The browser opens automatically to the restaurant's menu.
- The URL includes `?table=X` — the table number is captured silently in the background.
- No app download is required.

---

### Step 2 — Browse the Menu

- The menu loads with all **available** items displayed in a scrollable grid.
- Items that are marked **out of stock** appear with a greyed-out badge but are still visible.
- Items toggled **unavailable** are hidden completely.
- Category filter tabs appear at the top — tapping a category scrolls and filters to that section.

---

### Step 3 — View a 2D Item

Tapping any item card opens the item detail page (`/r/[slug]/item/[itemId]`).

- A large photo of the dish is shown.
- Name, description, and price are displayed.
- An **"Add to cart"** button appears at the bottom.

---

### Step 4 — Open the 3D Viewer

If the item has a 3D model (GLB uploaded):

- A **"View in 3D"** button appears on the item detail page.
- Tapping it loads the 3D viewer directly in the browser — no app needed.
- The customer can rotate, zoom in/out, and inspect the dish from any angle.

---

### Step 5 — Launch AR

If the item has AR assets:

**On Android:**
- A **"View in AR"** button appears.
- Tapping it opens Google Scene Viewer — the dish appears on the customer's table through the camera.

**On iOS:**
- A **"View in AR"** button appears.
- Tapping it opens Apple Quick Look — the dish appears in AR using the USDZ file.

> **Note:** AR requires a device with ARCore (Android) or ARKit (iOS). Older devices may not support AR.

---

### Step 6 — Add to Cart

- Tap **"Add to cart"** on the item detail page or the `+` button on the item card.
- A cart icon with item count appears at the bottom of the screen.
- Tap the cart icon to open a cart summary panel.
- Increase or decrease quantities using `+` / `−` buttons.
- Remove an item by reducing its quantity to zero.

---

### Step 7 — Proceed to Checkout

1. Tap **"Checkout"** in the cart panel.
2. The checkout page shows an order summary.
3. The **table number** field is pre-filled from the QR code scan.
4. The customer can optionally enter their name.
5. Review the total amount (in PKR).
6. Tap **"Place Order"**.

---

### Step 8 — Order Placed

- The order is created with status **"Pending"**.
- The customer is taken to the order status page (`/r/[slug]/order/[orderId]`).
- A progress bar shows: Pending → Confirmed → Preparing → Ready → Delivered.
- The page updates **in real-time** — no refresh needed.

---

### Step 9 — Wait for Waiter Confirmation

- A waiter will see the order on the waiter portal and come to the table to confirm.
- When the waiter confirms, the status changes to **"Confirmed"** on the customer's screen.

---

### Step 10 — Track Order Progress

The customer can leave the order status page and return to it at any time — the order ID is stored in their browser session.

Status progression:
| Status | Meaning |
|---|---|
| **Pending** | Order placed, waiting for waiter |
| **Confirmed** | Waiter has acknowledged the order |
| **Preparing** | Kitchen is cooking |
| **Ready** | Food is ready at the pass |
| **Delivered** | Food delivered to the table |
| **Cancelled** | Order was cancelled by staff |

---

## 7. Waiter Workflow

The waiter portal is at `https://[your-domain]/staff/[restaurant-slug]/waiter`.

Open it on a tablet. Keep it open throughout service — it updates in real-time.

---

### Section 1 — Incoming Orders (Pending)

This section shows all orders customers have placed but that have not yet been confirmed.

**For each order you see:**
- Table number
- Customer name (if provided)
- List of items and quantities
- Total amount
- Time the order was placed

**Actions available:**
1. **Confirm** — Go to the table, verify with the customer, then tap Confirm. The order moves to "Active Orders" and appears on the kitchen screen.
2. **Cancel** — Tap Cancel if the order was placed in error. The customer's status page will show "Cancelled".
3. **Edit** — Tap the edit icon to open the order editor. You can:
   - Increase or decrease the quantity of any item
   - Set an item's quantity to 0 to remove it
   - Tap "Save changes" — the order totals update automatically

---

### Section 2 — Active Orders (Confirmed / Preparing / Ready)

This section shows all orders currently in progress.

- **Confirmed** — Sent to kitchen, waiting for kitchen to start
- **Preparing** — Kitchen is cooking
- **Ready** — Food is at the pass, ready to deliver

When an order shows **"Ready"**, go to the kitchen pass, collect the food, and deliver it.

**After delivering:**
- Tap **"Delivered"** on the order card.
- The order moves to completed and disappears from this section.

---

### Section 3 — Completed Orders

Shows delivered and cancelled orders from the current session. Useful for reviewing what has gone out.

---

### Tips for Waiters

- Keep the tablet screen always on and brightness high.
- The portal updates via Supabase Realtime — you do not need to refresh manually.
- If an order stops updating, refresh the page once.
- Confirm orders promptly — customers see "Pending" on their phone and may be waiting.

---

## 8. Kitchen Workflow

The kitchen portal is at `https://[your-domain]/staff/[restaurant-slug]/kitchen`.

Set this up on a dedicated screen in the kitchen (a tablet, monitor, or TV with a browser).

---

### Section 1 — Order Queue (Confirmed)

Shows all orders that have been confirmed by a waiter and are ready for the kitchen to begin.

Each card shows:
- Table number
- List of dishes and quantities
- Time the order was confirmed

**Action:**
- Tap **"Start preparing"** when you begin cooking the order.
- The order moves to "In Progress".

---

### Section 2 — In Progress (Preparing)

Shows all orders currently being cooked.

**Action:**
- Tap **"Mark ready"** when the food is plated and at the pass.
- The waiter portal updates to show the order as "Ready".

---

### Tips for Kitchen Staff

- Work through the queue in order (oldest orders first — check the timestamp).
- The screen updates in real-time via Supabase Realtime.
- If the screen stops updating, refresh once.
- "Delivered" status is set by the waiter, not the kitchen.

---

## 9. Analytics Guide

The analytics dashboard is at `/admin/[slug]/analytics`.

It shows data for the selected time period: **Today**, **Last 7 days**, or **Last 30 days**.

---

### Metrics Explained

| Metric | What it means |
|---|---|
| **Menu Views** | Number of times the menu page (`/r/[slug]`) was opened — counts unique visits per session |
| **Item Views** | Number of times a specific item detail page was opened |
| **3D Views** | Number of times the 3D viewer was launched for any item |
| **AR Launches** | Number of times the AR button was tapped (intent was to launch AR) |
| **Orders** | Total non-cancelled orders placed in the period |
| **Revenue** | Sum of total_amount across all non-cancelled orders (PKR) |
| **Active Items** | Current count of items marked as "Available" on the menu |

---

### Top Items Table

The analytics page also shows a **Top Items** table — the items with the most 3D views and AR launches combined.

This tells you:
- Which dishes customers are most curious about in 3D
- Which items might benefit from a higher-quality 3D model
- Which items attract interest but may not be converting to orders (compare top viewed vs ordered)

---

### How to Use Analytics

**Daily check:**
- Look at Orders and Revenue for today — compare to yesterday mentally.
- If menu views are high but orders are low, something may be stopping customers (slow load, price, unavailable items).

**Weekly review:**
- Identify which items are viewed most in 3D/AR.
- Consider adding or improving models for popular items that currently lack 3D assets.

**Monthly review:**
- Compare revenue week-over-week.
- Check if AR launches are growing — a sign that customers are engaging with the experience.
- Review which categories drive the most orders.

> **Note:** Analytics data refreshes every 30 seconds automatically on the analytics page.

---

## 10. Troubleshooting

### Customer-Facing Issues

---

**QR code not opening the menu**

| Check | Solution |
|---|---|
| Is the restaurant active? | Log into master admin and verify the restaurant is not suspended |
| Is the URL in the QR code correct? | Scan the code with a phone and read the URL — compare to `/r/[slug]?table=[n]` |
| Is the QR code physically damaged? | Reprint from the admin tables page |
| Is the restaurant's menu empty? | Add at least one available item |

---

**Item not visible on the menu**

| Check | Solution |
|---|---|
| Is the item marked "Available"? | Go to admin menu and toggle the Available switch on |
| Is the item marked "Out of stock"? | If out of stock, it still shows but is greyed out — toggle if needed |
| Is it in a filtered category? | Tell customer to tap "All" on the category filter |
| Is the restaurant suspended? | Check master admin dashboard |

---

**3D model not loading**

| Check | Solution |
|---|---|
| Has a GLB been uploaded for this item? | Check `/admin/[slug]/menu/[itemId]/edit` — the GLB slot should show a file |
| Is the item's `has_3d_model` flag set? | If the slot shows a file but no 3D button appears, try re-uploading the GLB |
| Is the file too large? | Large GLB files (>20 MB) may time out on slow mobile connections — optimize the model |
| Is the browser modern? | model-viewer requires a modern browser; very old devices may not support it |

---

**AR not opening on Android**

| Check | Solution |
|---|---|
| Does the device support ARCore? | Check Google Play → Search "ARCore" — if not available, device is unsupported |
| Is Google Play Services up to date? | Update Google Play Services on the device |
| Does the item have a GLB? | Android AR requires a GLB file — check the item's edit page |

---

**AR not opening on iPhone**

| Check | Solution |
|---|---|
| Does the item have a USDZ? | iOS AR requires a USDZ file — check the item's edit page |
| Is iOS 12 or newer? | Quick Look AR requires iOS 12+ |
| Is the customer using Safari? | Quick Look only works in Safari on iOS — Chrome and other browsers on iOS will not trigger it |

---

### Staff Portal Issues

---

**Waiter not receiving orders**

| Check | Solution |
|---|---|
| Is the waiter portal URL for the correct restaurant slug? | Double-check the URL — each restaurant has its own waiter portal |
| Is the screen awake? | Keep screen always-on enabled on the tablet |
| Has Realtime disconnected? | Refresh the page once to re-establish the Supabase Realtime connection |
| Are customers actually placing orders? | Check the admin dashboard for recent orders |

---

**Kitchen not updating when orders are confirmed**

| Check | Solution |
|---|---|
| Same Realtime connection issue | Refresh the kitchen screen |
| Is the kitchen portal for the right restaurant? | Verify the slug in the URL |
| Did the waiter confirm (not just receive)? | Kitchen only receives orders after the waiter taps "Confirm" |

---

### Admin Login Issues

---

**Cannot log in**

| Check | Solution |
|---|---|
| Wrong email or password | Use "Forgot password?" to reset |
| Account not created yet | Go to login page → switch to "Create account" |
| Wrong restaurant slug at signup | Contact master admin — the slug is stored at account creation and cannot change |

---

**Forgot password / password reset**

1. Go to `https://[your-domain]/admin/login`
2. Tap **"Forgot password?"**
3. Enter your email address
4. Check your inbox for a reset email from Supabase
5. Click the link in the email — it opens the reset page (`/admin/reset-password`)
6. Enter a new password (minimum 6 characters) and confirm it
7. Tap "Update password"
8. You are redirected to the login page after 2 seconds

> **Note:** The reset link in the email expires after a short time. If it doesn't work, request a new one.

---

**Master admin accidentally visits a restaurant admin page**

When a master admin visits `/admin/[slug]`, they see the restaurant's admin dashboard with an **amber banner** at the top reading "Viewing as Master Admin". This is normal and expected — it lets the master admin inspect any restaurant's settings without pretending to be that restaurant's admin.

---

## 11. Deployment & Environment Info

> **Security reminder:** Never share or commit secret keys. This section uses placeholders only.

---

### Production Environment

| Property | Value |
|---|---|
| **Production URL** | `https://[your-domain]` |
| **Platform** | Vercel (Next.js App Router) |
| **Database** | Supabase (PostgreSQL + Realtime) |
| **Storage** | Supabase Storage — bucket: `restaurant-assets` (public) |
| **Auth** | Supabase Auth (email + password) |

---

### Environment Variables

These must be set in your Vercel project settings (or `.env.local` for local development):

```env
NEXT_PUBLIC_SUPABASE_URL=         # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon (public) key
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service role key (server-side only, never expose)
```

> `NEXT_PUBLIC_` prefixed variables are safe to expose to the browser.
> `SUPABASE_SERVICE_ROLE_KEY` must never be exposed — it bypasses Row Level Security.

---

### Supabase Project

| Resource | Details |
|---|---|
| **Dashboard** | `https://app.supabase.com` |
| **Tables** | restaurants, users, categories, menu_items, item_assets, restaurant_tables, orders, order_items, analytics_events, admin_logs |
| **Storage bucket** | `restaurant-assets` (must be set to public) |
| **Auth provider** | Email / Password |
| **Realtime** | Enabled on `orders` table for live order status updates |

---

### Key Database Tables

| Table | Purpose |
|---|---|
| `restaurants` | One row per restaurant; includes slug, name, is_active flag |
| `users` | Auth users with role (`master_admin` or `restaurant_admin`) and restaurant_id link |
| `categories` | Menu categories per restaurant |
| `menu_items` | All menu items with price, availability, 3D/AR flags |
| `item_assets` | GLB and USDZ file records per menu item |
| `restaurant_tables` | Table entries with table_number; soft-deleted via is_active=false |
| `orders` | Customer orders with status, table_number, total_amount |
| `order_items` | Line items within an order (menu_item_id, quantity, unit_price) |
| `analytics_events` | Raw event log (menu_view, item_view, 3d_view, ar_view) |
| `admin_logs` | Audit log of master admin actions (create, suspend, activate) |

---

### Local Development

```bash
# Clone repository
git clone https://github.com/[your-org]/scalexr-mvp.git
cd scalexr-mvp

# Install dependencies
npm install

# Add environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
# → http://localhost:3000
```

---

## 12. Changelog

Track all significant changes here. Add a new entry at the top whenever a feature is added, modified, or removed.

---

### 2026-05-16 — Initial Release

- Launched ScaleXR MVP
- Customer menu portal with 2D, 3D, and AR viewing
- Cart and checkout flow with table number pre-fill from QR codes
- Real-time order status tracking for customers
- Waiter portal with pending/active/completed order sections
- Kitchen portal with queue and in-progress sections
- Restaurant Admin Portal: menu management (inline editing), category management, table/QR management, analytics, settings
- Master Admin Portal: restaurant CRUD, platform stats, suspend/activate, audit logs
- Admin login, signup (with slug linking), and password reset via Supabase email
- Supabase Realtime subscriptions on orders table for waiter and kitchen portals
- Analytics tracking: menu_view, item_view, 3d_view, ar_view events
- GLB upload for 3D viewer + Android AR (Google Scene Viewer)
- USDZ upload for iOS AR (Apple Quick Look)
- Bulk 3D model upload page (all items in one place)
- PKR currency throughout

---

> **How to update this changelog:**
> When you ship a change, add a new `### YYYY-MM-DD — Description` section at the top of this list.
> Include bullet points for every feature added, changed, or removed.
> Be specific — "Fixed QR download button not working on Safari" is better than "Bug fix".

---

*ScaleXR User Manual — maintained by the ScaleXR team. Questions? Contact the platform owner.*
