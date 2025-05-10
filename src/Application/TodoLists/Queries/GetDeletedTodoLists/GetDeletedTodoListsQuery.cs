using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Todo_App.Application.Common.Interfaces;
using Todo_App.Application.TodoLists.Queries.GetTodos; 


namespace Todo_App.Application.TodoLists.Queries.GetDeletedTodoLists
{
    public class GetDeletedTodoListsQuery : IRequest<DeletedTodoListsVm>
    {
    }

    public class GetDeletedTodoListsQueryHandler : IRequestHandler<GetDeletedTodoListsQuery, DeletedTodoListsVm>
    {
        private readonly IApplicationDbContext _context;
        private readonly IMapper _mapper;

        public GetDeletedTodoListsQueryHandler(IApplicationDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        public async Task<DeletedTodoListsVm> Handle(GetDeletedTodoListsQuery request, CancellationToken cancellationToken)
        {
            var lists = await _context.TodoLists
                .Where(l => l.IsDeleted)
                .Include(l => l.Items.Where(i => !i.IsDeleted))
                .ProjectTo<TodoListDto>(_mapper.ConfigurationProvider)
                .ToListAsync(cancellationToken);

            return new DeletedTodoListsVm
            {
                Lists = lists
            };
        }
    }
}
