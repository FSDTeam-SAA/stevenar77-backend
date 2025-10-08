export interface IVariant {
  title: string
  quantity: number
  image?: { public_id: string; url: string } | null
}

export interface IProduct {
  _id: string
  title: string
  shortDescription: string
  category: string
  price: number
  images: { public_id: string; url: string }[]
  longDescription: string
  inStock: boolean
  featured: string[]
  totalReviews: number
  averageRating: number
  quantity: number
  variants?: IVariant[]
}
