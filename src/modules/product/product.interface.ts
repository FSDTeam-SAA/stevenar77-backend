export interface IProduct {
  _id: string;
  title: string;
  shortDescription: string;
  price: number;
  images?: {
    public_id?: string;
    url?: string;
  };
  longDescription: string;
  inStock: boolean;
  featured: string[];
  totalReviews: number;
  averageRating: number;
}
