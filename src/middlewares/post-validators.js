import { body, param } from "express-validator";
import { validarCampos } from "./validate-fields.js";
import { handleErrors } from "./handle-errors.js";
import { validateJWT } from "./validate-jwt.js";
import { postExists } from "../helpers/db-validators.js";
import { hasRoles } from "./validate-roles.js";


export const createPostValidator = [
    validateJWT,
    body("title").isString().trim().isLength({min:1,max:60}).withMessage("Título de 1 a 60 caracteres requerido"),
    body("text").isString().trim().isLength({min:1,max:255}).withMessage("Texto de 1 a 255 caracteres requerido"),
    body("text").isLength({min: 1}).withMessage("El texto debe contener al menos 1 caracter"),
    body("category").isMongoId().withMessage("Categoría válida requerida"),
    validarCampos,
    handleErrors
];

export const updatePostValidator = [
    validateJWT,
    body('title').optional().isString().trim().isLength({min:1,max:60}),
    body('text').optional().isString().trim().isLength({min:1,max:255}),
    body('category').optional().isMongoId(),
    param("idPost", "No es un ID válido").isMongoId(),
    validarCampos,
    handleErrors
];

export const deletePostValidator = [
    validateJWT,
    param("idPost", "No es un ID válido").isMongoId(),
    validarCampos,
    handleErrors
];
