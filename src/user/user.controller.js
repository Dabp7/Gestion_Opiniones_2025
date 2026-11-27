import { hash, verify } from 'argon2'
import User from './user.model.js'
import { fieldsOnly, HttpError } from '../helpers/http-error.js'
export const updateUser = async (req, res, next) => {
    try {
        if (req.usuario.id !== req.params.uid) throw new HttpError(403, 'Solo podés editar tu perfil')
        fieldsOnly(req.body, ['fullName', 'username', 'email', 'phone'])
        const user = await User.findOneAndUpdate({ _id: req.usuario._id, status: true }, req.body, { new: true, runValidators: true })
        res.json({ success: true, msg: 'Usuario actualizado', user })
    } catch (error) { next(error) }
}
export const updatePassword = async (req, res, next) => {
    try {
        if (req.usuario.id !== req.params.uid) throw new HttpError(403, 'Solo podés cambiar tu contraseña')
        const user = await User.findById(req.usuario._id).select('+password')
        if (!await verify(user.password, req.body.oldPassword)) throw new HttpError(400, 'Contraseña actual incorrecta')
        if (await verify(user.password, req.body.newPassword)) throw new HttpError(400, 'La nueva contraseña debe ser distinta')
        await User.updateOne({ _id: user._id }, { $set: { password: await hash(req.body.newPassword) }, $inc: { tokenVersion: 1 } })
        res.json({ success: true, message: 'Contraseña actualizada; iniciá sesión nuevamente' })
    } catch (error) { next(error) }
}
