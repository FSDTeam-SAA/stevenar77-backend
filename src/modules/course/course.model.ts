import { model, Schema } from "mongoose";
import { ICourse } from "./course.interface";

const courseSchema = new Schema<ICourse>({
  title: { type: String, required: true },
  image: {
    public_id: { type: String },
    url: { type: String },
  },
  courseLevel: {
    type: String,
    enum: ["beginner", "intermediate", "advanced"],
    required: true,
  },
  shortDescription: { type: String, required: true },
  features: { type: [String], default: [] },
  price: { type: Number, required: true },
  longDescription: { type: String },
  courseStartDate: { type: Date, required: true },
  courseEndDate: { type: Date, required: true },
  location: { type: String, required: true },
  requiredAge: { type: Number },
  requiredHeight: { type: Number },
  maxDepth: { type: Number },
  courseDuration: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  instructor: { type: Schema.Types.ObjectId, ref: "User", required: true },
  totalEnrolled: { type: Number, default: 0 },
});

const Course = model<ICourse>("Course", courseSchema);
export default Course;
