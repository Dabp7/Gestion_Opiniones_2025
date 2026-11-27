import mongoose from 'mongoose'
import Post from './post.model.js'
import Comments from '../comments/comments.model.js'
import Category from '../category/category.model.js'
import { fieldsOnly, HttpError, pagination } from '../helpers/http-error.js'

export const addPost = async (req, res, next) => {
    try {
        fieldsOnly(req.body, ['title', 'text', 'category'])
        const post = await mongoose.connection.transaction(async session => {
            const category = await Category.findOneAndUpdate({ _id: req.body.category }, { $inc: { postVersion: 1 } }, { session, new: true })
            if (!category) throw new HttpError(404, 'Categoría no encontrada')
            return (await Post.create([{ title: req.body.title, text: req.body.text, category: category._id, author: req.usuario._id, comments: [] }], { session }))[0]
        })
        res.status(201).json({ success: true, post })
    } catch (error) { next(error) }
}
export const updatePost = async (req, res, next) => {
    try {
        fieldsOnly(req.body, ['title', 'text', 'category'])
        const post = await mongoose.connection.transaction(async session => {
            if (req.body.category && !await Category.findOneAndUpdate({ _id: req.body.category }, { $inc: { postVersion: 1 } }, { session })) throw new HttpError(404, 'Categoría no encontrada')
            const updated = await Post.findOneAndUpdate({ _id: req.params.idPost, author: req.usuario._id, status: true }, req.body, { session, new: true, runValidators: true })
            if (!updated) throw new HttpError(404, 'Publicación propia no encontrada')
            return updated
        })
        res.json({ success: true, msg: 'Publicación actualizada', post })
    } catch (error) { next(error) }
}
export const deletePost = async (req, res, next) => {
    try {
        await mongoose.connection.transaction(async session => {
            const post = await Post.findOneAndDelete({ _id: req.params.idPost, author: req.usuario._id }).session(session)
            if (!post) throw new HttpError(404, 'Publicación propia no encontrada')
            await Comments.deleteMany({ post: post._id }, { session })
        })
        res.json({ success: true, message: 'Publicación y comentarios eliminados' })
    } catch (error) { next(error) }
}
export const getPosts = async (req, res, next) => {
    try {
        const { limit, offset } = pagination(req.query)
        const filter = { status: true }
        if (req.query.category) { if (!mongoose.isValidObjectId(req.query.category)) throw new HttpError(400, 'Categoría inválida'); filter.category = req.query.category }
        const [posts, total] = await Promise.all([Post.find(filter).select('-comments -commentVersion').sort({ _id: -1 }).skip(offset).limit(limit).populate('author', 'fullName username').populate('category', 'name'), Post.countDocuments(filter)])
        res.json({ success: true, total, posts, limit, offset })
    } catch (error) { next(error) }
}
export const getPost = async (req, res, next) => {
    try {
        const post = await Post.findOne({ _id: req.params.idPost, status: true }).select('-commentVersion -comments').populate('author', 'fullName username').populate('category', 'name')
        if (!post) throw new HttpError(404, 'Publicación no encontrada')
        res.json({ success: true, post })
    } catch (error) { next(error) }
}
