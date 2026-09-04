-- =============================================================
-- SCRIPT DE CREACIÓN DE BASES DE DATOS, TABLAS Y USUARIO SQL
-- Requiere variables SQLCMD: AppLogin y AppPassword.
-- =============================================================

-- 1. CREACIÓN DEL LOGIN SQL
IF NOT EXISTS (SELECT name FROM sys.sql_logins WHERE name = N'$(AppLogin)')
BEGIN
    CREATE LOGIN [$(AppLogin)] WITH PASSWORD = N'$(AppPassword)', DEFAULT_DATABASE = [master], CHECK_EXPIRATION = OFF, CHECK_POLICY = ON;
END
ELSE
BEGIN
    ALTER LOGIN [$(AppLogin)] WITH PASSWORD = N'$(AppPassword)', CHECK_EXPIRATION = OFF, CHECK_POLICY = ON;
    ALTER LOGIN [$(AppLogin)] ENABLE;
END
GO

-- 2. BASE DE DATOS PARA CATEGORIAS (CategoriaDB)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'CategoriaDB')
BEGIN
    CREATE DATABASE CategoriaDB;
END
GO

USE CategoriaDB;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Categorias]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Categorias] (
        [IdCategoria] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Nombre] NVARCHAR(100) NOT NULL,
        [Descripcion] NVARCHAR(250) NULL
    );
END
GO

-- Permisos de usuario en CategoriaDB
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = N'$(AppLogin)')
BEGIN
    CREATE USER [$(AppLogin)] FOR LOGIN [$(AppLogin)];
END
IF IS_ROLEMEMBER(N'db_owner', N'$(AppLogin)') <> 1
BEGIN
    ALTER ROLE [db_owner] ADD MEMBER [$(AppLogin)];
END
GO

-- Datos iniciales de prueba para Categorias
IF NOT EXISTS (SELECT 1 FROM [dbo].[Categorias])
BEGIN
    INSERT INTO [dbo].[Categorias] ([Nombre], [Descripcion])
    VALUES 
        ('SUV', 'Vehículos utilitarios deportivos espaciosos y versátiles'),
        ('Sedan', 'Vehículos tipo sedán compactos y elegantes'),
        ('Camioneta', 'Vehículos de carga ligera y trabajo pesado');
END
GO


-- 3. BASE DE DATOS PARA VEHICULOS (VehiculoDB)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'VehiculoDB')
BEGIN
    CREATE DATABASE VehiculoDB;
END
GO

USE VehiculoDB;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Vehiculos]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Vehiculos] (
        [IdVehiculo] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [IdCategoria] INT NOT NULL,
        [Marca] NVARCHAR(100) NOT NULL,
        [Modelo] NVARCHAR(100) NOT NULL,
        [Precio] DECIMAL(10,2) NOT NULL,
        [Stock] INT NOT NULL,
        [Estado] BIT NOT NULL
    );
END
GO

-- Permisos de usuario en VehiculoDB
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = N'$(AppLogin)')
BEGIN
    CREATE USER [$(AppLogin)] FOR LOGIN [$(AppLogin)];
END
IF IS_ROLEMEMBER(N'db_owner', N'$(AppLogin)') <> 1
BEGIN
    ALTER ROLE [db_owner] ADD MEMBER [$(AppLogin)];
END
GO

-- Datos iniciales de prueba para Vehiculos
IF NOT EXISTS (SELECT 1 FROM [dbo].[Vehiculos])
BEGIN
    INSERT INTO [dbo].[Vehiculos] ([IdCategoria], [Marca], [Modelo], [Precio], [Stock], [Estado])
    VALUES 
        (1, 'Toyota', 'RAV4', 32000.00, 10, 1),
        (2, 'Hyundai', 'Elantra', 21500.00, 5, 1),
        (3, 'Ford', 'F-150', 48000.00, 3, 1);
END
GO
