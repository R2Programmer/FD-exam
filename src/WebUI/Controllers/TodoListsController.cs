using Microsoft.AspNetCore.Mvc;
using Todo_App.Application.TodoLists.Commands.CreateTodoList;
using Todo_App.Application.TodoLists.Commands.DeleteTodoList;
using Todo_App.Application.TodoLists.Commands.SoftDeleteTodoList;
using Todo_App.Application.TodoLists.Commands.RestoreTodoList;
using Todo_App.Application.TodoLists.Commands.UpdateTodoList;
using Todo_App.Application.TodoLists.Queries.ExportTodos;
using Todo_App.Application.TodoLists.Queries.GetTodos;
using Todo_App.Application.TodoLists.Queries.GetDeletedTodoLists;

namespace Todo_App.WebUI.Controllers;

public class TodoListsController : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<TodosVm>> Get()
    {
        return await Mediator.Send(new GetTodosQuery());
    }

    [HttpGet("deleted")]
    public async Task<ActionResult<DeletedTodoListsVm>> GetDeleted()
    {
        return await Mediator.Send(new GetDeletedTodoListsQuery());
    }

    [HttpGet("{id}")]
    public async Task<FileResult> Get(int id)
    {
        var vm = await Mediator.Send(new ExportTodosQuery { ListId = id });

        return File(vm.Content, vm.ContentType, vm.FileName);
    }

    [HttpPost]
    public async Task<ActionResult<int>> Create(CreateTodoListCommand command)
    {
        return await Mediator.Send(command);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(int id, UpdateTodoListCommand command)
    {
        if (id != command.Id)
        {
            return BadRequest();
        }

        await Mediator.Send(command);

        return NoContent();
    }

    [HttpPut("{id}/softdelete")]
    public async Task<ActionResult> SoftDelete(int id)
    {
        await Mediator.Send(new SoftDeleteTodoListCommand(id));

        return NoContent();
    }

    [HttpPut("{id}/restore")]
    public async Task<ActionResult> Restore(int id)
    {
        await Mediator.Send(new RestoreTodoListCommand(id));

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        await Mediator.Send(new DeleteTodoListCommand(id));

        return NoContent();
    }
}