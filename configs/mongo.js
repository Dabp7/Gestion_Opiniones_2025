import mongoose from 'mongoose'
export const dbConnection = async () => {
    if (!process.env.URI_MONGO) throw new Error('URI_MONGO requerida')
    await mongoose.connect(process.env.URI_MONGO, { serverSelectionTimeoutMS: 10000, maxPoolSize: 20 })
    const hello = await mongoose.connection.db.admin().command({ hello: 1 })
    if (!hello.setName && hello.msg !== 'isdbgrid') { await mongoose.disconnect(); throw new Error('MongoDB replica set requerido para publicaciones y comentarios atómicos') }
}
