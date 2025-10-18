import { Request, Response, NextFunction } from 'express'
import { Class } from './class.model'
import catchAsync from '../../utils/catchAsync'
import sendResponse from '../../utils/sendResponse'
import AppError from '../../errors/AppError'
import { IClass } from './class.interface'
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from '../../utils/cloudinary'
import { StatusCodes } from 'http-status-codes'
import mongoose from 'mongoose'

export const createClass = catchAsync(async (req, res) => {
  const file = req.file as Express.Multer.File;
  const {
    index,
    duration,
    addOnce,
    courseIncludes,
    schedule,
    formTitle,

    ...rest
  } = req.body;

  // ---- Validate image ----
  if (!file) {
    throw new AppError("Image is required", StatusCodes.BAD_REQUEST);
  }

  // ---- Upload image ----
  const uploadResult = await uploadToCloudinary(file.path, "classes");

  // ---- Handle index shifting ----
  let insertIndex: number;
  if (index !== undefined) {
    const newIndex = Number(index);
    await Class.updateMany(
      { index: { $gte: newIndex } },
      { $inc: { index: 1 } }
    );
    insertIndex = newIndex;
  } else {
    const maxIndexClass = await Class.findOne().sort({ index: -1 });
    insertIndex = maxIndexClass ? (maxIndexClass.index ?? 0) + 1 : 1;
  }

  // ---- Parse array fields properly ----
  let parsedAddOnce = [];
  if (addOnce) {
    try {
      parsedAddOnce =
        typeof addOnce === "string" ? JSON.parse(addOnce) : addOnce;
    } catch (e) {
      throw new AppError("Invalid addOnce format", StatusCodes.BAD_REQUEST);
    }
  }

  let parsedCourseIncludes: string[] = [];
  if (courseIncludes) {
    parsedCourseIncludes =
      typeof courseIncludes === "string"
        ? JSON.parse(courseIncludes)
        : courseIncludes;
  }

  let parsedFormTitle: string[] = [];
  if (formTitle) {
    parsedFormTitle =
      typeof formTitle === "string" ? JSON.parse(formTitle) : formTitle;
  }

  // ---- Parse schedule ----
  let parsedSchedule: any[] = [];
  if (schedule) {
    try {
      const schedArray =
        typeof schedule === "string" ? JSON.parse(schedule) : schedule;
      if (!Array.isArray(schedArray)) throw new Error();

      parsedSchedule = schedArray.map((s: any) => ({
        title: s.title,
        description: s.description,
        participents: s.participents ?? 0,
        totalParticipents: s.totalParticipents ?? 0,
        sets: Array.isArray(s.sets)
          ? s.sets.map((d: any) => ({
              date: new Date(d.date),
              location: d.location,
              type: d.type,
              isActive: d.isActive ?? true,
            }))
          : [],
      }));
    } catch (err) {
      console.error("Schedule parsing error:", err);
      throw new AppError("Invalid schedule format", StatusCodes.BAD_REQUEST);
    }
  }

  // ---- Create new class ----
  const result = await Class.create({
    ...rest,
    duration,
    index: insertIndex,
    image: {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    },
    addOnce: parsedAddOnce,
    courseIncludes: parsedCourseIncludes,
    formTitle: parsedFormTitle,
    schedule: parsedSchedule,
  });

  // ---- Send response ----
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Class created successfully",
    data: result,
  });
})


