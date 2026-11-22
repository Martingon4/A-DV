# Donaciones donde hacen falta

Aplicación Next.js con PostgreSQL, Prisma y Auth.js. Interfaz en español adaptable a celular. Coordina solicitudes, registra inventario, propone un reparto proporcional, reserva kits y registra entregas con historial.

## Inicio local

Requiere Node.js 22 o superior, npm y Docker.

1. Ejecutar `npm ci`.
2. Copiar `.env.example` a `.env` y generar AUTH_SECRET mediante `openssl rand -base64 32`.
3. Ejecutar `docker compose up -d`.
4. Ejecutar `npx prisma generate` y `npx prisma migrate deploy`.
5. Ejecutar `npm run db:seed`.
6. Ejecutar `npm run dev` y abrir la dirección Local que imprime Next.js.

La base local contiene tres centros con necesidades de 80, 60 y 40 kits. El inventario inicial es cero. El seed es idempotente y conserva los movimientos existentes.

Con DEMO_AUTH=true en desarrollo, el acceso permite elegir coordinación o Centro Esperanza. Estas cuentas usan datos ficticios. El acceso de demostración queda deshabilitado en producción por código.

## Acceso Google y despliegue

Configurar AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET, AUTH_SECRET y DATABASE_URL del alojamiento PostgreSQL elegido. Registrar la URL de callback `https://TU_DOMINIO/api/auth/callback/google` en el proveedor OAuth. Crear previamente una fila Membership para cada correo invitado, con role COORDINATOR o CENTER y un centerId perteneciente a la misma organización en el segundo caso. Las invitaciones se administran en la base durante esta primera versión.

Aplicar las migraciones al alojamiento y ejecutar `npm run build` y `npm start`. Usar TLS y un pool compatible en el alojamiento seleccionado. Las credenciales de Google y el despliegue público requieren configuración externa y todavía no se han verificado.

## Comprobaciones

- `npm test` verifica el algoritmo.
- `npm run typecheck` verifica tipos.
- `npm run test:integration` usa PostgreSQL, crea datos temporales y los elimina al terminar. Comprueba idempotencia, concurrencia y permisos.
- `npm run build` compila producción.
- `APP_URL=http://localhost:3005 npm run test:browser` ejecuta el recorrido con Playwright. Instalar Chromium con `npx playwright install chromium` si falta. Opcionalmente definir CHROMIUM_PATH para un navegador ya instalado.

La prueba de navegador registra una donación de 90 kits, confirma un reparto y entrega una asignación en la campaña de demostración. Usarla con datos ficticios dedicados.

## Estado de esta versión

Flujo funcional de una campaña, un producto y tres centros. Registro de donaciones con referencia, solicitudes editables, propuesta explicable, reservas, cancelaciones y entregas completas. El servidor comprueba permisos por organización y centro. Las operaciones de escritura bloquean el saldo y se ejecutan en transacciones con reintentos de conflictos.

La interfaz utiliza CSS propio y Lucide para reproducir la dirección visual del plan. La selección de Tailwind y shadcn/ui queda sustituida por estos estilos y componentes para esta primera versión. El tema oficial específico del hackathon y la validación con una organización continúan pendientes.

El usuario grabará la pantalla del celular. Otra persona añadirá voz, subtítulos y edición al video final de hasta tres minutos. Acreditar la asistencia de IA y explicar el código conforme a las reglas del evento.

## Despliegue en Render

El Blueprint render.yaml prepara una web Node y una base PostgreSQL en la misma región, ambas con plan gratuito. El repositorio debe estar conectado a Render. Crear un Blueprint desde ese repositorio y completar AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET y COORDINATOR_EMAIL en los campos privados del panel. AUTH_SECRET se genera automáticamente.

Al conocer el dominio onrender.com asignado, registrarlo en los orígenes del cliente OAuth de Google y añadir la URL de retorno https://TU_DOMINIO/api/auth/callback/google. El correo de coordinación debe coincidir con la cuenta Google que iniciará sesión.

El comando de inicio aplica migraciones y carga datos ficticios mediante un seed idempotente cuando SEED_DEMO=true. La primera carga crea tres centros e inventario cero. En reinicios conserva movimientos existentes. La comprobación /api/health verifica conexión a PostgreSQL. DEMO_AUTH está desactivado en producción.

El plan gratuito de la base caduca a los 30 días. La web gratuita se suspende tras 15 minutos sin tráfico y puede tardar aproximadamente un minuto en reactivarse. Revisar estas condiciones en https://render.com/docs/free antes de usarlo con información operativa.

## Criterio de distribución

Necesidad pendiente = solicitado − reservado − entregado. Si el inventario alcanza, cada centro recibe toda su necesidad pendiente. En escasez, cuota = inventario disponible × necesidad del centro / necesidad total. Primero se asigna la parte entera y las unidades restantes se reparten por mayor resto decimal. En empate se usa el identificador estable del centro.

Ejemplo de 90 kits con necesidades de 80, 60 y 40 produce asignaciones de 40, 30 y 20. Todas las solicitudes tienen igual prioridad. Coordinación revisa y confirma. Esta política inicial requiere acuerdo con la organización para un uso real.
