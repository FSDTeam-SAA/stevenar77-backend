export interface IClass {
  title: string
  image?: {
    public_id?: string
    url?: string
  }
  shortDescription: string
  features: string[]
  price: number
  longDescription?: string
  courseDate: Date
  location: string
  requiredAge?: number
  requiredHeight?: number
  maxDepth?: number
  courseDuration: string
  createdAt?: Date
  updatedAt?: Date
}
