import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { rateLimit } from 'express-rate-limit'
import { dbConnection } from './mongo.js'
import authRoutes from '../src/auth/auth.routes.js'
import userRoutes from '../src/user/user.routes.js'
import categoryRoutes from '../src/category/category.routes.js'
import postRoutes from '../src/post/post.routes.js'
import commentRoutes from '../src/comments/comments.routes.js'
import { defaulCategoryCreated } from '../src/category/category.controller.js'
import { handleErrors } from '../src/middlewares/handle-errors.js'
import { swaggerDocs, swaggerUi } from './swagger.js'

export const createApp = () => {
    const app = express()
    app.disable('x-powered-by')
    app.use(helmet())
    app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
    app.use(express.json({ limit: '32kb' }))
    if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'))
    app.get('/health', (req, res) => res.json({ success: true, status: 'ok' }))
    app.use('/kinaloop/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, message: 'Demasiados intentos. Reintentá más tarde.' } }), authRoutes)
    app.use('/kinaloop/v1/user', userRoutes)
    app.use('/kinaloop/v1/category', categoryRoutes)
    app.use('/kinaloop/v1/post', postRoutes)
    app.use('/kinaloop/v1/comment', commentRoutes)
    app.get('/openapi.json', (req, res) => res.json(swaggerDocs))
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, { swaggerOptions: { validatorUrl: null } }))
    app.use((req, res) => res.status(404).json({ success: false, message: 'Ruta no encontrada' }))
    app.use(handleErrors)
    return app
}
export const initServer = async () => {
    if (!process.env.SECRETORPRIVATEKEY || process.env.SECRETORPRIVATEKEY.length < 32) throw new Error('SECRETORPRIVATEKEY requiere 32 caracteres')
    await dbConnection()
    await defaulCategoryCreated()
    return createApp().listen(Number(process.env.PORT || 3007), '127.0.0.1', () => console.log(`API en http://127.0.0.1:${process.env.PORT || 3007}`))
}
