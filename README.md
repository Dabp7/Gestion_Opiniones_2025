# Gestión de Opiniones · Kinaloop

API académica de publicaciones, comentarios y categorías con Node.js, Express, MongoDB/Mongoose, Argon2 y JWT. Esta entrega comprueba autoría, evita comentarios huérfanos bajo concurrencia y ofrece una demo reproducible con datos ficticios.

## Instalar y ejecutar

Requisitos: Node 24 LTS (también verificado con 22.15), npm y MongoDB 8 en replica set. Las transacciones de comentarios y categorías requieren replica set; el servidor rechaza una base standalone.

```sh
git clone https://github.com/Dabp7/Gestion_Opiniones_2025.git
cd Gestion_Opiniones_2025
npm ci
docker compose up -d --wait
```

Copiar `.env.example` como `.env`, elegir una clave JWT propia de al menos 32 caracteres y ejecutar:

```sh
npm run seed
npm start
```

API: http://127.0.0.1:3007. Swagger: http://127.0.0.1:3007/api-docs. Contrato JSON: `/openapi.json`. Mongo publica solo loopback en 27027 y usa `directConnection=true` por el puerto interno anunciado por su replica set. `docker compose down` conserva el volumen de demo.

El seed solo admite bases terminadas en `_demo`, no elimina datos y puede repetirse. Crea `admin_demo@example.test`, `author_demo@example.test` y `reader_demo@example.test`, contraseña **ficticia** `DemoOnly!2026`, categoría General y una publicación. El arranque normal **no** crea administradores con contraseñas predeterminadas.

## Autenticación y autoría

Prefijo de rutas: `/kinaloop/v1`. Login devuelve `userDetails.token`; enviar `Authorization: Bearer <token>` o `x-token`. Ya no se aceptan tokens en URL ni en body. Duran una hora y cambiar contraseña invalida las sesiones anteriores.

- `POST /auth/register`: `fullName` (1..35), `username`, `email`, `phone` de ocho dígitos y contraseña fuerte (8..128). Registro público solo USER_ROLE; un `role=ADMIN_ROLE` se rechaza.
- `POST /auth/login`: `email` o `username` y `password`.
- `PUT /user/updateUser/:uid`: solo perfil propio; permite fullName/username/email/phone, nunca rol, estado o contraseña.
- `PATCH /user/updatePassword/:uid`: `oldPassword` y `newPassword`, solo perfil propio. Luego hay que iniciar sesión otra vez.

El autor de publicaciones y comentarios se deriva del JWT, no de IDs enviados por el cliente. Ni siquiera ADMIN_ROLE puede editar publicaciones/comentarios de otro autor: su privilegio administrativo corresponde a categorías.

## Publicaciones y comentarios

- `GET /post?limite=20&desde=0&category=<id>`: listado público, orden estable por ID descendente y filtro opcional. `GET /post/:idPost`: detalle.
- `POST /post/addPost`: `title` (1..60), `text` (1..255), `category` válida.
- `PUT /post/editPost/:idPost`: solo autor; permite title/text/category.
- `DELETE /post/deletePost/:idPost`: solo autor; elimina publicación y sus comentarios en una transacción.
- `GET /comment/post/:idPost?limite=20&desde=0`: comentarios paginados, orden estable por ID ascendente.
- `POST /comment/addComment`: `text` (1..255) y `post` existente.
- `PATCH /comment/editComment/:idComment`: solo autor y solo texto.
- `DELETE /comment/deleteComment/:idComment`: solo autor; retira la referencia del post en la misma transacción.

Crear comentario y borrar publicación escriben el mismo documento padre dentro de transacciones. Una carrera se reintenta con un snapshot actualizado: el resultado final no deja comentarios para un post eliminado. Se conserva el array histórico `Post.comments` por compatibilidad, pero sus cambios y los de `Comments` son atómicos.

Los listados públicos no proyectan email, contraseña ni datos de perfil privados. Paginación: limite de 1 a 100, desde entero no negativo. No se aceptan campos de propietario, post, comments, rol o estado en actualizaciones que no los contemplan.

## Categorías

`GET /category` es público y paginado. Las siguientes rutas requieren ADMIN_ROLE:

- `POST /category/addCategory`: name (1..60), description (1..100).
- `PUT /category/editCategory/:idCategory`: solo name/description.
- `DELETE /category/deleteCategory/:idCategory`: reasigna las publicaciones a General y elimina la categoría en la misma transacción.

General no puede eliminarse ni renombrarse. Crear/recategorizar una publicación también escribe su categoría para coordinarse con una eliminación concurrente. El nombre de categoría es único.

## Datos históricos

Las operaciones nuevas mantienen las referencias. Para revisar una copia histórica:

```sh
npm run repair:comments
npm run repair:comments -- --apply
```

El primer comando solo informa. `--apply` exige una base terminada en `_demo`: elimina comentarios cuyo padre no existe y reconstruye `Post.comments` desde los comentarios válidos, con transacciones. No se ejecuta automáticamente ni se elimina una base existente. Hacer una copia de los datos que se quieran conservar antes de preparar una migración fuera de esta demo.

## Verificación

```sh
npm run verify
npm audit --audit-level=high
```

Las pruebas inician un MongoDB **real** en replica set temporal con mongodb-memory-server; no usan un mock del ODM ni una base de producción. La configuración del package impide descargar Mongo durante `npm ci`; el binario se obtiene al ejecutar tests o se puede reutilizar uno instalado:

```powershell
$env:MONGOMS_SYSTEM_BINARY = 'C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe'
$env:MONGOMS_SYSTEM_BINARY_VERSION_CHECK = 'false'
npm run verify
```

La suite verifica autoría, campos protegidos, carrera comentario/borrado, categorías, paginación/proyección, tokens, cambio de contraseña, seed idempotente y reparación de huérfanos históricos. CI instala desde lockfile y ejecuta esos comandos.

Respuestas: 400 validación; 401 JWT inválido/ausente; 403 rol/perfil no autorizado; 404 recurso propio inexistente o ajeno; 409 conflicto o duplicado. Los errores internos no devuelven stacks, conexiones ni hashes.

`.env` y la colección antigua dejaron de versionarse; el historial no se reescribió. Si una credencial histórica fue real, revocarla en su proveedor. La demo escucha en loopback y usa datos ficticios. Continúa siendo una API académica: no incluye moderación productiva, recuperación de contraseña por correo ni edición enriquecida de HTML.

Ver [SPEC](docs/SPEC.md) y [evidencia](docs/evidence.md).
