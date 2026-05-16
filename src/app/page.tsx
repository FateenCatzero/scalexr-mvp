import { redirect } from 'next/navigation'

// Root page — the platform has no public landing page.
// Visiting the root URL immediately redirects to the admin login screen.
// Customers always enter through a restaurant-specific URL (/r/[slug]) from a QR code.
export default function Home() {
  redirect('/admin/login')
}
