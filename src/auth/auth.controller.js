import { hash, verify } from 'argon2'
import User from '../user/user.model.js'
import { generateJWT } from '../helpers/generate-jwt.js'
export const register = async (req, res, next) => {
    try {
        if (req.body.role && req.body.role !== 'USER_ROLE') return res.status(403).json({ success: false, message: 'El registro público no concede administración' })
        const { fullName, username, email, password, phone } = req.body
        const user = await User.create({ fullName, username, email, password: await hash(password), phone, role: 'USER_ROLE' })
        res.status(201).json({ success: true, message: 'Usuario creado', name: user.fullName, email: user.email })
    } catch (error) { next(error) }
}
export const login = async (req, res, next) => {
    try {
        const { email, username, password } = req.body
        const alternatives = []
        if (email) alternatives.push({ email })
        if (username) alternatives.push({ username })
        if (!alternatives.length) return res.status(400).json({ success: false, message: 'Indicá email o username' })
        const user = await User.findOne({ $or: alternatives, status: true }).select('+password')
        if (!user || !await verify(user.password, password)) return res.status(401).json({ success: false, message: 'Credenciales inválidas' })
        const token = await generateJWT(user.id, user.tokenVersion ?? 0)
        res.json({ success: true, message: 'Inicio de sesión correcto', userDetails: { token, fullName: user.fullName, role: user.role } })
    } catch (error) { next(error) }
}
