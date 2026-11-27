import { body, param } from "express-validator";
import { validarCampos } from "./validate-fields.js";
import { commentExists } from "../helpers/db-validators.js";
import { handleErrors } from "./handle-errors.js";
import { validateJWT } from "./validate-jwt.js";

export const createCommentValidator = [
    validateJWT,
    body("text").isString().trim().isLength({min:1,max:255}).withMessage("Texto de 1 a 255 caracteres requerido"),
    body("post").isMongoId().withMessage("Publicación válida requerida"),
    validarCampos,
    handleErrors
];

export const updateCommentValidator = [
    validateJWT,
    body('text').isString().trim().isLength({min:1,max:255}),
    param("idComment", "No es un ID válido").isMongoId(),
    validarCampos,
    handleErrors
];

export const deleteCommentValidator = [
    validateJWT,
    param("idComment", "No es un ID válido").isMongoId(),
    validarCampos,
    handleErrors
];

