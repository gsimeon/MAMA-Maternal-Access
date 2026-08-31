import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import mamaRouter from "./mama";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(mamaRouter);

export default router;
