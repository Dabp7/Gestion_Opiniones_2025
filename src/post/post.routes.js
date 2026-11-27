import { Router } from "express";
import { addPost, updatePost, deletePost, getPosts, getPost } from "./post.controller.js";
import { param } from 'express-validator';
import { validarCampos } from '../middlewares/validate-fields.js';
import { createPostValidator, updatePostValidator, deletePostValidator } from "../middlewares/post-validators.js";

const router = Router();
router.get('/', getPosts);
router.get('/:idPost', param('idPost').isMongoId(), validarCampos, getPost);


router.post("/addPost", createPostValidator, addPost);


router.put("/editPost/:idPost", updatePostValidator, updatePost)


router.delete("/deletePost/:idPost", deletePostValidator, deletePost)

export default router;
