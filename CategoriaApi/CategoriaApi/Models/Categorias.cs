using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CategoriaApi.Models
{
    [Table("Categorias")]
    public class Categorias
    {
        [Key]
        [Column("IdCategoria")]
        public int IdCategoria { get; set; }

        [Required]
        [StringLength(100)]
        [Column("Nombre")]
        public string Nombre { get; set; } = string.Empty;

        [StringLength(250)]
        [Column("Descripcion")]
        public string Descripcion { get; set; } = string.Empty;
    }
}
