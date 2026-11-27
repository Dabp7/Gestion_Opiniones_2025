import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import User from '../user/user.model.js'
export const validateJWT = async (req, res, next) => {
    const authorization = req.get('Authorization')
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : req.get('x-token')
    if (!token) return res.status(401).json({ success: false, message: 'Token requerido' })
    try {
        const payload = jwt.verify(token, process.env.SECRETORPRIVATEKEY, { algorithms: ['HS256'] })
        if (typeof payload === 'string' || !mongoose.isValidObjectId(payload.uid)) throw new Error('Invalid token subject')
        const user = await User.findOne({ _id: payload.uid, status: true })
        if (!user || (payload.version ?? 0) !== (user.tokenVersion ?? 0)) return res.status(401).json({ success: false, message: 'Sesión inválida' })
        req.usuario = user
        next()
    } catch { return res.status(401).json({ success: false, message: 'Token inválido o vencido' }) }
}
