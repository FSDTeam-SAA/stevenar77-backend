export interface IClassDate {
  date: Date;
  location?: string;
  type: "pool" | "islands";
  isActive?: boolean;
}

export interface IAddOnce {
  title: string;
  price: number;
}

export interface IImage {
  public_id?: string;
  url?: string;
}

export interface ISchedule {
  title: string;
  description?: string;
  participents?: number;
  totalParticipents?: number;
  sets: IClassDate[];
}

export interface IClass {
  title: string;
  image?: IImage;
  description?: string;
  price: number[];
  courseIncludes: string[];
  duration: string;
  totalReviews?: number;
  avgRating?: number;
  isActive?: boolean;
  index?: number;
  formTitle?: string[];
  maxAge?: number;
  minAge?: number;
  location?: string;
  addOnce?: IAddOnce[];
  schedule?: ISchedule[];
}
