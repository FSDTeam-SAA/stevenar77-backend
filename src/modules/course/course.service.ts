import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../utils/cloudinary";
import { ICourse } from "./course.interface";
import Course from "./course.model";

const createCourse = async (payload: ICourse, files: any[]) => {
  let images: { public_id: string; url: string }[] = [];

  if (files && files.length === 0) {
    throw new Error("Failed to upload file to Cloudinary");
  }

  if (files && files.length > 0) {
    // upload new images
    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file.path, "courses")
    );

    const uploadedResults = await Promise.all(uploadPromises);

    images = uploadedResults.map((uploaded) => ({
      public_id: uploaded.public_id,
      url: uploaded.url,
    }));

    // delete old images if exist
    if (payload.images && payload.images.length > 0) {
      const oldImagesPublicIds = payload.images.map(
        (img) => img.public_id ?? ""
      );
      await Promise.all(
        oldImagesPublicIds.map((publicId) => deleteFromCloudinary(publicId))
      );
    }
  } else {
    // normalize existing images so they always have string values
    images = (payload.images || []).map((img) => ({
      public_id: img.public_id ?? "",
      url: img.url ?? "",
    }));
  }

  // ✅ overwrite payload images with the guaranteed safe `images`
  const course = await Course.create({
    ...payload,
    images,
  });

  return course;
};

const courseService = {
  createCourse,
};

export default courseService;
