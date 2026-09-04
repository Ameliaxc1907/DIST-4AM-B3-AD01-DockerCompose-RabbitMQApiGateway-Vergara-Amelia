namespace OAuthJWT
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            ValidateConfiguration(builder.Configuration);

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.MapControllers();
            app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

            app.Run();
        }

        private static void ValidateConfiguration(IConfiguration configuration)
        {
            var jwtKey = configuration["Jwt:Key"];
            var jwtIssuer = configuration["Jwt:Issuer"];
            var jwtAudience = configuration["Jwt:Audience"];
            var adminPassword = configuration["Auth:AdminPassword"];
            var userPassword = configuration["Auth:UserPassword"];

            if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32 ||
                string.IsNullOrWhiteSpace(jwtIssuer) || string.IsNullOrWhiteSpace(jwtAudience))
            {
                throw new InvalidOperationException("La configuración Jwt:Key (mínimo 32 caracteres), Jwt:Issuer y Jwt:Audience es obligatoria.");
            }

            if (string.IsNullOrWhiteSpace(adminPassword) || string.IsNullOrWhiteSpace(userPassword))
            {
                throw new InvalidOperationException("Auth:AdminPassword y Auth:UserPassword deben configurarse mediante variables de entorno.");
            }
        }
    }
}
