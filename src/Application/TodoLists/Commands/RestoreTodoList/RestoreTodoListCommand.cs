using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Todo_App.Application.Common.Exceptions;
using Todo_App.Application.Common.Interfaces;
using Todo_App.Domain.Entities;


namespace Todo_App.Application.TodoLists.Commands.RestoreTodoList
{
    public class RestoreTodoListCommand : IRequest
    {
        public int Id { get; set; }

        public RestoreTodoListCommand(int id)
        {
            Id = id;
        }
    }

    public class RestoreTodoListCommandHandler : IRequestHandler<RestoreTodoListCommand>
    {
        private readonly IApplicationDbContext _context;

        public RestoreTodoListCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Unit> Handle(RestoreTodoListCommand request, CancellationToken cancellationToken)
        {
            var entity = await _context.TodoLists
                .FindAsync(new object[] { request.Id }, cancellationToken);

            if (entity == null)
            {
                throw new NotFoundException("TodoList", request.Id);
            }

            // Reset IsDeleted flag
            entity.IsDeleted = false;
            entity.DeletedAt = null;

            await _context.SaveChangesAsync(cancellationToken);

            return Unit.Value;
        }
    }
}
