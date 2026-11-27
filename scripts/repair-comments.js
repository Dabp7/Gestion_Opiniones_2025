import 'dotenv/config'
import mongoose from 'mongoose'
import { dbConnection } from '../configs/mongo.js'
import Post from '../src/post/post.model.js'
import Comments from '../src/comments/comments.model.js'
const apply = process.argv.includes('--apply')
const dbName = new URL(process.env.URI_MONGO?.replace(/^mongodb:/, 'http:') || 'http://invalid').pathname.slice(1)
if (apply && !dbName.endsWith('_demo')) throw new Error('La reparación con escritura exige una copia de datos en una base terminada en _demo')
await dbConnection()
try {
    const orphanIds = await Comments.aggregate([{ $lookup: { from: 'posts', localField: 'post', foreignField: '_id', as: 'parent' } }, { $match: { parent: { $size: 0 } } }, { $project: { _id: 1, post: 1 } }])
    if (!apply) { console.log(JSON.stringify({ mode: 'dry-run', orphanComments: orphanIds.length, postsToRebuild: await Post.countDocuments({}) })); }
    else {
        let removed = 0, rebuilt = 0
        for (const orphan of orphanIds) await mongoose.connection.transaction(async session => {
            if (!await Post.exists({ _id: orphan.post }).session(session)) removed += (await Comments.deleteOne({ _id: orphan._id, post: orphan.post }, { session })).deletedCount
        })
        for await (const item of Post.find().select('_id').cursor()) await mongoose.connection.transaction(async session => {
            const post = await Post.findOneAndUpdate({ _id: item._id }, { $inc: { commentVersion: 1 } }, { session, new: true })
            if (!post) return
            const comments = await Comments.find({ post: item._id }).select('_id').session(session)
            post.comments = comments.map(comment => comment._id)
            await post.save({ session }); rebuilt++
        })
        console.log(JSON.stringify({ mode: 'applied', orphanCommentsRemoved: removed, postsRebuilt: rebuilt }))
    }
} finally { await mongoose.disconnect() }
