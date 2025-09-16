export interface IClass {
  title: string;
  image: { public_id: string; url: string };
  description?: string;
  price: number[];
  courseIncludes: string[];
  duration: string;
  totalReviews?: number;
  avgRating?: number;
  totalParticipates: number;
}
