export interface ITrip {
  title: string;
  description: string;
  price: number;
  maximumCapacity: number;
  location: string;
  startDate: Date;
  endDate: Date;
  images?: {
    public_id?: string;
    url?: string;
  }[];
  index?:number
}
