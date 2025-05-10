using System.Collections.Generic;
using Todo_App.Application.TodoLists.Queries.GetTodos;

namespace Todo_App.Application.TodoLists.Queries.GetDeletedTodoLists
{
    public class DeletedTodoListsVm
    {
        public IList<TodoListDto> Lists { get; set; } = new List<TodoListDto>();
    }
}

