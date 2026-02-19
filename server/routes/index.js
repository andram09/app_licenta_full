import express from "express"
import {router as authRouter} from "./authRouter.js"
import {router as tripRouter} from "./tripRouter.js"

export const apiRouter = express.Router()

apiRouter.use("/auth", authRouter)
apiRouter.use("/trips", tripRouter)
