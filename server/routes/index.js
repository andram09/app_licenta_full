import express from "express"
import {router as authRouter} from "./authRouter.js"
import {router as tripRouter} from "./tripRouter.js"
import {router as objectiveRouter} from "./objectiveRouter.js"
import {router as expenseRouter} from "./expenseRouter.js"

export const apiRouter = express.Router()

apiRouter.use("/auth", authRouter)
apiRouter.use("/trips", tripRouter)
apiRouter.use("/objectives", objectiveRouter)
apiRouter.use("/", expenseRouter)
