import { Router } from "express";
import { addComment , updateComment, deleteComment, getComments} from "./comments.controller.js";
import { param } from 'express-validator';
import { validarCampos } from '../middlewares/validate-fields.js';
import { createCommentValidator, updateCommentValidator, deleteCommentValidator } from "../middlewares/comments-validators.js";

const router = Router();
router.get('/post/:idPost', param('idPost').isMongoId(), validarCampos, getComments);


router.post("/addComment", createCommentValidator, addComment);


router.patch("/editComment/:idComment", updateCommentValidator, updateComment)


router.delete("/deleteComment/:idComment", deleteCommentValidator, deleteComment)

export default router;
