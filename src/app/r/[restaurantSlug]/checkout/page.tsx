// Server Component thin wrapper — extracts the `table` query param and passes it
// to CheckoutClient as tableFromQR, which pre-fills the table number field.
// The param is set by CartSheet/CartPage when they forward the stored tableNumber.

import CheckoutClient from './CheckoutClient'

type Props = {
  params: Promise<{ restaurantSlug: string }>
  searchParams: Promise<{ table?: string }>
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { restaurantSlug } = await params
  const { table } = await searchParams
  return (
    <CheckoutClient
      restaurantSlug={restaurantSlug}
      tableFromQR={table ?? ''}  // empty string means "no QR table pre-fill"
    />
  )
}
