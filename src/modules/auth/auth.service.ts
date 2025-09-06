import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/AppError";
import { User } from "../user/user.model";
import { createToken } from "../../utils/tokenGenerate";
import config from "../../config";

const login = async (payload: { email: string; password: string }) => {
  const { email, password } = payload;

  const user = await User.isUserExistByEmail(email);
  if (!user) throw new AppError("User not found", StatusCodes.NOT_FOUND);

  if (user.isVerified === false)
    throw new AppError("Please verify your email", StatusCodes.UNAUTHORIZED);

  const isPasswordValid = await User.isPasswordMatch(password, user.password);
  if (!isPasswordValid)
    throw new AppError("Invalid password", StatusCodes.UNAUTHORIZED);

  const tokenPayload = {
    id: user._id,
    email: user.email,
    role: user.role,
  };

  const accessToken = createToken(
    tokenPayload,
    config.JWT_SECRET as string,
    config.JWT_EXPIRES_IN as string
  );

  const refreshToken = createToken(
    tokenPayload,
    config.refreshTokenSecret as string,
    config.jwtRefreshTokenExpiresIn as string
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      image: user.image,
      phone: user.phone,
      street: user.street,
      location: user.location,
      postalCode: user.postalCode,
      dateOfBirth: user.dateOfBirth,
    },
  };
};

const authService = {
  login,
};

export default authService;
