# Memoria sanitizada de comandos Azure

Registro ordenado y reproducible del despliegue final. Los nombres de recursos y las URLs públicas no son secretos. Todos los datos sensibles se sustituyeron por placeholders `<...>`.

Los recursos deben permanecer disponibles como mínimo hasta el **13/09/2026**. El comando de eliminación de la sección final no debe ejecutarse antes de esa fecha ni antes de finalizar la revisión.

## 1. Login y verificación

```powershell
az login
az account list --output table
az account set --subscription "<AZURE_SUBSCRIPTION_ID>"
az account show --output table
az extension add --name containerapp --upgrade
```

## 2. Registro de providers

```powershell
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights

az provider show `
  --namespace Microsoft.App `
  --query registrationState `
  --output tsv

az provider show `
  --namespace Microsoft.OperationalInsights `
  --query registrationState `
  --output tsv
```

## 3. Resource Group

```powershell
az group create `
  --name "rg-practica-vehiculos" `
  --location "centralus"

az group show `
  --name "rg-practica-vehiculos" `
  --output table
```

## 4. Azure Container Registry

Creación, configuración y autenticación:

```powershell
az acr create `
  --resource-group "rg-practica-vehiculos" `
  --name "acrvehiculosame2026" `
  --sku Basic

az acr update `
  --name "acrvehiculosame2026" `
  --admin-enabled true

az acr show `
  --name "acrvehiculosame2026" `
  --query "{Servidor:loginServer,Estado:provisioningState}" `
  --output table

az acr login --name "acrvehiculosame2026"
```

Construcción y publicación inicial desde la raíz del repositorio:

```powershell
docker build -t "acrvehiculosame2026.azurecr.io/oauthjwt:latest" .\OAuthJWT\OAuthJWT
docker push "acrvehiculosame2026.azurecr.io/oauthjwt:latest"

docker build -t "acrvehiculosame2026.azurecr.io/categoria:latest" .\CategoriaApi\CategoriaApi
docker push "acrvehiculosame2026.azurecr.io/categoria:latest"

docker build -t "acrvehiculosame2026.azurecr.io/vehiculo:latest" .\VehiculoApi\VehiculoApi
docker push "acrvehiculosame2026.azurecr.io/vehiculo:latest"

docker build -t "acrvehiculosame2026.azurecr.io/apigateway:latest" .\ApiGateway\ApiGateway
docker push "acrvehiculosame2026.azurecr.io/apigateway:latest"

docker build `
  --build-arg "VITE_API_URL=https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io" `
  -t "acrvehiculosame2026.azurecr.io/frontend:latest" `
  .\Frontend
docker push "acrvehiculosame2026.azurecr.io/frontend:latest"
```

Imágenes versionadas utilizadas en las correcciones finales:

```powershell
docker build -t "acrvehiculosame2026.azurecr.io/categoria:roles-v1" .\CategoriaApi\CategoriaApi
docker push "acrvehiculosame2026.azurecr.io/categoria:roles-v1"

docker build -t "acrvehiculosame2026.azurecr.io/vehiculo:roles-v1" .\VehiculoApi\VehiculoApi
docker push "acrvehiculosame2026.azurecr.io/vehiculo:roles-v1"

docker build `
  --build-arg "VITE_API_URL=https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io" `
  -t "acrvehiculosame2026.azurecr.io/frontend:roles-v2" `
  .\Frontend
docker push "acrvehiculosame2026.azurecr.io/frontend:roles-v2"
```

Comprobación de repositorios y tags:

```powershell
az acr repository list --name "acrvehiculosame2026" --output table
az acr repository show-tags --name "acrvehiculosame2026" --repository oauthjwt --output table
az acr repository show-tags --name "acrvehiculosame2026" --repository categoria --output table
az acr repository show-tags --name "acrvehiculosame2026" --repository vehiculo --output table
az acr repository show-tags --name "acrvehiculosame2026" --repository apigateway --output table
az acr repository show-tags --name "acrvehiculosame2026" --repository frontend --output table
```

## 5. Azure SQL

