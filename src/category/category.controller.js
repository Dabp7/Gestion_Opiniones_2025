import mongoose from 'mongoose'
import Category from './category.model.js'
import Post from '../post/post.model.js'
import { fieldsOnly, HttpError, pagination } from '../helpers/http-error.js'
export const defaulCategoryCreated = () => Category.findOneAndUpdate({ name: 'General' }, { $setOnInsert: { name: 'General', description: 'Categoría predeterminada' } }, { upsert: true, new: true, runValidators: true })
export const addCategory = async (req, res, next) => {
    try { fieldsOnly(req.body, ['name', 'description']); res.status(201).json({ success: true, category: await Category.create(req.body) }) }
    catch (error) { next(error) }
}
export const updateCategory = async (req, res, next) => {
    try {
        fieldsOnly(req.body, ['name', 'description'])
        const category = await Category.findById(req.params.idCategory)
        if (!category) throw new HttpError(404, 'Categoría no encontrada')
        if (category.name === 'General' && req.body.name && req.body.name !== 'General') throw new HttpError(409, 'General conserva su nombre')
        Object.assign(category, req.body); await category.save()
        res.json({ success: true, category, msg: 'Categoría actualizada' })
    } catch (error) { next(error) }
}
export const deleteCategory = async (req, res, next) => {
    try {
        await mongoose.connection.transaction(async session => {
            const category = await Category.findOneAndUpdate({ _id: req.params.idCategory }, { $inc: { postVersion: 1 } }, { session, new: true })
            if (!category) throw new HttpError(404, 'Categoría no encontrada')
            if (category.name === 'General') throw new HttpError(409, 'General no puede eliminarse')
            const general = await Category.findOneAndUpdate({ name: 'General' }, { $setOnInsert: { name: 'General', description: 'Categoría predeterminada' } }, { session, upsert: true, new: true })
            await Post.updateMany({ category: category._id }, { $set: { category: general._id } }, { session })
            await Category.deleteOne({ _id: category._id }, { session })
        })
        res.json({ success: true, message: 'Categoría eliminada; publicaciones reasignadas a General' })
    } catch (error) { next(error) }
}
export const getCategories = async (req, res, next) => {
    try { const { limit, offset } = pagination(req.query); res.json({ success: true, categories: await Category.find().select('-postVersion').sort({ _id: 1 }).skip(offset).limit(limit), total: await Category.countDocuments({}) }) }
    catch (error) { next(error) }
}
