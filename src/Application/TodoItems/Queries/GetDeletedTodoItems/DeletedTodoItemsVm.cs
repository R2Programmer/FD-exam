using System.Collections.Generic;
using Todo_App.Application.TodoLists.Queries.GetTodos;

namespace Todo_App.Application.TodoItems.Queries.GetDeletedTodoItems
{
    public class DeletedTodoItemsVm
    {
        public IList<TodoItemDto> Items { get; set; } = new List<TodoItemDto>();
    }
}