El servidor `sql-vehiculos-ame2026-central` y la base gratuita `VehiculosDB` se crearon desde Azure Portal debido a las restricciones de disponibilidad encontradas. No se añade un comando de creación que no fue utilizado.

Comprobaciones de servidor, base y red:

```powershell
az sql server show `
  --resource-group "rg-practica-vehiculos" `
  --name "sql-vehiculos-ame2026-central" `
  --query "{Nombre:name,FQDN:fullyQualifiedDomainName,RedPublica:publicNetworkAccess,Estado:state}" `
  --output table

az sql db show `
  --resource-group "rg-practica-vehiculos" `
  --server "sql-vehiculos-ame2026-central" `
  --name "VehiculosDB" `
  --query "{Nombre:name,Estado:status,Oferta:currentServiceObjectiveName,MaxSize:maxSizeBytes}" `
  --output table

az sql server firewall-rule list `
  --resource-group "rg-practica-vehiculos" `
  --server "sql-vehiculos-ame2026-central" `
  --output table
```

Inicialización desde Windows. `sqlcmd` solicita la contraseña porque deliberadamente no se usa `-P`:

```powershell
sqlcmd `
  -S "tcp:sql-vehiculos-ame2026-central.database.windows.net,1433" `
  -d "VehiculosDB" `
  -U "<AZURE_SQL_USER>" `
  -N `
  -b `
  -i ".\init_databases.azure.sql"
```

La cadena utilizada como secreto de Container Apps tiene esta estructura:

```text
Server=tcp:sql-vehiculos-ame2026-central.database.windows.net,1433;Initial Catalog=VehiculosDB;User ID=<AZURE_SQL_USER>;Password=<AZURE_SQL_PASSWORD>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

## 6. Container Apps Environment

```powershell
az containerapp env create `
  --name "env-practica-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --location "centralus"

az containerapp env show `
  --name "env-practica-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "{Nombre:name,Ubicacion:location,Estado:properties.provisioningState}" `
  --output table
```

## 7. RabbitMQ

RabbitMQ se desplegó con la imagen oficial, una sola réplica e ingress TCP interno en el puerto `5672`:

```powershell
az containerapp create `
  --name "rabbitmq-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --environment "env-practica-vehiculos" `
  --image "rabbitmq:4-management" `
  --ingress internal `
  --transport tcp `
  --target-port 5672 `
  --exposed-port 5672 `
  --min-replicas 1 `
  --max-replicas 1 `
  --secrets "rabbitmq-password=<RABBITMQ_PASSWORD>" `
  --env-vars `
    "RABBITMQ_DEFAULT_USER=<RABBITMQ_USER>" `
    "RABBITMQ_DEFAULT_PASS=secretref:rabbitmq-password"
```

Comprobaciones realizadas desde Container Apps y mediante el flujo funcional:

```powershell
az containerapp show `
  --name "rabbitmq-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "{Estado:properties.runningStatus,Puerto:properties.configuration.ingress.targetPort,Transporte:properties.configuration.ingress.transport}" `
  --output table

az containerapp revision list `
  --name "rabbitmq-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "[].{Revision:name,Salud:properties.healthState,Estado:properties.runningState}" `
  --output table

az containerapp logs show `
  --name "rabbitmq-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --type console `
  --tail 100
```

No se agregan comandos `rabbitmqctl` o `rabbitmq-diagnostics` porque no quedó registro de que se ejecutaran manualmente durante el despliegue. La prueba real del broker está en la sección 14.

## 8. OAuthJWT

Creación con ingress interno y configuración final para los roles `Admin` y `User`:

```powershell
az containerapp create `
  --name "oauthjwt-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --environment "env-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/oauthjwt:latest" `
  --registry-server "acrvehiculosame2026.azurecr.io" `
  --registry-username "<ACR_USERNAME>" `
  --registry-password "<ACR_PASSWORD>" `
  --ingress internal `
  --target-port 8080 `
  --secrets `
    "jwt-key=<JWT_KEY>" `
    "admin-password=<AUTH_ADMIN_PASSWORD>" `
    "user-password=<AUTH_USER_PASSWORD>" `
  --env-vars `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "ASPNETCORE_URLS=http://+:8080" `
    "Jwt__Key=secretref:jwt-key" `
    "Jwt__Issuer=OAuthJWT" `
    "Jwt__Audience=PracticaVehiculosApis" `
    "Jwt__ExpireMinutes=60" `
    "Auth__AdminPassword=secretref:admin-password" `
    "Auth__UserPassword=secretref:user-password"
