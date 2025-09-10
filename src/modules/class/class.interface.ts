export interface IClass {
  title: string;
  images?: {
    public_id?: string;
    url?: string;
  };
  courseLevel: "beginner" | "intermediate" | "advanced";
  shortDescription: string;
  features: string[];
  price: number;
  longDescription?: string;
  courseDate: Date;
  location: string;
  requiredAge?: number;
  requiredHeight?: number;
  maxDepth?: number;
  courseDuration: string;
  createdAt?: Date;
  updatedAt?: Date;
}
