import { Router, type IRouter } from "express";
import healthRouter from "./health";
import learningRouter from "./learning";
import activitiesRouter from "./activities";

const router: IRouter = Router();

router.use(healthRouter);
router.use(learningRouter);
router.use(activitiesRouter);

export default router;
