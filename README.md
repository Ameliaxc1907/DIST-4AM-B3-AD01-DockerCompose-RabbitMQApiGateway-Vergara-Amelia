# Práctica de Aplicaciones Distribuidas: vehículos

**Tema asignado:** sistema distribuido para la gestión de categorías y vehículos.

La solución implementa microservicios .NET 8, autenticación JWT, un API Gateway con YARP, mensajería RabbitMQ, un frontend React y persistencia en SQL Server/Azure SQL. Puede ejecutarse localmente con Docker Compose y está desplegada en Azure Container Apps.

## Arquitectura distribuida

```text
Navegador / Postman
        |
        v
Frontend React -----> API Gateway YARP
                         |       |       |
                         v       v       v
                     OAuthJWT Categoria Vehiculo
                                  |        ^
                                  v        |
                             RabbitMQ -----+
                                  |
                SQL Server local / Azure SQL
```

El cliente obtiene el JWT a través del Gateway y lo envía como Bearer Token. El Gateway enruta las solicitudes a OAuthJWT, CategoriaApi o VehiculoApi. Al crear una categoría, CategoriaApi persiste el registro y publica `categoria_creada`; VehiculoApi consume el evento y crea automáticamente un vehículo asociado.

## Componentes

- `OAuthJWT`: autentica `admin` y `user`; emite JWT con los roles `Admin` y `User`.
- `ApiGateway`: proxy YARP para `/api/Auth`, `/api/Categorias` y `/api/Vehiculos`; centraliza el acceso público y CORS.
- `CategoriaApi`: CRUD de `Categorias` y productor RabbitMQ.
- `VehiculoApi`: CRUD de `Vehiculos` y consumidor RabbitMQ.
- `RabbitMQ`: broker AMQP; usa la cola durable `categoria_creada`.
- `Frontend`: React 19 + Vite 8 servido por Nginx; incluye login, dashboard y gestión según el rol.
- `SQL Server`: persistencia local en dos bases creadas por `init_databases.sql`.
- `Azure SQL`: base compartida `VehiculosDB`, inicializada con `init_databases.azure.sql`.

## Datos

`dbo.Categorias` contiene `IdCategoria`, `Nombre` y `Descripcion`. `dbo.Vehiculos` contiene `IdVehiculo`, `IdCategoria`, `Marca`, `Modelo`, `Precio`, `Stock` y `Estado`.

Los modelos actuales no definen una clave foránea física entre las tablas. La asociación se conserva mediante `IdCategoria`, tal como está implementado en los dos microservicios.

## Ejecución local con Docker Compose

Requisitos:

- Docker Desktop.
- Puertos disponibles: `5000`, `5001`, `5002`, `5003`, `5672`, `8088`, `14330` y `15672`.

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
```

Reemplace todos los valores `CHANGE_ME` de `.env`. `JWT_KEY` debe tener al menos 32 caracteres. `.env` está excluido de Git; no coloque secretos en `.env.example`.

Levante y verifique la solución:

```powershell
docker compose up --build -d
docker compose ps
docker compose logs -f
```

Servicios locales:

| Servicio | URL o puerto |
|---|---|
| Frontend | `http://localhost:8088` |
| API Gateway | `http://localhost:5000` |
| CategoriaApi | `http://localhost:5001` |
| VehiculoApi | `http://localhost:5002` |
| OAuthJWT | `http://localhost:5003` |
| RabbitMQ AMQP | `localhost:5672` |
| RabbitMQ Management | `http://localhost:15672` |
| SQL Server | `localhost:14330` |

Para detener los contenedores:

```powershell
docker compose down
```

No use `docker compose down -v` si desea conservar las bases locales.

## Autenticación JWT

El login se realiza mediante el Gateway:

```http
POST /api/Auth/login
Content-Type: application/json
```

JSON para `admin`:

```json
{
  "username": "admin",
  "password": "<AUTH_ADMIN_PASSWORD>"
}
```

JSON para `user`:

```json
{
  "username": "user",
  "password": "<AUTH_USER_PASSWORD>"
}
```

`username` es la propiedad recomendada. Por compatibilidad, OAuthJWT también acepta la propiedad antigua `usuario` cuando `username` está vacío.

Ejemplo local para obtener y utilizar el Bearer Token:

```powershell
$gateway = "http://localhost:5000"
$loginBody = @{
  username = "admin"
  password = "<AUTH_ADMIN_PASSWORD>"
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Uri "$gateway/api/Auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $loginBody

$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Uri "$gateway/api/Categorias" -Headers $headers
```

OAuthJWT, CategoriaApi y VehiculoApi deben compartir los mismos valores `Jwt__Key`, `Jwt__Issuer` y `Jwt__Audience`.

### Roles y códigos de autorización

| Operación | Admin | User |
|---|---:|---:|
| `GET` | Permitido | Permitido |
| `POST` | Permitido | `403 Forbidden` |
| `PUT` | Permitido | `403 Forbidden` |
| `DELETE` | Permitido | `403 Forbidden` |

- `401 Unauthorized`: falta el token, no es válido o expiró.
- `403 Forbidden`: el token es válido, pero el rol no permite la operación.

## Endpoints principales

