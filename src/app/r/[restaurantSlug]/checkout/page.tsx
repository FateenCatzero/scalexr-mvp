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
      tableFromQR={table ?? ''}
    />
  )
}
