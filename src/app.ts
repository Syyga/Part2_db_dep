import express from "express";
import dotenv from "dotenv";
import routes from "./domains/routes";
import { swaggerUi, swaggerSpec } from "./utils/swagger/swagger";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware";
import cors from "cors";
dotenv.config();
const app = express();

const corsOptions: cors.CorsOptions = {
  origin: ["http://localhost:3000"], // 허용할 도메인
  methods: ["GET", "POST", "PUT", "DELETE"], // 허용할 HTTP 메서드
  credentials: true, // 쿠키 허용 여부
};

app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(cookieParser());

app.use(express.json());
app.use("/api", routes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);

export default app;
