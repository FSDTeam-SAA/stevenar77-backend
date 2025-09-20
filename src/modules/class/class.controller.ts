import { Request, Response, NextFunction } from "express";
import { Class } from "./class.model";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import AppError from "../../errors/AppError";
import { IClass } from "./class.interface";
import { uploadToCloudinary } from "../../utils/cloudinary";
import { StatusCodes } from "http-status-codes";

export const createClass = catchAsync(async (req, res) => {
  const file = req.file as Express.Multer.File;
  const { duration, ...rest } = req.body;

  if (!file) {
    throw new AppError("Image is required", StatusCodes.BAD_REQUEST);
  }

  const uploadResult = await uploadToCloudinary(file.path, "classes");

  const result = await Class.create({
    ...rest,
    duration,
    image: {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    },
  });

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Class created successfully",
    data: result,
  });
});

export const updateClass = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { duration, ...rest } = req.body;

  const updateData: any = {
    ...rest,
  };

  if (req.file) {
    const file = req.file as Express.Multer.File;
    const uploadResult = await uploadToCloudinary(file.path, "classes");

    updateData.image = {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    };
  }

  const updatedClass = await Class.findOneAndUpdate(
    { _id: id },
    { $set: updateData },
    { new: true }
  );

  if (!updatedClass) {
    throw new AppError("Class not found", StatusCodes.NOT_FOUND);
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
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
    Class.find({ isActive: true })
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

    sendResponse(res, {
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

export const toggleCourseStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const isExist = await Class.findById(id);
  if (!isExist) {
    throw new AppError("Class not found", 404);
  }

  await Class.findOneAndUpdate(
    { _id: id },
    { $set: { isActive: !isExist.isActive } },
    { new: true }
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Class status updated successfully",
  });
});
