export interface ITrip {
  title: string
  description: string
  price: number
  maximumCapacity: number
  location: string
  startDate: Date
  endDate: Date
  isActive: boolean
  images?: {
    public_id?: string
    url?: string
  }[]
  index?: number
}
