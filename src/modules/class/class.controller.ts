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
  const { index, duration, ...rest } = req.body; // include index from payload

  const updateData: any = {
    ...rest,
  };

  // ----- Handle file upload -----
  if (req.file) {
    const file = req.file as Express.Multer.File;
    const uploadResult = await uploadToCloudinary(file.path, "classes");

    updateData.image = {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    };
  }

  // ----- Handle index logic if provided -----
  if (index !== undefined) {
    const currentClass = await Class.findById(id);
    if (!currentClass) {
      throw new AppError("Class not found", StatusCodes.NOT_FOUND);
    }

    const oldIndex = currentClass.index;
    const newIndex = Number(index);

    if (typeof oldIndex === "number" && oldIndex !== newIndex) {
      if (newIndex < oldIndex) {
        // Moving UP: shift other classes down
        await Class.updateMany(
          { index: { $gte: newIndex, $lt: oldIndex } },
          { $inc: { index: 1 } }
        );
      } else {
        // Moving DOWN: shift other classes up
        await Class.updateMany(
          { index: { $lte: newIndex, $gt: oldIndex } },
          { $inc: { index: -1 } }
        );
      }

      updateData.index = newIndex; // set the new index for this class
    }
  }

  // ----- Update the class -----
  const updatedClass = await Class.findOneAndUpdate(
    { _id: id },
    { $set: updateData },
    { new: true }
  );

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

  const isAdmin = req.query.isAdmin === "true"; // check query param

  const filter = isAdmin ? {} : { isActive: true };

  const [total, classes] = await Promise.all([
    Class.countDocuments(filter),
    Class.find(filter)
    .sort({ index: 1 })
    .skip(skip)
    .limit(limit)
      
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
