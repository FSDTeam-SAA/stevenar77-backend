import express, { Application, RequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import globalErrorHandler from "./middleware/globalErrorHandler";
import notFound from "./middleware/notFound";

const app: Application = express();

app.use(express.json());

const corseOptions = {
  origin: ["*"],
  credentials: true,
};

app.use(cors(corseOptions));
app.use(cookieParser());

//* this is router handling
// app.use("/api", router);

app.get("/", (req, res) => {
  res.send("Hey there!");
});

//* this is global error handling......
app.use(globalErrorHandler as unknown as RequestHandler);
app.use(notFound as unknown as RequestHandler);

export default app;
