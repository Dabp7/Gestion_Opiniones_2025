# SPEC · Autoría y comentarios consistentes

## Objetivo

Una persona edita y elimina solo sus publicaciones/comentarios, los roles administrativos no se obtienen desde el registro/perfil y los comentarios no quedan huérfanos al borrar una publicación, incluso bajo concurrencia.

## Contratos

- Autor se toma del JWT; IDs de autor, propietario y post no son editables desde el body.
- Mutaciones ajenas devuelven 404 sin filtrar contenido. Perfil ajeno y rol insuficiente: 403. Token ausente o inválido: 401.
- Crear comentario escribe el post y guarda comentario/referencia en la misma transacción. Borrar post elimina todos sus comentarios en la misma transacción. Ambos escriben el padre y una carrera provoca reintento con snapshot actual.
- Borrar comentario retira su referencia del padre atómicamente. Si era un huérfano histórico, el autor puede retirarlo; un comando explícito repara copias de demo.
- Categorías solo ADMIN_ROLE. General no se borra ni renombra. Borrar otra categoría reasigna publicaciones a General dentro de una transacción; crear/recategorizar escribe la categoría y no deja referencias a una categoría retirada.
- Registro público siempre USER_ROLE; perfil excluye rol/status/password. Cambio de contraseña exige la anterior e invalida tokens previos.
- Texto 1..255, título 1..60, categorías con nombre 1..60 y descripción 1..100; IDs validados, paginación estable 1..100.

## Decisiones

Conservar MongoDB/Mongoose y rutas originales reduce cambios para clientes académicos. Se requiere replica set para transacciones reales. Se conservó la referencia de comentarios en el post por compatibilidad y se mantienen ambos documentos atómicamente; una tabla separada como única fuente sería una migración posterior deliberada.

No crear administradores con contraseñas fijas al arrancar. El seed explícito, idempotente y limitado a bases `_demo` contiene cuentas ficticias y nunca elimina datos existentes.

## Cierre

Pruebas con MongoDB real: permisos por recurso, rechazo de campos peligrosos, borrado concurrente sin huérfanos, reglas de categorías, paginación/proyección, revocación por contraseña, seed y reparación histórica. CI reproduce los comandos y OpenAPI describe las rutas implementadas.
