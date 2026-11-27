import { before, beforeEach, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import mongoose from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import request from 'supertest'
import { hash } from 'argon2'
import jwt from 'jsonwebtoken'
import { createApp } from '../configs/server.js'
import User from '../src/user/user.model.js'
import Category from '../src/category/category.model.js'
import Post from '../src/post/post.model.js'
import Comments from '../src/comments/comments.model.js'

process.env.NODE_ENV = 'test'
process.env.SECRETORPRIVATEKEY = 'synthetic-only-test-signing-key-32-characters'
let replica, app, author, reader, admin, category, post, password
const prefix = '/kinaloop/v1'
const authorization = user => `Bearer ${jwt.sign({ uid: user.id, version: user.tokenVersion ?? 0 }, process.env.SECRETORPRIVATEKEY, { expiresIn: '1h' })}`
before(async () => {
    replica = await MongoMemoryReplSet.create({ binary: { version: process.env.MONGOMS_VERSION || '8.0.17' }, replSet: { count: 1, storageEngine: 'wiredTiger' }, instanceOpts: [{ launchTimeout: 60000 }] })
    await mongoose.connect(replica.getUri(), { dbName: 'opinions_test' })
    await Promise.all([User.init(), Category.init(), Post.init(), Comments.init()])
    password = await hash('TestOnly!2026')
    app = createApp()
}, { timeout: 180000 })
beforeEach(async () => {
    await Comments.deleteMany({}); await Post.deleteMany({}); await Category.deleteMany({}); await User.deleteMany({})
    const make = (username, role) => User.create({ username, fullName: username, email: `${username}@example.test`, password, phone: '55550000', role })
    author = await make('author_test', 'USER_ROLE'); reader = await make('reader_test', 'USER_ROLE'); admin = await make('admin_test', 'ADMIN_ROLE')
    category = await Category.create({ name: 'General', description: 'Synthetic general' })
    post = await Post.create({ title: 'Synthetic opinion', text: 'Synthetic text', category: category._id, author: author._id })
})
after(async () => { await mongoose.disconnect(); if (replica) await replica.stop() })

test('only author edits/deletes post and ownership fields cannot be changed', async () => {
    assert.equal((await request(app).put(`${prefix}/post/editPost/${post.id}`).set('Authorization', authorization(reader)).send({ title: 'Attack' })).status, 404)
    assert.equal((await request(app).delete(`${prefix}/post/deletePost/${post.id}`).set('Authorization', authorization(reader))).status, 404)
    assert.equal((await request(app).put(`${prefix}/post/editPost/${post.id}`).set('Authorization', authorization(author)).send({ author: reader.id })).status, 400)
    const own = await request(app).put(`${prefix}/post/editPost/${post.id}`).set('Authorization', authorization(author)).send({ title: 'Own update' })
    assert.equal(own.status, 200); assert.equal(own.body.post.title, 'Own update')
    assert.equal((await request(app).put(`${prefix}/post/editPost/${new mongoose.Types.ObjectId()}`).set('Authorization', authorization(author)).send({ text: 'Missing' })).status, 404)
})

test('comment creation and deletion maintain both records and only author can mutate', async () => {
    const created = await request(app).post(`${prefix}/comment/addComment`).set('Authorization', authorization(reader)).send({ text: 'A comment', post: post.id })
    assert.equal(created.status, 201)
    const id = created.body.comment._id
    assert((await Post.findById(post.id)).comments.some(value => value.toString() === id))
    assert.equal((await request(app).patch(`${prefix}/comment/editComment/${id}`).set('Authorization', authorization(author)).send({ text: 'Not mine' })).status, 404)
    assert.equal((await request(app).delete(`${prefix}/comment/deleteComment/${id}`).set('Authorization', authorization(author))).status, 404)
    assert.equal((await request(app).patch(`${prefix}/comment/editComment/${id}`).set('Authorization', authorization(reader)).send({ text: 'Valid edit', post: new mongoose.Types.ObjectId().toString() })).status, 400)
    assert.equal((await request(app).patch(`${prefix}/comment/editComment/${id}`).set('Authorization', authorization(reader)).send({ text: 'Valid edit' })).status, 200)
    assert.equal((await request(app).delete(`${prefix}/comment/deleteComment/${id}`).set('Authorization', authorization(reader))).status, 200)
    assert.equal(await Comments.countDocuments({ _id: id }), 0); assert.equal((await Post.findById(post.id)).comments.length, 0)
})

test('post deletion races comment creation without orphan comments', async () => {
    const responses = await Promise.all([request(app).post(`${prefix}/comment/addComment`).set('Authorization', authorization(reader)).send({ text: 'Racing', post: post.id }), request(app).delete(`${prefix}/post/deletePost/${post.id}`).set('Authorization', authorization(author))])
    assert([201, 404].includes(responses[0].status)); assert.equal(responses[1].status, 200)
    assert.equal(await Comments.countDocuments({ post: post._id }), 0); assert.equal(await Post.countDocuments({ _id: post._id }), 0)
    assert.equal((await request(app).post(`${prefix}/comment/addComment`).set('Authorization', authorization(reader)).send({ text: 'Too late', post: post.id })).status, 404)
})

test('category writes require admin; deletion reassigns posts and protects General', async () => {
    assert.equal((await request(app).post(`${prefix}/category/addCategory`).set('Authorization', authorization(reader)).send({ name: 'No', description: 'No' })).status, 403)
    const created = await request(app).post(`${prefix}/category/addCategory`).set('Authorization', authorization(admin)).send({ name: 'Temporary', description: 'Synthetic category' })
    assert.equal(created.status, 201)
    const id = created.body.category._id
    assert.equal((await request(app).put(`${prefix}/post/editPost/${post.id}`).set('Authorization', authorization(author)).send({ category: id })).status, 200)
    assert.equal((await request(app).delete(`${prefix}/category/deleteCategory/${id}`).set('Authorization', authorization(admin))).status, 200)
    assert.equal((await Post.findById(post.id)).category.toString(), category.id)
    assert.equal((await request(app).delete(`${prefix}/category/deleteCategory/${category.id}`).set('Authorization', authorization(admin))).status, 409)
    assert.equal((await request(app).put(`${prefix}/category/editCategory/${category.id}`).set('Authorization', authorization(admin)).send({ name: 'Rename General' })).status, 409)
})

test('public lists are bounded and stable and do not include email or password', async () => {
    await Post.create(Array.from({ length: 3 }, (_, n) => ({ title: `Post ${n}`, text: 'Text', author: author._id, category: category._id })))
    const first = await request(app).get(`${prefix}/post?limite=2&desde=0`)
    const second = await request(app).get(`${prefix}/post?limite=2&desde=2`)
    assert.equal(first.status, 200); assert.equal(first.body.total, 4); assert.equal(first.body.posts.length, 2)
    assert(!first.body.posts.some(one => second.body.posts.some(two => one._id === two._id)))
    assert.equal(first.body.posts[0].author.email, undefined); assert.equal(first.body.posts[0].author.password, undefined)
    assert.equal((await request(app).get(`${prefix}/post?limite=1000`)).status, 400)
    assert.equal((await request(app).get(`${prefix}/comment/post/not-an-id`)).status, 400)
})

test('profile cannot grant roles; public registration cannot create admin; password change revokes JWT', async () => {
    const auth = authorization(reader)
    assert.equal((await request(app).put(`${prefix}/user/updateUser/${reader.id}`).set('Authorization', auth).send({ role: 'ADMIN_ROLE' })).status, 400)
    assert.equal((await request(app).put(`${prefix}/user/updateUser/${author.id}`).set('Authorization', auth).send({ fullName: 'Not mine' })).status, 403)
    assert.equal((await request(app).post(`${prefix}/auth/register`).send({ fullName: 'New', username: 'newadmin', email: 'newadmin@example.test', phone: '55550000', password: 'TestOnly!2026', role: 'ADMIN_ROLE' })).status, 403)
    assert.equal((await request(app).patch(`${prefix}/user/updatePassword/${reader.id}`).set('Authorization', auth).send({ oldPassword: 'TestOnly!2026', newPassword: 'ChangedOnly!2026' })).status, 200)
    assert.equal((await request(app).post(`${prefix}/comment/addComment`).set('Authorization', auth).send({ text: 'Old session', post: post.id })).status, 401)
    const login = await request(app).post(`${prefix}/auth/login`).send({ email: reader.email, password: 'ChangedOnly!2026' })
    assert.equal(login.status, 200); assert(login.body.userDetails.token)
})

test('invalid auth, content and missing resources return safe errors', async () => {
    assert.equal((await request(app).post(`${prefix}/post/addPost`).send({ title: 'No token' })).status, 401)
    assert.equal((await request(app).post(`${prefix}/post/addPost`).set('Authorization', 'Bearer invalid').send({})).status, 401)
    assert.equal((await request(app).post(`${prefix}/comment/addComment`).set('Authorization', authorization(author)).send({ text: ' ', post: post.id })).status, 400)
    assert.equal((await request(app).post(`${prefix}/post/addPost`).set('Authorization', authorization(author)).send({ title: 'Title', text: 'Text', category: new mongoose.Types.ObjectId().toString() })).status, 404)
    const doc = await request(app).get('/openapi.json'); assert.equal(doc.status, 200); assert(doc.body.paths['/post/deletePost/{idPost}'])
})

test('seed and historical orphan repair are repeatable on a separate demo database', async () => {
    const uri = replica.getUri('opinions_seed_demo')
    for (let attempt = 0; attempt < 2; attempt++) {
        const seed = spawnSync(process.execPath, ['scripts/seed.js'], { env: { ...process.env, URI_MONGO: uri }, encoding: 'utf8', timeout: 60000 })
        assert.equal(seed.status, 0, seed.stderr)
    }
    const db = mongoose.connection.getClient().db('opinions_seed_demo')
    assert.equal(await db.collection('users').countDocuments(), 3)
    const orphanId = new mongoose.Types.ObjectId()
    await db.collection('comments').insertOne({ _id: orphanId, text: 'Historical orphan', author: author._id, post: new mongoose.Types.ObjectId() })
    const repaired = spawnSync(process.execPath, ['scripts/repair-comments.js', '--apply'], { env: { ...process.env, URI_MONGO: uri }, encoding: 'utf8', timeout: 60000 })
    assert.equal(repaired.status, 0, repaired.stderr)
    assert.equal(await db.collection('comments').countDocuments({ _id: orphanId }), 0)
})
