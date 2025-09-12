import { Request, Response, NextFunction } from "express";
import { Class } from "./class.model";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import AppError from "../../errors/AppError";
import { IClass } from "./class.interface";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { StatusCodes } from "http-status-codes";

export const createClass = catchAsync(async (req, res) => {
  const files = req.files as any[];
  // eslint-disable-next-line prefer-const
  let images: { public_id: string; url: string }[] = [];

  if (files && files.length > 0) {
    for (const file of files) {
      const uploadResult = await uploadToCloudinary(file.path, "classes");
      if (uploadResult) {
        images.push({
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url,
        });
      }
    }
  } else {
    throw new AppError(
      "At least one image is required",
      StatusCodes.BAD_REQUEST
    );
  }
  const newClass = {
    ...req.body,
    images,
  };
  const result = await Class.create(newClass);

  sendResponse<IClass>(res, {
    statusCode: 201,
    success: true,
    message: "Class created successfully",
    data: result,
  });
});

export const updateClass = catchAsync(async (req: Request, res: Response) => {
  console.log(req.body);

  const files = req.files as any[];
  const { id } = req.params;

  const isClassExist = await Class.findById(id);
  if (!isClassExist) {
    throw new AppError("Class not found", 404);
  }

  let images = isClassExist.images || [];

  // If new files are uploaded
  if (files && files.length > 0) {
    // Optional: delete old images from Cloudinary if you want
    // for (const img of product.images) {
    //   await deleteFromCloudinary(img.public_id);
    // }

    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file.path, "classes")
    );

    const uploadedResults = await Promise.all(uploadPromises);

    images = uploadedResults.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));
  }

  console.log("images", images);

  const updatedClass = await Class.findByIdAndUpdate(
    id,
    {
      ...req.body,
      images,
    },
    { new: true, runValidators: true }
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Class updated successfully",
    data: updatedClass,
  });
});

export const getAllClasses = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [total, classes] = await Promise.all([
    Class.countDocuments(),
    Class.find()
      .skip(skip)
      .limit(limit)
      .sort({ courseDate: 1 })
      .sort({ createdAt: -1 }),
  ]);

  sendResponse<IClass[]>(res, {
    statusCode: 200,
    success: true,
    message: "Classes fetched successfully",
    data: classes,
    meta: {
      limit,
      page,
      total,
      totalPage: Math.ceil(total / limit),
    },
  });
});

export const deleteClass = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const deletedClass = await Class.findByIdAndDelete(id);
    if (!deletedClass) {
      return next(new AppError("Class not found", 404));
    }

    sendResponse<null>(res, {
      statusCode: 200,
      success: true,
      message: "Class deleted successfully",
    });
  }
);

export const getClassById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const isExist = await Class.findById(id);
  if (!isExist) {
    throw new AppError("Class not found", 404);
  }
  const singleClass = await Class.findById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Class fetched successfully",
    data: singleClass,
  });
});
