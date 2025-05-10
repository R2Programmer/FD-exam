using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Todo_App.Application.Common.Exceptions;
using Todo_App.Application.Common.Interfaces;
using Todo_App.Domain.Entities;

namespace Todo_App.Application.TodoItems.Commands.SoftDeleteTodoItem
{
    public class SoftDeleteTodoItemCommand : IRequest
    {
        public int Id { get; set; }

        public SoftDeleteTodoItemCommand(int id)
        {
            Id = id;
        }   
    }

    public class SoftDeleteTodoItemCommandHandler : IRequestHandler<SoftDeleteTodoItemCommand>
    {
        private readonly IApplicationDbContext _context;

        public SoftDeleteTodoItemCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(SoftDeleteTodoItemCommand request, CancellationToken cancellationToken)
        {
            var entity = await _context.TodoItems.FindAsync(new object[] { request.Id }, cancellationToken);

            if (entity == null)
            {
                throw new NotFoundException("TodoItem", request.Id);
            }

            // Set IsDeleted flag instead of removing
            entity.IsDeleted = true;
            entity.DeletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
