import { Types } from "mongoose";

export interface ICourse {
  title: string;
  images?: [
    {
      public_id?: string;
      url?: string;
    }
  ];
  courseLevel: "beginner" | "intermediate" | "advanced";
  shortDescription: string;
  features: string[];
  price: number;
  longDescription?: string;
  courseStartDate: Date;
  courseEndDate: Date;
  location: string;
  requiredAge?: number;
  requiredHeight?: number;
  maxDepth?: number;
  courseDuration: string;
  isActive: boolean;
  instructor: Types.ObjectId;
  totalEnrolled: number;
}
