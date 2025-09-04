import { Model } from "mongoose";
import { USER_ROLE } from "./user.constant";

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  street: string;
  location: string;
  postalCode: string;
  dateOfBirth: Date;
  role: string;
  image: {
    public_id: string;
    url: string;
  };
}

export interface userSchema extends Model<IUser> {
  isPasswordMatch(password: string, hashedPassword: string): Promise<boolean>;
}

export type TUserRole = keyof typeof USER_ROLE;