```

Actualización de secretos de autenticación sin escribir sus valores en archivos:

```powershell
az containerapp secret set `
  --name "oauthjwt-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --secrets `
    "jwt-key=<JWT_KEY>" `
    "admin-password=<AUTH_ADMIN_PASSWORD>" `
    "user-password=<AUTH_USER_PASSWORD>"

az containerapp update `
  --name "oauthjwt-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --set-env-vars `
    "Jwt__Key=secretref:jwt-key" `
    "Auth__AdminPassword=secretref:admin-password" `
    "Auth__UserPassword=secretref:user-password"
```

## 9. CategoriaApi

Despliegue inicial:

```powershell
az containerapp create `
  --name "categoria-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --environment "env-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/categoria:latest" `
  --registry-server "acrvehiculosame2026.azurecr.io" `
  --registry-username "<ACR_USERNAME>" `
  --registry-password "<ACR_PASSWORD>" `
  --ingress internal `
  --target-port 8080 `
  --secrets `
    "sql-connection=Server=tcp:sql-vehiculos-ame2026-central.database.windows.net,1433;Initial Catalog=VehiculosDB;User ID=<AZURE_SQL_USER>;Password=<AZURE_SQL_PASSWORD>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;" `
    "jwt-key=<JWT_KEY>" `
    "rabbitmq-password=<RABBITMQ_PASSWORD>" `
  --env-vars `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "ASPNETCORE_URLS=http://+:8080" `
    "ConnectionStrings__CategoriasConnection=secretref:sql-connection" `
    "Jwt__Key=secretref:jwt-key" `
    "Jwt__Issuer=OAuthJWT" `
    "Jwt__Audience=PracticaVehiculosApis" `
    "RabbitMQ__HostName=rabbitmq-vehiculos" `
    "RabbitMQ__Port=5672" `
    "RabbitMQ__UserName=<RABBITMQ_USER>" `
    "RabbitMQ__Password=secretref:rabbitmq-password" `
    "RabbitMQ__QueueName=categoria_creada"
```

Corrección final de autorización con tag versionado y revisión sana:

```powershell
az acr repository show-tags `
  --name "acrvehiculosame2026" `
  --repository categoria `
  --output table

az containerapp registry list `
  --name "categoria-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --output table

az containerapp update `
  --name "categoria-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/categoria:roles-v1" `
  --revision-suffix "roles2"

az containerapp show `
  --name "categoria-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "properties.{Imagen:template.containers[0].image,Ultima:latestRevisionName,Lista:latestReadyRevisionName,Estado:runningStatus}" `
  --output table

az containerapp revision list `
  --name "categoria-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "[].{Revision:name,Salud:properties.healthState,Estado:properties.runningState,Activa:properties.active}" `
  --output table
```

La revisión final comprobada es `categoria-vehiculos--roles2`, con `categoria:roles-v1` y estado sano/listo.

## 10. VehiculoApi

Despliegue inicial:

```powershell
az containerapp create `
  --name "vehiculo-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --environment "env-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/vehiculo:latest" `
  --registry-server "acrvehiculosame2026.azurecr.io" `
  --registry-username "<ACR_USERNAME>" `
  --registry-password "<ACR_PASSWORD>" `
  --ingress internal `
  --target-port 8080 `
  --min-replicas 1 `
  --secrets `
    "sql-connection=Server=tcp:sql-vehiculos-ame2026-central.database.windows.net,1433;Initial Catalog=VehiculosDB;User ID=<AZURE_SQL_USER>;Password=<AZURE_SQL_PASSWORD>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;" `
    "jwt-key=<JWT_KEY>" `
    "rabbitmq-password=<RABBITMQ_PASSWORD>" `
  --env-vars `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "ASPNETCORE_URLS=http://+:8080" `
    "ConnectionStrings__VehiculosConnection=secretref:sql-connection" `
    "Jwt__Key=secretref:jwt-key" `
    "Jwt__Issuer=OAuthJWT" `
    "Jwt__Audience=PracticaVehiculosApis" `
    "RabbitMQ__HostName=rabbitmq-vehiculos" `
    "RabbitMQ__Port=5672" `
    "RabbitMQ__UserName=<RABBITMQ_USER>" `
    "RabbitMQ__Password=secretref:rabbitmq-password" `
    "RabbitMQ__QueueName=categoria_creada"
