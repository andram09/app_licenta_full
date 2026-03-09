import express from "express"
import { router as authRouter } from "./authRouter.js"
import { router as tripRouter } from "./tripRouter.js"
import { router as objectiveRouter } from "./objectiveRouter.js"
import { router as expenseRouter } from "./expenseRouter.js"
import { router as adminRouter } from "./adminRouter.js"
import { router as externalRouter } from "./externalRouter.js"
import {router as optimizeRouteRouter} from "./optimizeRouteRouter.js"

export const apiRouter = express.Router()

apiRouter.use("/auth", authRouter)
apiRouter.use("/external", externalRouter)
apiRouter.use("/trips", tripRouter)
apiRouter.use("/admin", adminRouter)
apiRouter.use("/", objectiveRouter)
apiRouter.use("/", expenseRouter)
apiRouter.use("/trips", optimizeRouteRouter)
