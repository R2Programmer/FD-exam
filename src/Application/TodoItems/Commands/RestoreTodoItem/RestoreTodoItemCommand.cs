using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Todo_App.Application.Common.Exceptions;
using Todo_App.Application.Common.Interfaces;
using Todo_App.Domain.Entities;

namespace Todo_App.Application.TodoItems.Commands.RestoreTodoItem
{
    public class RestoreTodoItemCommand : IRequest
    {
        public int Id { get; set; }

        public RestoreTodoItemCommand(int id)
        {
            Id = id;
        }

        public RestoreTodoItemCommand() { }
    }

    public class RestoreTodoItemCommandHandler : IRequestHandler<RestoreTodoItemCommand>
    {
        private readonly IApplicationDbContext _context;

        public RestoreTodoItemCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(RestoreTodoItemCommand request, CancellationToken cancellationToken)
        {
            var entity = await _context.TodoItems.FindAsync(new object[] { request.Id }, cancellationToken);

            if (entity == null)
            {
                throw new NotFoundException("TodoItem", request.Id);
            }

            // Reset IsDeleted flag and DeletedAt field
            entity.IsDeleted = false;
            entity.DeletedAt = null;

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
