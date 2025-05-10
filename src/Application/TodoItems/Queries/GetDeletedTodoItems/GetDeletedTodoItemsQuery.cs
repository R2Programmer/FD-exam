using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Todo_App.Application.Common.Interfaces;
using Todo_App.Application.TodoLists.Queries.GetTodos; 


namespace Todo_App.Application.TodoItems.Queries.GetDeletedTodoItems
{
    public class GetDeletedTodoItemsQuery : IRequest<DeletedTodoItemsVm>
    {
    }

    public class GetDeletedTodoItemsQueryHandler : IRequestHandler<GetDeletedTodoItemsQuery, DeletedTodoItemsVm>
    {
        private readonly IApplicationDbContext _context;
        private readonly IMapper _mapper;

        public GetDeletedTodoItemsQueryHandler(IApplicationDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<DeletedTodoItemsVm> Handle(GetDeletedTodoItemsQuery request, CancellationToken cancellationToken)
        {
            var items = await _context.TodoItems
                .Where(i => i.IsDeleted)
                .ProjectTo<TodoItemDto>(_mapper.ConfigurationProvider)
                .ToListAsync(cancellationToken);

            return new DeletedTodoItemsVm
            {
                Items = items
            };
        }
    }
}