```

Corrección final de autorización con tag versionado y revisión sana:

```powershell
az acr repository show-tags `
  --name "acrvehiculosame2026" `
  --repository vehiculo `
  --output table

az containerapp registry list `
  --name "vehiculo-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --output table

az containerapp update `
  --name "vehiculo-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/vehiculo:roles-v1" `
  --revision-suffix "roles2"

az containerapp show `
  --name "vehiculo-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "properties.{Imagen:template.containers[0].image,Ultima:latestRevisionName,Lista:latestReadyRevisionName,Estado:runningStatus}" `
  --output table

az containerapp revision list `
  --name "vehiculo-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "[].{Revision:name,Salud:properties.healthState,Estado:properties.runningState,Activa:properties.active}" `
  --output table
```

La revisión final comprobada es `vehiculo-vehiculos--roles2`, con `vehiculo:roles-v1` y estado sano/listo.

## 11. API Gateway

Despliegue y configuración de rutas internas:

```powershell
az containerapp create `
  --name "gateway-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --environment "env-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/apigateway:latest" `
  --registry-server "acrvehiculosame2026.azurecr.io" `
  --registry-username "<ACR_USERNAME>" `
  --registry-password "<ACR_PASSWORD>" `
  --ingress external `
  --target-port 8080 `
  --env-vars `
    "ASPNETCORE_ENVIRONMENT=Production" `
    "ASPNETCORE_URLS=http://+:8080" `
    "ReverseProxy__Clusters__oauthJwtCluster__Destinations__oauthJwtDestination__Address=http://oauthjwt-vehiculos/" `
    "ReverseProxy__Clusters__categoriasCluster__Destinations__categoriasDestination__Address=http://categoria-vehiculos/" `
    "ReverseProxy__Clusters__vehiculosCluster__Destinations__vehiculosDestination__Address=http://vehiculo-vehiculos/"
```

Configuración de CORS después de conocer el FQDN del frontend:

```powershell
az containerapp update `
  --name "gateway-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --set-env-vars `
    "Cors__AllowedOrigins__0=https://frontend-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io"

az containerapp show `
  --name "gateway-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "properties.configuration.ingress.fqdn" `
  --output tsv
```

URL pública final:

```text
https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io
```

## 12. Frontend

El build de Azure se generó con:

```text
VITE_API_URL=https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io
```

Despliegue inicial y actualización final:

```powershell
az containerapp create `
  --name "frontend-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --environment "env-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/frontend:latest" `
  --registry-server "acrvehiculosame2026.azurecr.io" `
  --registry-username "<ACR_USERNAME>" `
  --registry-password "<ACR_PASSWORD>" `
  --ingress external `
  --target-port 80

az containerapp update `
  --name "frontend-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --image "acrvehiculosame2026.azurecr.io/frontend:roles-v2"

az containerapp show `
  --name "frontend-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "properties.template.containers[0].image" `
  --output tsv
