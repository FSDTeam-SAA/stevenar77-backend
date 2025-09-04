import dotenv from "dotenv";
dotenv.config();

export default {
  port: process.env.PORT,
  mogodbUrl: process.env.MONGODB_URL,
  nodeEnv: process.env.NODE_ENV,
};
