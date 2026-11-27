import mongoose from 'mongoose'
import Post from '../post/post.model.js'
import Comments from './comments.model.js'
import { fieldsOnly, HttpError, pagination } from '../helpers/http-error.js'
export const addComment = async (req, res, next) => {
    try {
        fieldsOnly(req.body, ['text', 'post'])
        const comment = await mongoose.connection.transaction(async session => {
            const post = await Post.findOneAndUpdate({ _id: req.body.post, status: true }, { $inc: { commentVersion: 1 } }, { session, new: true })
            if (!post) throw new HttpError(404, 'Publicación no encontrada')
            const created = (await Comments.create([{ text: req.body.text, post: post._id, author: req.usuario._id }], { session }))[0]
            await Post.updateOne({ _id: post._id }, { $addToSet: { comments: created._id } }, { session })
            return created
        })
        res.status(201).json({ success: true, comment, message: 'Comentario agregado' })
    } catch (error) { next(error) }
}
export const updateComment = async (req, res, next) => {
    try {
        fieldsOnly(req.body, ['text'])
        const comment = await Comments.findOneAndUpdate({ _id: req.params.idComment, author: req.usuario._id }, { text: req.body.text }, { new: true, runValidators: true })
        if (!comment) throw new HttpError(404, 'Comentario propio no encontrado')
        res.json({ success: true, msg: 'Comentario actualizado', comment })
    } catch (error) { next(error) }
}
export const deleteComment = async (req, res, next) => {
    try {
        await mongoose.connection.transaction(async session => {
            const comment = await Comments.findOne({ _id: req.params.idComment, author: req.usuario._id }).session(session)
            if (!comment) throw new HttpError(404, 'Comentario propio no encontrado')
            await Post.updateOne({ _id: comment.post }, { $pull: { comments: comment._id }, $inc: { commentVersion: 1 } }, { session })
            await Comments.deleteOne({ _id: comment._id }, { session })
        })
        res.json({ success: true, message: 'Comentario eliminado' })
    } catch (error) { next(error) }
}
export const getComments = async (req, res, next) => {
    try {
        const { limit, offset } = pagination(req.query)
        if (!await Post.exists({ _id: req.params.idPost, status: true })) throw new HttpError(404, 'Publicación no encontrada')
        const filter = { post: req.params.idPost }
        const [comments, total] = await Promise.all([Comments.find(filter).sort({ _id: 1 }).skip(offset).limit(limit).populate('author', 'fullName username'), Comments.countDocuments(filter)])
        res.json({ success: true, comments, total, limit, offset })
    } catch (error) { next(error) }
}
