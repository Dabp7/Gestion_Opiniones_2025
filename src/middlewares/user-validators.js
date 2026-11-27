import { body, param } from "express-validator";
import { emailExists, usernameExists, userExists } from "../helpers/db-validators.js";
import { validarCampos } from "./validate-fields.js";
import { handleErrors } from "./handle-errors.js";
import { hasRoles} from "./validate-roles.js";
import { validateJWT } from "./validate-jwt.js"


export const registerValidator = [
    body("fullName").isString().trim().isLength({min:1,max:35}).withMessage("Nombre de 1 a 35 caracteres requerido"),
    body("username").notEmpty().withMessage("El username es requerido"),
    body("email").notEmpty().withMessage("El email es requerido"),
    body("email").isEmail().withMessage("No es un email válido"),
    body("email").custom(emailExists),
    body("username").custom(usernameExists),
    body('phone').matches(/^\d{8}$/),
    body("password").isString().isLength({max:128}).isStrongPassword({
        minLength: 8,
        minLowercase:1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    }),
    validarCampos,
    handleErrors
]

export const loginValidator = [
    body("email").optional().isEmail().withMessage("No es un email válido"),
    body("username").optional().isString().withMessage("Username es en formáto erróneo"),
    body("password").isString().isLength({min:8,max:128}).withMessage("El password debe contener de 8 a 128 caracteres"),
    validarCampos,
    handleErrors
]

export const updateUserValidator = [
    validateJWT,
    body('fullName').optional().isString().trim().isLength({min:1,max:35}),
    body('username').optional().isString().trim().isLength({min:3,max:40}),
    body('email').optional().isEmail(),
    body('phone').optional().matches(/^\d{8}$/),
    param("uid", "No es un ID válido").isMongoId(),
    param("uid").custom(userExists),
    validarCampos,
    handleErrors
];


export const updatePasswordValidator = [
    validateJWT,
    param("uid").isMongoId().withMessage("No es un ID válido de MongoDB"),
    param("uid").custom(userExists),
    body('oldPassword').isString().isLength({min:8,max:128}),
    body("newPassword").isString().isLength({max:128}).isStrongPassword().withMessage("La nueva contraseña debe ser fuerte"),
    validarCampos,
    handleErrors
];
