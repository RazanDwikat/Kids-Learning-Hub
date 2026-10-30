import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { mountWeb } from "./web";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "8kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
mountWeb(app);

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (typeof err === "object" && err !== null && "status" in err) {
    if (err.status === 413) {
      res.status(413).json({ error: "Request body too large" });
      return;
    }
    if (err.status === 400) {
      res.status(400).json({ error: "Invalid JSON request" });
      return;
    }
  }
  next(err);
});

export default app;
