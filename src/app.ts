import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, RequestHandler } from "express";
import globalErrorHandler from "./middleware/globalErrorHandler";
import notFound from "./middleware/notFound";
import router from "./router";

const app: Application = express();

app.use(express.static("public"));

app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://stevenar77-dashboard.vercel.app",
    "http://localhost:3001",
    "https://stevenar77-website.vercel.app",
    "https://scubalife.net",
    "https://www.scubalife.net",
    "https://admin.scubalife.net",
    "https://www.admin.scubalife.net",
    "http://127.0.0.1:5500",
  ],
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use("/api/v1", router);

app.get("/", (req, res) => {
  res.send("Hey there! I am working......");
});

app.use(globalErrorHandler as unknown as RequestHandler);
app.use(notFound as unknown as RequestHandler);

export default app;