```

La comprobación final devuelve `acrvehiculosame2026.azurecr.io/frontend:roles-v2`. Los tags versionados se adoptaron para evitar ambigüedad y reutilización de caché con `:latest` durante las correcciones.

URL pública final:

```text
https://frontend-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io
```

## 13. Variables de entorno y secrets

Los valores sensibles se configuraron como secrets y se referencian con `secretref:`. Esta es la estructura final; los valores reales no se incluyen:

| Servicio | Variables no secretas | Secrets |
|---|---|---|
| OAuthJWT | `ASPNETCORE_ENVIRONMENT`, `ASPNETCORE_URLS`, `Jwt__Issuer`, `Jwt__Audience`, `Jwt__ExpireMinutes` | `Jwt__Key`, `Auth__AdminPassword`, `Auth__UserPassword` |
| CategoriaApi | `ASPNETCORE_ENVIRONMENT`, `ASPNETCORE_URLS`, `Jwt__Issuer`, `Jwt__Audience`, `RabbitMQ__HostName`, `RabbitMQ__Port`, `RabbitMQ__UserName`, `RabbitMQ__QueueName` | `ConnectionStrings__CategoriasConnection`, `Jwt__Key`, `RabbitMQ__Password` |
| VehiculoApi | `ASPNETCORE_ENVIRONMENT`, `ASPNETCORE_URLS`, `Jwt__Issuer`, `Jwt__Audience`, `RabbitMQ__HostName`, `RabbitMQ__Port`, `RabbitMQ__UserName`, `RabbitMQ__QueueName` | `ConnectionStrings__VehiculosConnection`, `Jwt__Key`, `RabbitMQ__Password` |
| ApiGateway | `ASPNETCORE_ENVIRONMENT`, `ASPNETCORE_URLS`, destinos YARP y `Cors__AllowedOrigins__0` | Ninguno de aplicación |
| RabbitMQ | `RABBITMQ_DEFAULT_USER` | `RABBITMQ_DEFAULT_PASS` |
| Frontend | `VITE_API_URL` se integra durante el build | Ninguno |

Placeholders utilizados:

```text
<AZURE_SUBSCRIPTION_ID>
<AZURE_SQL_USER>
<AZURE_SQL_PASSWORD>
<JWT_KEY>
<AUTH_ADMIN_PASSWORD>
<AUTH_USER_PASSWORD>
<RABBITMQ_USER>
<RABBITMQ_PASSWORD>
<ACR_USERNAME>
<ACR_PASSWORD>
```

Comprobación de nombres, sin mostrar valores:

```powershell
az containerapp secret list `
  --name "oauthjwt-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "[].name" `
  --output table

az containerapp show `
  --name "categoria-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "properties.template.containers[0].env[].name" `
  --output table
```

## 14. Pruebas

Variables de prueba:

```powershell
$gateway = "https://gateway-vehiculos.greencoast-c47f23f3.centralus.azurecontainerapps.io"
```

Login Admin y User:

```powershell
$adminBody = @{
  username = "admin"
  password = "<AUTH_ADMIN_PASSWORD>"
} | ConvertTo-Json

$adminLogin = Invoke-RestMethod `
  -Uri "$gateway/api/Auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $adminBody

$userBody = @{
  username = "user"
  password = "<AUTH_USER_PASSWORD>"
} | ConvertTo-Json

$userLogin = Invoke-RestMethod `
  -Uri "$gateway/api/Auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body $userBody

$adminHeaders = @{ Authorization = "Bearer $($adminLogin.token)" }
$userHeaders = @{ Authorization = "Bearer $($userLogin.token)" }
```

Sin token `401`, lectura User `200` y escritura User `403`:

```powershell
(Invoke-WebRequest `
  -Uri "$gateway/api/Categorias" `
  -SkipHttpErrorCheck).StatusCode

