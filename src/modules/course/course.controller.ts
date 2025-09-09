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

const courseController = {
  createCourse,
};

export default courseController;
