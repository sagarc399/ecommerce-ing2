# Proyecto: Ecommerce - Electiva Ingeniería de Software II (USCO)

## Qué es
Tienda web con: inicio de sesión (JWT), CRUD de productos (solo admin), carrito de compras, checkout con pago SIMULADO y vista "Mis pedidos". Se basa en una arquitectura de referencia: Cliente → API Gateway/Auth (JWT + roles) → servicio con validaciones → PostgreSQL con transacciones ACID.

## Stack (no cambiar)
- Base de datos: PostgreSQL 16 en Docker (docker-compose.yml en la raíz), expuesto en el puerto 5434 del host (5432 y 5433 los ocupan PostgreSQL nativos de Windows)
- Backend: Node.js + Express + TypeScript, librería `pg` (sin ORM), bcryptjs, jsonwebtoken, dotenv, cors
- Frontend: React + Vite + TypeScript + Tailwind CSS v3

## Estructura
- database/ → schema.sql
- backend/ → API REST
- frontend/ → app React

## Reglas obligatorias
- Trabajar por fases. No avanzar a la siguiente fase sin que yo lo confirme.
- No modificar database/schema.sql sin preguntarme primero.
- Nombres de tablas, columnas y mensajes en español.
- Contraseñas siempre con bcrypt. Nunca guardar el número completo de tarjeta, solo los últimos 4 dígitos.
- Eliminar producto = borrado lógico (activo = false), nunca DELETE físico.
- El checkout debe ser UNA transacción (BEGIN/COMMIT/ROLLBACK) con SELECT ... FOR UPDATE sobre los productos para evitar sobreventa.
- Pago simulado: tarjeta que termina en 0000 → RECHAZADO; cualquier otra → APROBADO.
- Códigos HTTP correctos: 401 sin token o token inválido, 403 sin permiso por rol, 400 datos inválidos, 404 no encontrado, 409 conflicto (ej. sin stock).
- Secretos solo en .env, nunca valores por defecto en el código.

## Fases
1. Base de datos en Docker ✅
2. Backend: auth (registro/login) + seed de admin ✅
3. Backend: CRUD de productos ✅
4. Backend: órdenes + pago simulado (transacción) ✅
5. Frontend: login, catálogo, carrito ✅
6. Frontend: checkout, mis pedidos, panel admin ← SIGUIENTE (esperando confirmación)
7. Pruebas y evidencias
