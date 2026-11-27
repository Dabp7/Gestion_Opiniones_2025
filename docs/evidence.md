# Evidencia · 2026-11-27

Entorno: Windows, Node 22.15.0, npm 10.9.2 y MongoDB 8.0 real instalado. Las pruebas iniciaron un replica set temporal aislado con mongodb-memory-server y el binario del sistema; no accedieron a una URI histórica ni a datos existentes.

- `npm run verify`: sintaxis de src/configs/scripts y **8/8 pruebas** pasaron; cero omitidas.
- Autor ajeno no edita ni borra publicaciones/comentarios; campos de propietario y rol se rechazan.
- Crear comentario y borrar su publicación concurrentemente termina sin huérfanos.
- Borrado de comentario retira su referencia del post.
- Solo ADMIN_ROLE administra categorías; se verifica reasignación a General y protección de su nombre/existencia.
- Paginación estable/acotada y proyección sin correo ni hash verificadas.
- Cambio de contraseña invalida JWT previo y permite nuevo login.
- Seed ejecutado dos veces en base `_demo`; tres usuarios ficticios sin duplicados. Reparación eliminó un huérfano histórico de esa base temporal.
- `npm audit --audit-level=high`: **0 vulnerabilidades**.

Docker Compose no se ejecutó localmente porque Docker no está instalado. La semántica transaccional sí se probó en MongoDB real con replica set. El workflow reproduce las pruebas en Linux usando su propio binario.

Se retiraron `.env` y la colección anterior del árbol versionado, sin reescribir Git. La configuración local y `.env.example` contienen valores sintéticos de loopback.
