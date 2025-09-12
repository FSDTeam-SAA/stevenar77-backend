import { Request, Response, NextFunction } from "express";
import { Class } from "./class.model";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import AppError from "../../errors/AppError";
import { IClass } from "./class.interface";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../utils/cloudinary";

// Create a new class
export const createClass = catchAsync(async (req, res) => {
  console.log(req.file);

  if (req.file) {
    const image = await uploadToCloudinary(req.file.path, "classes");
    // if (image.public_id) {
    //   await deleteFromCloudinary(image.public_id);
    // }

    req.body.image = {
      public_id: image.public_id,
      url: image.secure_url,
    };
  }

  console.log(req.body);

  const newClass = await Class.create({
    ...req.body,
    image: req.body.image,
  });

  sendResponse<IClass>(res, {
    statusCode: 201,
    success: true,
    message: "Class created successfully",
    data: newClass,
  });
});

// Edit/Update a class by ID
export const updateClass = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const updatedClass = await Class.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedClass) {
      return next(new AppError("Class not found", 404));
    }

    sendResponse<IClass>(res, {
      statusCode: 200,
      success: true,
      message: "Class updated successfully",
      data: updatedClass,
    });
  }
);

// Get all classes (with simple pagination)
export const getAllClasses = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [total, classes] = await Promise.all([
    Class.countDocuments(),
    Class.find().skip(skip).limit(limit).sort({ courseDate: 1 }),
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

// Delete a class by ID
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

// Get single class by ID
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
