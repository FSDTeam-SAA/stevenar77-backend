import { StatusCodes } from "http-status-codes";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import courseService from "./course.service";

const createCourse = catchAsync(async (req, res) => {
  const files: any[] = req.files as any[];
  console.log(files);
  const result = await courseService.createCourse(req.body, files);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Course created successfully",
    data: result,
  });
});

const getAllCourses = catchAsync(async (req, res) => {
  const result = await courseService.getAllCourses();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Courses fetched successfully",
    data: result,
  });
});

const getSingleCourse = catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const result = await courseService.getSingleCourse(courseId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Course fetched successfully",
    data: result,
  });
});

const courseController = {
  createCourse,
  getAllCourses,
  getSingleCourse,
};

export default courseController;
