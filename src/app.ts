import express from "express";
import dotenv from "dotenv";
import routes from "./domains/routes";
import { swaggerUi, swaggerSpec } from "./utils/swagger/swagger";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware";
import cors from "cors";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "https://123123.com"],
    credentials: true,
  })
);
app.use(cookieParser());

app.use(express.json());
app.use("/api", routes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);

export default app;
