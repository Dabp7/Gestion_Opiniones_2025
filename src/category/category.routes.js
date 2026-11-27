import { Router } from "express";
import { addCategory, updateCategory, deleteCategory, getCategories } from "./category.controller.js";
import { validateJWT } from '../middlewares/validate-jwt.js';
import { hasRoles } from '../middlewares/validate-roles.js';
import { param } from 'express-validator';
import { validarCampos } from '../middlewares/validate-fields.js';
import { createCategoryValidator, updateCategoryValidator } from "../middlewares/category-validators.js";

const router = Router();
router.get('/', getCategories);
router.delete('/deleteCategory/:idCategory', validateJWT, hasRoles('ADMIN_ROLE'), param('idCategory').isMongoId(), validarCampos, deleteCategory);


router.post("/addCategory", createCategoryValidator, addCategory);


router.put("/editCategory/:idCategory", updateCategoryValidator, updateCategory);

export default router;
