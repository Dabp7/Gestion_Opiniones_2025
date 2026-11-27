import swaggerUi from 'swagger-ui-express'
const text = (maxLength = 255) => ({ type: 'string', minLength: 1, maxLength })
const id = { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }
const body = (properties, required = Object.keys(properties)) => ({ required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: false, properties, required } } } })
const response = { description: 'Resultado JSON; success y contenido o message' }
const responses = { 200: response, 201: response, 400: { description: 'Datos inválidos' }, 401: { description: 'JWT requerido/inválido' }, 403: { description: 'Rol o perfil no autorizado' }, 404: { description: 'Recurso propio no encontrado' }, 409: { description: 'Conflicto o valor único' } }
const operation = (summary, requestBody, parameter, secure = true) => ({ summary, responses, ...(secure ? { security: [{ bearerAuth: [] }] } : {}), ...(requestBody ? { requestBody } : {}), ...(parameter ? { parameters: [{ name: parameter, in: 'path', required: true, schema: id }] } : {}) })
const paged = summary => ({ summary, responses, parameters: [{ name: 'limite', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }, { name: 'desde', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } }] })
const swaggerDocs = {
    openapi: '3.0.3', info: { title: 'Gestión de Opiniones', version: '1.1.0', description: 'Demo académica. Autoría por JWT, categorías administradas y comentarios transaccionales.' },
    servers: [{ url: '/kinaloop/v1' }], components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    paths: {
        '/auth/register': { post: operation('Registrar USER_ROLE (sin administración)', body({ fullName: text(35), username: text(40), email: { type: 'string', format: 'email' }, phone: { type: 'string', pattern: '^\\d{8}$' }, password: { type: 'string', minLength: 8, maxLength: 128 } }), null, false) },
        '/auth/login': { post: operation('Obtener JWT', body({ email: { type: 'string', format: 'email' }, username: text(40), password: text(128) }, ['password']), null, false) },
        '/post': { get: paged('Listar publicaciones; filtro category opcional') },
        '/post/{idPost}': { get: operation('Consultar publicación', null, 'idPost', false) },
        '/post/addPost': { post: operation('Crear publicación propia', body({ title: text(60), text: text(), category: id })) },
        '/post/editPost/{idPost}': { put: operation('Editar solo publicación propia', body({ title: text(60), text: text(), category: id }, []), 'idPost') },
        '/post/deletePost/{idPost}': { delete: operation('Borrar publicación propia y sus comentarios', null, 'idPost') },
        '/comment/post/{idPost}': { get: { ...paged('Listar comentarios de publicación'), parameters: [{ name: 'idPost', in: 'path', required: true, schema: id }, ...paged('').parameters] } },
        '/comment/addComment': { post: operation('Comentar publicación existente', body({ text: text(), post: id })) },
        '/comment/editComment/{idComment}': { patch: operation('Editar solo texto del comentario propio', body({ text: text() }), 'idComment') },
        '/comment/deleteComment/{idComment}': { delete: operation('Borrar comentario propio', null, 'idComment') },
        '/category': { get: paged('Listar categorías') },
        '/category/addCategory': { post: operation('ADMIN_ROLE: crear categoría', body({ name: text(60), description: text(100) })) },
        '/category/editCategory/{idCategory}': { put: operation('ADMIN_ROLE: editar categoría; General conserva nombre', body({ name: text(60), description: text(100) }, []), 'idCategory') },
        '/category/deleteCategory/{idCategory}': { delete: operation('ADMIN_ROLE: reasignar publicaciones a General y borrar categoría', null, 'idCategory') },
        '/user/updateUser/{uid}': { put: operation('Editar perfil propio sin rol/estado/password', body({ fullName: text(35), username: text(40), email: { type: 'string', format: 'email' }, phone: { type: 'string', pattern: '^\\d{8}$' } }, []), 'uid') },
        '/user/updatePassword/{uid}': { patch: operation('Cambiar contraseña propia e invalidar tokens previos', body({ oldPassword: text(128), newPassword: text(128) }), 'uid') }
    }
}
export { swaggerDocs, swaggerUi }
