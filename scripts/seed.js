import 'dotenv/config'
import mongoose from 'mongoose'
import { hash } from 'argon2'
import { dbConnection } from '../configs/mongo.js'
import User from '../src/user/user.model.js'
import Category from '../src/category/category.model.js'
import Post from '../src/post/post.model.js'
import Comments from '../src/comments/comments.model.js'
const dbName = new URL(process.env.URI_MONGO?.replace(/^mongodb:/, 'http:') || 'http://invalid').pathname.slice(1)
if (!dbName.endsWith('_demo')) throw new Error('Seed limitado a una base terminada en _demo; no borra datos')
await dbConnection()
try {
    await Promise.all([User.init(), Category.init(), Post.init(), Comments.init()])
    const password = await hash('DemoOnly!2026')
    for (const [username, role] of [['admin_demo', 'ADMIN_ROLE'], ['author_demo', 'USER_ROLE'], ['reader_demo', 'USER_ROLE']]) await User.updateOne({ username }, { $setOnInsert: { username, fullName: username, email: `${username}@example.test`, password, phone: '55550000', role, status: true } }, { upsert: true })
    const category = await Category.findOneAndUpdate({ name: 'General' }, { $setOnInsert: { name: 'General', description: 'Debate académico ficticio' } }, { upsert: true, new: true })
    const author = await User.findOne({ username: 'author_demo' })
    await Post.updateOne({ title: 'Una opinión de demostración', author: author._id }, { $setOnInsert: { title: 'Una opinión de demostración', text: 'Contenido sintético para verificar autoría y comentarios.', category: category._id, author: author._id, comments: [] } }, { upsert: true })
    console.log('Seed listo: admin_demo@example.test, author_demo@example.test, reader_demo@example.test / clave ficticia DemoOnly!2026')
} finally { await mongoose.disconnect() }
