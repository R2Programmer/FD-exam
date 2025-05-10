using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Todo_App.Application.Common.Exceptions;
using Todo_App.Application.Common.Interfaces;
using Todo_App.Domain.Entities;

namespace Todo_App.Application.TodoLists.Commands.SoftDeleteTodoList
{
    public class SoftDeleteTodoListCommand : IRequest
    {
        public int Id { get; set; }

        public SoftDeleteTodoListCommand(int id)
        {
            Id = id;
        }
    }

    public class SoftDeleteTodoListCommandHandler : IRequestHandler<SoftDeleteTodoListCommand>
    {
        private readonly IApplicationDbContext _context;

        public SoftDeleteTodoListCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(SoftDeleteTodoListCommand request, CancellationToken cancellationToken)
        {
            var entity = await _context.TodoLists
                .FindAsync(new object[] { request.Id }, cancellationToken);

            if (entity == null)
            {
                throw new NotFoundException("TodoList", request.Id);
            }

            // Set IsDeleted flag instead of removing
            entity.IsDeleted = true;
            entity.DeletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
