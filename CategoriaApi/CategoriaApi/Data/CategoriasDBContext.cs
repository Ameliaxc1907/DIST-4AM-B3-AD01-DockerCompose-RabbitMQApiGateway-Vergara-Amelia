using CategoriaApi.Models;
using Microsoft.EntityFrameworkCore;

namespace CategoriaApi.Data
{
    public class CategoriasDBContext : DbContext
    {
        public CategoriasDBContext(DbContextOptions<CategoriasDBContext> options) : base(options)
        {
        }

        public DbSet<Categorias> Categorias { get; set; }
    }
}
