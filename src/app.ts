import express from "express";
import helmet from "helmet";
import cors from "cors";
import authRoutes from "./routes/auth";
import protectedRoutes from "./routes/protected";
import issuesRoutes from "./routes/issues";
import usersRoutes from "./routes/users";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/issues", issuesRoutes);
app.use("/api/users", usersRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(errorHandler);

export default app;
