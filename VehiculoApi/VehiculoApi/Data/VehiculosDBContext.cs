using Microsoft.EntityFrameworkCore;
using VehiculoApi.Models;

namespace VehiculoApi.Data
{
    public class VehiculosDBContext : DbContext
    {
        public VehiculosDBContext(DbContextOptions<VehiculosDBContext> options) : base(options)
        {
        }

        public DbSet<Vehiculos> Vehiculos { get; set; }
    }
}
