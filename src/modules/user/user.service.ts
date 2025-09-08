import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/AppError";
import { IUser } from "./user.interface";
import { User } from "./user.model";
import bcrypt from "bcrypt";
import sendEmail from "../../utils/sendEmail";
import verificationCodeTemplate from "../../utils/verificationCodeTemplate";
import { createToken } from "../../utils/tokenGenerate";
import config from "../../config";

const registerUser = async (payload: IUser) => {
  const existingUser = await User.isUserExistByEmail(payload.email);

  let result;

  if (existingUser) {
    if (existingUser.isVerified === true) {
      // User already verified → throw error
      throw new AppError("User already exists", StatusCodes.CONFLICT);
    } else {
      // User exists but not verified → resend OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

      existingUser.otp = hashedOtp;
      existingUser.otpExpires = otpExpires;

      result = await User.findByIdAndUpdate(
        existingUser._id,
        { otp: hashedOtp, otpExpires },
        { new: true }
      );

      result = existingUser;

      await sendEmail({
        to: result.email,
        subject: "Verify your email",
        html: verificationCodeTemplate(otp),
      });
    }
  } else {
    // New user → create
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const newUser = new User({
      ...payload,
      otp: hashedOtp,
      otpExpires,
      isVerified: false,
    });
    result = await User.create(newUser);

    await sendEmail({
      to: result.email,
      subject: "Verify your email",
      html: verificationCodeTemplate(otp),
    });
  }

  const JwtToken = {
    userId: result._id,
    email: result.email,
    role: result.role,
  };

  const accessToken = createToken(
    JwtToken,
    config.JWT_SECRET as string,
    config.JWT_EXPIRES_IN as string
  );

  const refreshToken = createToken(
    JwtToken,
    config.refreshTokenSecret as string,
    config.jwtRefreshTokenExpiresIn as string
  );

  return {
    accessToken,
    refreshToken,
    user: {
      _id: result._id,
      firstName: result.firstName,
      lastName: result.lastName,
      email: result.email,
    },
  };
};

const verifyEmail = async (email: string, payload: string) => {
  const { otp }: any = payload;
  if (!otp) throw new Error("OTP is required");

  const existingUser = await User.findOne({ email });
  if (!existingUser)
    throw new AppError("User not found", StatusCodes.NOT_FOUND);

  if (!existingUser.otp || !existingUser.otpExpires) {
    throw new AppError("OTP not requested or expired", StatusCodes.BAD_REQUEST);
  }

  if (existingUser.otpExpires < new Date()) {
    throw new AppError("OTP has expired", StatusCodes.BAD_REQUEST);
  }

  if (existingUser.isVerified === true) {
    throw new AppError("User already verified", StatusCodes.CONFLICT);
  }

  const isOtpMatched = await bcrypt.compare(otp.toString(), existingUser.otp);
  if (!isOtpMatched) throw new AppError("Invalid OTP", StatusCodes.BAD_REQUEST);

  const result = await User.findOneAndUpdate(
    { email },
    {
      isVerified: true,
      $unset: { otp: "", otpExpires: "" },
    },
    { new: true }
  ).select("username email role");
  return result;
};

const resendOtpCode = async (email: string) => {
  const existingUser = await User.findOne({ email });
  if (!existingUser)
    throw new AppError("User not found", StatusCodes.NOT_FOUND);

  if (existingUser.isVerified === true) {
    throw new AppError("User already verified", StatusCodes.CONFLICT);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

  const result = await User.findOneAndUpdate(
    { email },
    {
      otp: hashedOtp,
      otpExpires,
    },
    { new: true }
  ).select("username email role");

  await sendEmail({
    to: existingUser.email,
    subject: "Verify your email",
    html: verificationCodeTemplate(otp),
  });
  return result;
};

const getAllUsers = async () => {
  const result = await User.find().select(
    "username firstName lastName email role"
  );
  return result;
};

const getMyProfile = async (email: string) => {
  const existingUser = await User.findOne({ email });
  if (!existingUser)
    throw new AppError("User not found", StatusCodes.NOT_FOUND);

  const result = await User.findOne({ email }).select(
    "username firstName lastName email role"
  );
  return result;
};

const updateUserProfile = async (payload: any, email: string, file: any) => {};

const userService = {
  registerUser,
  verifyEmail,
  resendOtpCode,
  getAllUsers,
  getMyProfile,
  updateUserProfile,
};

export default userService;
