using Microsoft.EntityFrameworkCore;
using VehiculoApi.Data;
using VehiculoApi.Services;

namespace VehiculoApi
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.
            builder.Services.AddControllers();
            builder.Services.AddHostedService<RabbitMQConsumer>();
            builder.Services.AddDbContext<VehiculosDBContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("VehiculosConnection")));

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseHttpsRedirection();

            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }
    }
}
