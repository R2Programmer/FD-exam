using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using System.IO;
using Todo_App.Infrastructure.Identity;
using Todo_App.Infrastructure.Persistence.Interceptors;
using Duende.IdentityServer.EntityFramework.Options;

namespace Todo_App.Infrastructure.Persistence;

public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        // Configure DbContextOptions with the provided connection string
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseSqlServer("Server=localhost\\SQLEXPRESS;Database=Todo_AppDb;Trusted_Connection=True;");

        // Return a new instance of ApplicationDbContext
        return new ApplicationDbContext(
            optionsBuilder.Options,
            Options.Create(new OperationalStoreOptions()),
            null, // Pass null for IMediator at design time
            null  // Pass null for AuditableEntitySaveChangesInterceptor at design time
        );
    }
}
