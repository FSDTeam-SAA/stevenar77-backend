export interface IClassDate {
  date: Date
  location?: string
  type: 'pool' | 'islands'
  isActive?: boolean
}

export interface IAddOnce {
  title: string
  price: number
}

export interface IImage {
  public_id?: string
  url?: string
}

export interface IClass {
  title: string
  image?: IImage
  description?: string
  price: number[]
  courseIncludes: string[]
  duration: string
  totalReviews?: number
  avgRating?: number
  participates?: number
  totalParticipates?: number
  isActive?: boolean
  index?: number
  formTitle?: string[]
  maxAge?: number
  minAge?: number
  location?: string
  addOnce?: IAddOnce[]
  schedule?: IClassDate[]
  classDates?: IClassDate[]
}