Todas las rutas se consumen mediante el API Gateway.

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/api/Auth/login` | Público |
| `GET` | `/api/Categorias` | Admin, User |
| `GET` | `/api/Categorias/{id}` | Admin, User |
| `POST` | `/api/Categorias` | Admin |
| `PUT` | `/api/Categorias/{id}` | Admin |
| `DELETE` | `/api/Categorias/{id}` | Admin |
| `GET` | `/api/Vehiculos` | Admin, User |
| `GET` | `/api/Vehiculos/{id}` | Admin, User |
| `GET` | `/api/Vehiculos/categoria/{idCategoria}` | Admin, User |
| `POST` | `/api/Vehiculos` | Admin |
| `PUT` | `/api/Vehiculos/{id}` | Admin |
| `DELETE` | `/api/Vehiculos/{id}` | Admin |

En local, anteponga `http://localhost:5000`. En Azure, anteponga la URL pública del Gateway indicada más adelante.

## Sesión JWT en el frontend

- El login envía `username` y `password` al Gateway.
- El token se guarda en `sessionStorage`; no se guarda ninguna contraseña.
- Antes de aceptar una sesión, el cliente comprueba que el JWT tenga tres segmentos, identidad, rol `Admin` o `User` y una expiración `exp` vigente. La firma y autorización se validan siempre en las APIs.
- Todas las lecturas protegidas agregan automáticamente `Authorization: Bearer <token>`.
- Un `401` elimina la sesión y devuelve al login con el aviso de sesión expirada.
- Un `403` muestra el error de permisos y conserva la sesión.
- Para `User`, el frontend oculta o deshabilita las acciones de escritura; la protección definitiva permanece en las APIs.

## Flujo RabbitMQ

1. Un administrador envía `POST /api/Categorias`.
2. ApiGateway enruta la solicitud a CategoriaApi.
3. CategoriaApi guarda la categoría en SQL.
4. CategoriaApi publica la categoría serializada en la cola durable `categoria_creada`.
5. RabbitMQ entrega el mensaje a VehiculoApi.
6. VehiculoApi confirma el mensaje y, si no existe un vehículo para ese `IdCategoria`, crea uno con marca y modelo `Sin asignar`, precio y stock `0`, y estado activo.
7. El resultado se consulta en `GET /api/Vehiculos/categoria/{idCategoria}`.

El frontend no se conecta directamente a RabbitMQ; visualiza el resultado actualizando los datos mediante el Gateway.

## Servicios desplegados en Azure

Recursos principales:

- Resource Group: `rg-practica-vehiculos`
- Azure Container Registry: `acrvehiculosame2026.azurecr.io`
- Azure SQL Server: `sql-vehiculos-ame2026-central.database.windows.net`
- Azure SQL Database: `VehiculosDB`
- Container Apps Environment: `env-practica-vehiculos`
- Región: `centralus`

Container Apps:

- `rabbitmq-vehiculos`
- `oauthjwt-vehiculos`
- `categoria-vehiculos`
- `vehiculo-vehiculos`
- `gateway-vehiculos`
- `frontend-vehiculos`

Imágenes finales:

- `acrvehiculosame2026.azurecr.io/oauthjwt:latest`
- `acrvehiculosame2026.azurecr.io/categoria:roles-v1`
- `acrvehiculosame2026.azurecr.io/vehiculo:roles-v1`
- `acrvehiculosame2026.azurecr.io/apigateway:latest`
- `acrvehiculosame2026.azurecr.io/frontend:roles-v2`
- RabbitMQ: imagen oficial `rabbitmq:4-management`

OAuthJWT, CategoriaApi y VehiculoApi tienen ingress interno. RabbitMQ expone internamente AMQP en el puerto `5672`. ApiGateway y Frontend tienen ingress externo.

URLs públicas:

- Frontend: [https://frontend-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io](https://frontend-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io)
- API Gateway: [https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io](https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io)

En Azure, `ConnectionStrings__CategoriasConnection` y `ConnectionStrings__VehiculosConnection` apuntan a `VehiculosDB`. `init_databases.azure.sql` crea únicamente las tablas y datos requeridos; no crea bases, logins ni usuarios y no contiene credenciales.

## Guion de comprobación

La documentación permite demostrar, en este orden:

1. Login de `admin` y obtención del JWT a través del Gateway.
2. `GET` con Bearer Token y respuesta `200`.
3. La misma ruta sin token y respuesta `401`.
4. Login de `user`, `GET` con respuesta `200` y escritura con respuesta `403`.
5. CRUD completo con `admin`.
6. Creación de una categoría, publicación `categoria_creada` y aparición automática del vehículo `Sin asignar`.
7. Frontend, Gateway, Container Apps y datos persistidos en Azure SQL.

Los comandos reproducibles y sanitizados están en `MEMORIA_COMANDOS_AZURE.md`.

## Seguridad

- Contraseñas, cadenas SQL, claves JWT y credenciales ACR se proporcionan mediante `.env` local o secretos de Azure Container Apps.
- `.env`, certificados, credenciales y archivos generados están excluidos de Git.
- `.env.example` y `CLAVES_AZURE_EJEMPLO.txt` contienen exclusivamente placeholders.
- El frontend no contiene la clave JWT ni credenciales de servicios.

## Detención y eliminación después de la revisión

Los recursos deben permanecer disponibles como mínimo hasta el domingo **13/09/2026**. No ejecute la eliminación antes de esa fecha ni antes de finalizar la revisión.

Después de la revisión, elimine el Resource Group completo para detener definitivamente los servicios y evitar consumo posterior:

```powershell
az group delete `
  --name rg-practica-vehiculos `
  --yes `
  --no-wait
```

Este comando elimina en segundo plano todos los recursos contenidos en `rg-practica-vehiculos`.
