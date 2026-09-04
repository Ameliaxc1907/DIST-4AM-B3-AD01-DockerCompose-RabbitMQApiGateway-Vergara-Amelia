# Práctica de Aplicaciones Distribuidas: vehículos

Sistema distribuido para administrar categorías y vehículos. La solución usa microservicios .NET 8, autenticación JWT, YARP como API Gateway, mensajería RabbitMQ, un frontend React y persistencia SQL Server/Azure SQL.

La práctica funciona tanto localmente con Docker Compose como en Azure Container Apps.

## Arquitectura

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

Toda petición del frontend pasa por el API Gateway. `CategoriaApi` publica el evento `categoria_creada` y `VehiculoApi` lo consume. OAuthJWT emite el token que ambas APIs validan.

## Componentes

- `OAuthJWT`: autentica usuarios y genera JWT con los roles `Administrador` y `Usuario`.
- `CategoriaApi`: CRUD de `Categorias` y productor de mensajes RabbitMQ.
- `VehiculoApi`: CRUD de `Vehiculos` y consumidor de mensajes RabbitMQ.
- `ApiGateway`: proxy inverso YARP para `/api/Auth`, `/api/Categorias` y `/api/Vehiculos`.
- `Frontend`: React 19 + Vite 8, servido por Nginx. Incluye login, dashboard y CRUD visual.
- `RabbitMQ`: broker AMQP con la cola durable `categoria_creada`.
- `SQL Server`: persistencia local mediante Docker.
- `Azure SQL`: base compartida `VehiculosDB` para ambas APIs en Azure.

## Estructura de datos

### `dbo.Categorias`

| Campo | Tipo |
|---|---|
| `IdCategoria` | `INT IDENTITY`, clave primaria |
| `Nombre` | `NVARCHAR(100) NOT NULL` |
| `Descripcion` | `NVARCHAR(250) NULL` |

### `dbo.Vehiculos`

| Campo | Tipo |
|---|---|
| `IdVehiculo` | `INT IDENTITY`, clave primaria |
| `IdCategoria` | `INT NOT NULL` |
| `Marca` | `NVARCHAR(100) NOT NULL` |
| `Modelo` | `NVARCHAR(100) NOT NULL` |
| `Precio` | `DECIMAL(10,2) NOT NULL` |
| `Stock` | `INT NOT NULL` |
| `Estado` | `BIT NOT NULL` |

Los modelos actuales no definen una clave foránea física entre ambas tablas. El vínculo se mantiene mediante `IdCategoria`, igual que en la implementación original.

## Ejecución local con Docker Compose

Requisitos:

- Docker Desktop.
- Puertos disponibles: `5000`, `5001`, `5002`, `5003`, `5672`, `8088`, `14330` y `15672`.

Desde la raíz del proyecto:

```powershell
Copy-Item .env.example .env
```

Reemplace todos los valores `CHANGE_ME` del archivo `.env`. `JWT_KEY` debe tener al menos 32 caracteres. El archivo `.env` está excluido de Git.

Inicie la solución:

```powershell
docker compose up --build -d
docker compose ps
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

Comandos de operación:

```powershell
docker compose logs -f
docker compose down
```

No use `docker compose down -v` si desea conservar las bases locales.

## Autenticación JWT

El login se realiza siempre mediante el Gateway:

```http
POST /api/Auth/login
Content-Type: application/json