export const updateClass = catchAsync(async (req: Request, res: Response)=>{
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const file = req.file;
    const { scheduleId, setsId } = req.query;
    const updateData = req.body;

    let updateQuery = {};
    let options = { new: true, session };



    // 🟢 if scheduleId and setsId not add in query — main class update
    if (!scheduleId && !setsId) {
       if (file) {
         const uploadResult = await uploadToCloudinary(file.path, "classes");

         const existingClass = await Class.findById(id);
         if (existingClass?.image?.public_id) {
           await deleteFromCloudinary(existingClass.image.public_id);
         }

         updateData.image = {
           public_id: uploadResult.public_id,
           url: uploadResult.secure_url,
         };
       }

      // ✅ If user sent new addOnce item(s)
      if (Object.keys(req.body).some((k) => k.startsWith("addOnce["))) {
        const addOnceData: any = [];

        Object.keys(req.body).forEach((key) => {
          const match = key.match(/addOnce\[(\d+)\]\[(\w+)\]/);
          if (match) {
            const index = parseInt(match[1]);
            const field = match[2];

            if (!addOnceData[index]) addOnceData[index] = {};
            addOnceData[index][field] = req.body[key];
          }
        });

        // Convert numeric fields like price to number
        addOnceData.forEach((obj: any) => {
          if (obj.price) obj.price = Number(obj.price);
        });

        console.log("Parsed addOnceData:", addOnceData);

        const updatedClass = await Class.findByIdAndUpdate(
          id,
          { $push: { addOnce: { $each: addOnceData } } },
          { new: true, session }
        );

        await session.commitTransaction();
        sendResponse(res, {
          statusCode: 200,
          success: true,
          message: "Class updated successfully",
          data: updatedClass,
        })
      }

      // 🔹 Normal update (no addOnce)
      const updatedClass = await Class.findByIdAndUpdate(id, updateData, {
        new: true,
        session,
      });
      await session.commitTransaction();

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Class updated successfully",
        data: updatedClass,
      });
    }

    // 🟠 if you want to schedule update
    if (scheduleId && !setsId) {
      const updatedClass = await Class.findOneAndUpdate(
        { _id: id, "schedule._id": scheduleId },
        {
          $set: {
            "schedule.$.title": updateData.title,
            "schedule.$.description": updateData.description,
            "schedule.$.participents": updateData.participents,
            "schedule.$.totalParticipents": updateData.totalParticipents,
          },
        },
        options
      );

      await session.commitTransaction();
      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Class updated successfully",
        data: updatedClass,
      });
    }

    // 🔵 if sets update  (scheduleId + setsId in query)
    if (scheduleId && setsId) {
      const updatedClass = await Class.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            "schedule.$[s].sets.$[set].date": updateData.date,
            "schedule.$[s].sets.$[set].location": updateData.location,
            "schedule.$[s].sets.$[set].type": updateData.type,
            "schedule.$[s].sets.$[set].isActive": updateData.isActive,
          },
        },
        {
          arrayFilters: [{ "s._id": scheduleId }, { "set._id": setsId }],
          new: true,
          session,
        }
      );

      await session.commitTransaction();
      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Sets updated successfully",
        data: updatedClass,
      });
    }
  } catch (error: any) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to update class",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
});



export const getAllClasses = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1
  const limit = req.query.limit ? Number(req.query.limit) : 0
  const skip = limit > 0 ? (page - 1) * limit : 0

  const isAdmin = req.query.isAdmin === 'true' // check query param
  const filter = isAdmin ? {} : { isActive: true }

  const [total, classes] = await Promise.all([
    Class.countDocuments(filter),
    (() => {
      const query = Class.find(filter).sort({ index: 1 }).skip(skip)
      return limit > 0 ? query.limit(limit) : query
    })(),
  ])

  sendResponse<IClass[]>(res, {
    statusCode: 200,
    success: true,
    message: 'Classes fetched successfully',
    data: classes,
    meta: {
      limit: limit || total,
      page: limit > 0 ? page : 1,
      total,
      totalPage: limit > 0 ? Math.ceil(total / limit) : 1,
    },
  })
})

export const deleteClass = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params

    const deletedClass = await Class.findByIdAndDelete(id)
    if (!deletedClass) {
      return next(new AppError('Class not found', 404))
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: 'Class deleted successfully',
    })
  }
)

export const getClassById = catchAsync(async (req, res) => {
  const { id } = req.params
  const isExist = await Class.findById(id)
  if (!isExist) {
    throw new AppError('Class not found', 404)
  }
  const singleClass = await Class.findById(id)

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Class fetched successfully',
    data: singleClass,
  })
})

export const toggleCourseStatus = catchAsync(async (req, res) => {
  const { id } = req.params
  const isExist = await Class.findById(id)
  if (!isExist) {
    throw new AppError('Class not found', 404)
  }

  await Class.findOneAndUpdate(
    { _id: id },
    { $set: { isActive: !isExist.isActive } },
    { new: true }
  )
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Class status updated successfully',
  })
})