(Invoke-WebRequest `
  -Uri "$gateway/api/Categorias" `
  -Headers $userHeaders `
  -SkipHttpErrorCheck).StatusCode

$userWriteBody = @{
  nombre = "Debe ser rechazado"
  descripcion = "Prueba de autorización User"
} | ConvertTo-Json

(Invoke-WebRequest `
  -Uri "$gateway/api/Categorias" `
  -Method Post `
  -Headers $userHeaders `
  -ContentType "application/json" `
  -Body $userWriteBody `
  -SkipHttpErrorCheck).StatusCode
```

Lecturas Admin y prueba RabbitMQ con creación autorizada:

```powershell
Invoke-RestMethod -Uri "$gateway/api/Categorias" -Headers $adminHeaders
Invoke-RestMethod -Uri "$gateway/api/Vehiculos" -Headers $adminHeaders

$categoriaBody = @{
  nombre = "Prueba RabbitMQ"
  descripcion = "Categoría creada para comprobar productor y consumidor"
} | ConvertTo-Json

$categoriaCreada = Invoke-RestMethod `
  -Uri "$gateway/api/Categorias" `
  -Method Post `
  -Headers $adminHeaders `
  -ContentType "application/json" `
  -Body $categoriaBody

Start-Sleep -Seconds 2
Invoke-RestMethod `
  -Uri "$gateway/api/Vehiculos/categoria/$($categoriaCreada.idCategoria)" `
  -Headers $adminHeaders
```

La última consulta confirmó que `categoria_creada` fue publicada por CategoriaApi, consumida por VehiculoApi y produjo el vehículo `Sin asignar`.

Comprobación directa de Azure SQL, solicitando la contraseña de forma interactiva:

```powershell
sqlcmd `
  -S "tcp:sql-vehiculos-ame2026-central.database.windows.net,1433" `
  -d "VehiculosDB" `
  -U "<AZURE_SQL_USER>" `
  -N `
  -Q "SELECT COUNT(*) AS Categorias FROM dbo.Categorias; SELECT COUNT(*) AS Vehiculos FROM dbo.Vehiculos;"
```

Estado, revisiones y logs:

```powershell
az containerapp list `
  --resource-group "rg-practica-vehiculos" `
  --query "[].{Nombre:name,Estado:properties.runningStatus,URL:properties.configuration.ingress.fqdn}" `
  --output table

az containerapp show `
  --name "categoria-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "properties.{Estado:runningStatus,Ultima:latestRevisionName,Lista:latestReadyRevisionName}" `
  --output table

az containerapp revision list `
  --name "vehiculo-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --query "[].{Revision:name,Salud:properties.healthState,Estado:properties.runningState}" `
  --output table

az containerapp logs show `
  --name "vehiculo-vehiculos" `
  --resource-group "rg-practica-vehiculos" `
  --type console `
  --tail 100
```

Resultados comprobados:

- Login Admin y User: `200 OK`.
- Sin token: `401 Unauthorized`.
- GET Admin y User: `200 OK`.
- POST User: `403 Forbidden`.
- Escritura Admin: autorizada.
- Azure SQL: lecturas y escrituras correctas.
- RabbitMQ: publicación `categoria_creada`, consumo y vehículo `Sin asignar`.
- Revisión CategoriaApi: `categoria-vehiculos--roles2` sana y lista.
- Revisión VehiculoApi: `vehiculo-vehiculos--roles2` sana y lista.
- Frontend y Gateway: accesibles mediante las URLs públicas.

## 15. Resolución de incidencias

- **Regiones Azure SQL no disponibles:** la disponibilidad de la oferta gratuita obligó a elegir una región admitida; el servidor definitivo quedó en `centralus`.
- **Timeout inicial de Azure SQL:** se revisaron el estado del servidor, el acceso de red/firewall y la conectividad antes de repetir `sqlcmd` contra `VehiculosDB`.
- **`ImagePullBackOff`:** CategoriaApi y VehiculoApi apuntaban a tags versionados todavía inexistentes. Se confirmó con `az acr repository show-tags` y `az containerapp registry list`, se publicaron `categoria:roles-v1` y `vehiculo:roles-v1`, y se actualizaron las aplicaciones.
- **Revisiones `Unhealthy` / `LatestReady`:** `az containerapp show`, `az containerapp revision list` y `az containerapp logs show` permitieron distinguir la revisión fallida de la lista. Las revisiones finales `categoria-vehiculos--roles2` y `vehiculo-vehiculos--roles2` quedaron sanas.
- **Uso de `:latest`:** en las correcciones se usaron tags versionados para hacer inequívoca la imagen desplegada. El frontend final usa `frontend:roles-v2`.

## 16. Eliminación

**NO ejecutar antes del 13/09/2026 ni antes de que finalice la revisión.** Cuando ya no sea necesario conservar la práctica, eliminar todo el Resource Group con:

```powershell
az group delete `
  --name rg-practica-vehiculos `
  --yes `
  --no-wait
```