{
  "usuario": "admin",
  "password": "<AUTH_ADMIN_PASSWORD>"
}
```

Ejemplo local con PowerShell:

```powershell
$gateway = "http://localhost:5000"
$loginBody = @{
    usuario = "admin"
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

Resultados esperados:

- Login válido: `200 OK` y un JWT.
- Endpoint protegido sin token: `401 Unauthorized`.
- Token válido de `admin`: `200 OK`.
- Token válido del rol `Usuario`: `403 Forbidden` en los CRUD administrativos.

OAuthJWT, CategoriaApi y VehiculoApi deben usar exactamente la misma clave, emisor y audiencia: `Jwt__Key`, `Jwt__Issuer` y `Jwt__Audience`.

## Endpoints principales

Todos los endpoints públicos se consumen por el API Gateway.

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/Auth/login` | Generar JWT |
| `GET` | `/api/Categorias` | Listar categorías |
| `GET` | `/api/Categorias/{id}` | Consultar categoría |
| `POST` | `/api/Categorias` | Crear categoría y publicar evento |
| `PUT` | `/api/Categorias/{id}` | Actualizar categoría |
| `DELETE` | `/api/Categorias/{id}` | Eliminar categoría |
| `GET` | `/api/Vehiculos` | Listar vehículos |
| `GET` | `/api/Vehiculos/{id}` | Consultar vehículo |
| `GET` | `/api/Vehiculos/categoria/{idCategoria}` | Listar vehículos por categoría |
| `POST` | `/api/Vehiculos` | Crear vehículo |
| `PUT` | `/api/Vehiculos/{id}` | Actualizar vehículo |
| `DELETE` | `/api/Vehiculos/{id}` | Eliminar vehículo |

Para Azure, anteponga la URL pública del Gateway. Para local, use `http://localhost:5000`.

## Flujo RabbitMQ

1. El cliente envía `POST /api/Categorias` con un JWT de administrador.
2. ApiGateway dirige la solicitud a CategoriaApi.
3. CategoriaApi guarda la categoría en SQL.
4. CategoriaApi declara la cola durable `categoria_creada` y publica la categoría serializada.
5. VehiculoApi consume y confirma el mensaje manualmente.
6. Si no existe un vehículo para `IdCategoria`, crea uno con marca y modelo `Sin asignar`, precio y stock `0`, y estado activo.
7. El nuevo vehículo puede consultarse mediante `/api/Vehiculos/categoria/{idCategoria}`.

El frontend nunca se conecta directamente a RabbitMQ; observa el resultado actualizando los datos desde el Gateway.

## Despliegue final en Azure

### Recursos

- Resource Group: `rg-practica-vehiculos`
- Azure Container Registry: `acrvehiculosame2026.azurecr.io`
- Azure SQL Server: `sql-vehiculos-ame2026-central.database.windows.net`
- Azure SQL Database: `VehiculosDB`
- Container Apps Environment: `env-practica-vehiculos`
- Región: `centralus`

### Container Apps

- `rabbitmq-vehiculos`
- `oauthjwt-vehiculos`
- `categoria-vehiculos`
- `vehiculo-vehiculos`
- `gateway-vehiculos`
- `frontend-vehiculos`

OAuthJWT, CategoriaApi y VehiculoApi tienen ingress interno. RabbitMQ expone internamente AMQP en el puerto `5672`. ApiGateway y Frontend tienen ingress externo.

### Imágenes en ACR

- `acrvehiculosame2026.azurecr.io/oauthjwt:latest`
- `acrvehiculosame2026.azurecr.io/categoria:latest`
- `acrvehiculosame2026.azurecr.io/vehiculo:latest`
- `acrvehiculosame2026.azurecr.io/apigateway:latest`
- `acrvehiculosame2026.azurecr.io/frontend:latest`

RabbitMQ usa la imagen oficial `rabbitmq:4-management`.

### URLs públicas

- Frontend: [https://frontend-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io](https://frontend-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io)
- API Gateway: [https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io](https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io)

Las demás aplicaciones son internas y no deben consumirse directamente desde Internet.

### Azure SQL

En Azure, `ConnectionStrings__CategoriasConnection` y `ConnectionStrings__VehiculosConnection` apuntan a la misma base `VehiculosDB`. El esquema se encuentra en `init_databases.azure.sql`; no crea bases, logins ni usuarios y no contiene credenciales.

La cadena debe exigir cifrado y validación del certificado:

```text
Server=tcp:sql-vehiculos-ame2026-central.database.windows.net,1433;Initial Catalog=VehiculosDB;User ID=<AZURE_SQL_USER>;Password=<AZURE_SQL_PASSWORD>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

## Seguridad

- Las contraseñas, cadenas SQL, claves JWT y credenciales ACR se almacenan como secretos de Azure Container Apps.
- `.env`, certificados y archivos locales de credenciales están excluidos de Git.
- `.env.example` y `CLAVES_AZURE_EJEMPLO.txt` contienen únicamente placeholders.
- El frontend no conoce la clave JWT ni credenciales de servicios.
- `MEMORIA_COMANDOS_AZURE.md` conserva el procedimiento con valores sensibles sustituidos por placeholders.

## Detención y eliminación después de la revisión

Los recursos deben permanecer disponibles, como mínimo, hasta el domingo 13/09/2026. No ejecute la eliminación antes de esa fecha ni antes de que finalice la revisión de la práctica.

Después de la revisión, la forma más sencilla de detener definitivamente los servicios y evitar consumo posterior es eliminar el Resource Group completo:

```powershell
az group delete `
    --name rg-practica-vehiculos `
    --yes `
    --no-wait
```

El comando elimina en segundo plano todos los recursos contenidos en `rg-practica-vehiculos`; debe ejecutarse únicamente cuando ya no sea necesario conservar la práctica publicada.
