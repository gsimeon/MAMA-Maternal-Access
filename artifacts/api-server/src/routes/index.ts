import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mamaRouter from "./mama";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mamaRouter);

export default router;
