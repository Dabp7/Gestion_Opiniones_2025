import { body, param } from "express-validator";
import { validarCampos } from "./validate-fields.js";
import { categoryExists } from "../helpers/db-validators.js";
import { handleErrors } from "./handle-errors.js";
import { validateJWT } from "./validate-jwt.js";
import { hasRoles } from "./validate-roles.js";

export const createCategoryValidator = [
    validateJWT,
    hasRoles("ADMIN_ROLE"),
    body("name").isString().trim().isLength({min:1,max:60}).withMessage("Nombre de 1 a 60 caracteres requerido"),
    body("description").isString().trim().isLength({min:1,max:100}).withMessage("Descripción de 1 a 100 caracteres requerida"),
    validarCampos,
    handleErrors
];

export const updateCategoryValidator = [
    validateJWT,
    hasRoles("ADMIN_ROLE"),
    body('name').optional().isString().trim().isLength({min:1,max:60}),
    body('description').optional().isString().trim().isLength({min:1,max:100}),
    param("idCategory", "No es un ID válido").isMongoId(),
    validarCampos,
    handleErrors
];
