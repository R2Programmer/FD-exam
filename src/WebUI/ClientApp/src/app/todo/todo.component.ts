import { Component,  TemplateRef,  OnInit } from "@angular/core"
import  { FormBuilder } from "@angular/forms"
import  { BsModalService, BsModalRef } from "ngx-bootstrap/modal"
import {
   TodoListsClient,
   TodoItemsClient,
   TodoListDto,
   TodoItemDto,
    PriorityLevelDto,
   CreateTodoListCommand,
   UpdateTodoListCommand,
   CreateTodoItemCommand,
  UpdateTodoItemDetailCommand,
   UpdateTodoItemCommand,
} from "../web-api-client"

@Component({
  selector: "app-todo-component",
  templateUrl: "./todo.component.html",
  styleUrls: ["./todo.component.scss"],
})
export class TodoComponent implements OnInit {
  debug = false
  deleting = false
  deleteCountDown = 0
  deleteCountDownInterval: any
  lists: TodoListDto[]
  priorityLevels: PriorityLevelDto[]
  selectedList: TodoListDto
  selectedItem: TodoItemDto
  newListEditor: any = {}
  listOptionsEditor: any = {}
  newListModalRef: BsModalRef
  listOptionsModalRef: BsModalRef
  deleteListModalRef: BsModalRef
  softDeleteListModalRef: BsModalRef
  itemDetailsModalRef: BsModalRef
  permanentDeleteListModalRef: BsModalRef
  permanentDeleteItemModalRef: BsModalRef
  itemDetailsFormGroup = this.fb.group({
    id: [null],
    listId: [null],
    priority: [""],
    note: [""],
  })

  // Items to delete permanently
  listToDelete: TodoListDto = null
  itemToDelete: TodoItemDto = null

  // Tag related properties
  tagInput = ""
  allTags: string[] = []
  selectedTags: string[] = []
  searchQuery = ""
  filteredItems: TodoItemDto[] = []
  mostUsedTags: string[] = []

  // Soft delete related properties
  showDeletedItems = false
  showDeletedLists = false
  deletedLists: TodoListDto[] = []
  deletedItems: TodoItemDto[] = []
  restoreListModalRef: BsModalRef
  restoreItemModalRef: BsModalRef

  constructor(
    private listsClient: TodoListsClient,
    private itemsClient: TodoItemsClient,
    private modalService: BsModalService,
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.loadLists()
  }

  loadLists(): void {
    this.listsClient.get().subscribe(
      (result) => {
        console.log("Loaded lists:", result)
        // Filter out soft-deleted lists
        this.lists = result.lists.filter((list) => list.isDeleted !== true)

        // Initialize tags for each item if they don't exist
        this.lists.forEach((list) => {
          // Filter out soft-deleted items
          list.items = list.items.filter((item) => item.isDeleted !== true)

          list.items.forEach((item) => {
            if (!item.tags) {
              item.tags = []
            }
          })
        })

        this.priorityLevels = result.priorityLevels
        if (this.lists.length) {
          this.selectedList = this.lists[0]
          this.updateFilteredItems()
          this.updateAllTags()
          this.updateMostUsedTags()
        }
      },
      (error) => console.error(error),
    )
  }

  // Load deleted lists
  loadDeletedLists(): void {
    this.listsClient.getDeleted().subscribe(
      (result) => {
        this.deletedLists = result.lists
      },
      (error) => console.error(error),
    )
  }

  // Load deleted items
  loadDeletedItems(): void {
    this.itemsClient.getDeleted().subscribe(
      (result) => {
        this.deletedItems = result.items
      },
      (error) => console.error(error),
    )
  }

  // Toggle showing deleted lists
  toggleDeletedLists(): void {
    this.showDeletedLists = !this.showDeletedLists
    if (this.showDeletedLists) {
      this.loadDeletedLists()
    }
  }

  // Toggle showing deleted items
  toggleDeletedItems(): void {
    this.showDeletedItems = !this.showDeletedItems
    if (this.showDeletedItems) {
      this.loadDeletedItems()
    }
  }

  // Restore a list
  restoreList(list: TodoListDto): void {
    this.listsClient.restore(list.id).subscribe(
      () => {
        // Remove from deleted lists
        this.deletedLists = this.deletedLists.filter((l) => l.id !== list.id)

        // Add to active lists
        list.isDeleted = false
        this.lists.push(list)

        // If no list is selected, select this one
        if (!this.selectedList) {
          this.selectedList = list
          this.updateFilteredItems()
        }

        this.updateAllTags()
        this.updateMostUsedTags()
      },
      (error) => console.error(error),
    )
  }

  // Restore an item
  restoreItem(item: TodoItemDto): void {
    this.itemsClient.restore(item.id).subscribe(
      () => {
        // Remove from deleted items
        this.deletedItems = this.deletedItems.filter((i) => i.id !== item.id)

        // Add to its list
        const listIndex = this.lists.findIndex((l) => l.id === item.listId)
        if (listIndex !== -1) {
          item.isDeleted = false
          this.lists[listIndex].items.push(item)

          // If this is the selected list, update filtered items
          if (this.selectedList && this.selectedList.id === item.listId) {
            this.updateFilteredItems()
          }

          this.updateAllTags()
          this.updateMostUsedTags()
        }
      },
      (error) => console.error(error),
    )
  }

  // Lists
  remainingItems(list: TodoListDto): number {
    return list.items.filter((t) => !t.done && !t.isDeleted).length
  }

  showNewListModal(template: TemplateRef<any>): void {
    this.newListModalRef = this.modalService.show(template)
    setTimeout(() => document.getElementById("title").focus(), 250)
  }

  newListCancelled(): void {
    this.newListModalRef.hide()
    this.newListEditor = {}
  }

  addList(): void {
    const list = {
      id: 0,
      title: this.newListEditor.title,
      items: [],
      isDeleted: false,
    } as TodoListDto

    this.listsClient.create(list as CreateTodoListCommand).subscribe(
      (result) => {
        list.id = result
        this.lists.push(list)
        this.selectedList = list
        this.newListModalRef.hide()
        this.newListEditor = {}
        this.updateFilteredItems()
      },
      (error) => {
        const errors = JSON.parse(error.response)

        if (errors && errors.Title) {
          this.newListEditor.error = errors.Title[0]
        }

        setTimeout(() => document.getElementById("title").focus(), 250)
      },
    )
  }

  showListOptionsModal(template: TemplateRef<any>) {
    this.listOptionsEditor = {
      id: this.selectedList.id,
      title: this.selectedList.title,
    }

    this.listOptionsModalRef = this.modalService.show(template)
  }

  updateListOptions() {
    const list = this.listOptionsEditor as UpdateTodoListCommand
    this.listsClient.update(this.selectedList.id, list).subscribe(
      () => {
        this.selectedList.title = this.listOptionsEditor.title
        this.listOptionsModalRef.hide()
        this.listOptionsEditor = {}
      },
      (error) => console.error(error),
    )
  }

  // Soft Delete List
  confirmSoftDeleteList(template: TemplateRef<any>) {
    this.listOptionsModalRef.hide()
    this.softDeleteListModalRef = this.modalService.show(template)
  }

  softDeleteListConfirmed(): void {
    // Use soft delete
    this.listsClient.softDelete(this.selectedList.id).subscribe(
      () => {
        console.log(`List ${this.selectedList.id} soft deleted successfully`)
        this.softDeleteListModalRef.hide()

        // Mark as deleted
        this.selectedList.isDeleted = true

        // Remove from active lists
        this.lists = this.lists.filter((list) => list.id !== this.selectedList.id)

        // Select another list if available
        this.selectedList = this.lists.length ? this.lists[0] : null

        this.updateAllTags()
        this.updateMostUsedTags()
        this.updateFilteredItems()

        // Refresh deleted lists if they're being shown
        if (this.showDeletedLists) {
          this.loadDeletedLists()
        }
      },
      (error) => {
        console.error("Error soft deleting list:", error)
        alert("Failed to soft delete the list. Please try again.")
      },
    )
  }

  // Hard Delete List
  confirmDeleteList(template: TemplateRef<any>) {
    this.listOptionsModalRef.hide()
    this.deleteListModalRef = this.modalService.show(template)
  }

  hardDeleteListConfirmed(): void {
    // Use hard delete
    this.listsClient.delete(this.selectedList.id).subscribe(
      () => {
        this.deleteListModalRef.hide()

        // Remove from active lists
        this.lists = this.lists.filter((t) => t.id !== this.selectedList.id)

        // Select another list if available
        this.selectedList = this.lists.length ? this.lists[0] : null

        this.updateAllTags()
        this.updateMostUsedTags()
        this.updateFilteredItems()
      },
      (error) => console.error(error),
    )
  }

  // Permanent delete for already soft-deleted list
  confirmPermanentDeleteList(template: TemplateRef<any>, list: TodoListDto): void {
    this.listToDelete = list
    this.permanentDeleteListModalRef = this.modalService.show(template)
  }

  permanentDeleteListConfirmed(): void {
    if (!this.listToDelete) return

    // Use hard delete
    this.listsClient.delete(this.listToDelete.id).subscribe(
      () => {
        this.permanentDeleteListModalRef.hide()

        // Remove from deleted lists
        this.deletedLists = this.deletedLists.filter((t) => t.id !== this.listToDelete.id)
        this.listToDelete = null
      },
      (error) => console.error(error),
    )
  }

  // Permanent delete for already soft-deleted item
  confirmPermanentDeleteItem(template: TemplateRef<any>, item: TodoItemDto): void {
    this.itemToDelete = item
    this.permanentDeleteItemModalRef = this.modalService.show(template)
  }

  permanentDeleteItemConfirmed(): void {
    if (!this.itemToDelete) return

    // Use hard delete
    this.itemsClient.delete(this.itemToDelete.id).subscribe(
      () => {
        this.permanentDeleteItemModalRef.hide()

        // Remove from deleted items
        this.deletedItems = this.deletedItems.filter((t) => t.id !== this.itemToDelete.id)
        this.itemToDelete = null
      },
      (error) => console.error(error),
    )
  }

  // Items
  showItemDetailsModal(template: TemplateRef<any>, item: TodoItemDto): void {
    this.selectedItem = item
    this.itemDetailsFormGroup.patchValue(this.selectedItem)

    this.itemDetailsModalRef = this.modalService.show(template)
    this.itemDetailsModalRef.onHidden.subscribe(() => {
      this.stopDeleteCountDown()
    })
  }

  updateItemDetails(): void {
    const item = new UpdateTodoItemDetailCommand(this.itemDetailsFormGroup.value)
    this.itemsClient.updateItemDetails(this.selectedItem.id, item).subscribe(
      () => {
        if (this.selectedItem.listId !== item.listId) {
          this.selectedList.items = this.selectedList.items.filter((i) => i.id !== this.selectedItem.id)
          const listIndex = this.lists.findIndex((l) => l.id === item.listId)
          this.selectedItem.listId = item.listId
          this.lists[listIndex].items.push(this.selectedItem)
        }

        this.selectedItem.priority = item.priority
        this.selectedItem.note = item.note
        this.itemDetailsModalRef.hide()
        this.itemDetailsFormGroup.reset()
        this.updateFilteredItems()
      },
      (error) => console.error(error),
    )
  }

  addItem() {
    const item = {
      id: 0,
      listId: this.selectedList.id,
      priority: this.priorityLevels[0].value,
      title: "",
      done: false,
      tags: [],
      isDeleted: false,
    } as TodoItemDto

    this.selectedList.items.push(item)
    this.updateFilteredItems()
    const index = this.selectedList.items.length - 1
    this.editItem(item, "itemTitle" + index)
  }

  editItem(item: TodoItemDto, inputId: string): void {
    this.selectedItem = item
    setTimeout(() => document.getElementById(inputId).focus(), 100)
  }

  updateItem(item: TodoItemDto, pressedEnter = false): void {
    const isNewItem = item.id === 0

    if (!item.title.trim()) {
      this.softDeleteItem(item)
      return
    }

    if (isNewItem) {
      this.itemsClient
        .create({
            ...item,
            listId: this.selectedList.id,
            isDeleted: false,
        } as unknown as CreateTodoItemCommand)
        .subscribe(
          (result) => {
            item.id = result
            this.updateAllTags()
            this.updateMostUsedTags()
            this.updateFilteredItems()
          },
          (error) => console.error(error),
        )
    } else {
      this.itemsClient.update(item.id, item as UpdateTodoItemCommand).subscribe(
        () => {
          console.log("Update succeeded.")
          this.updateAllTags()
          this.updateMostUsedTags()
          this.updateFilteredItems()
        },
        (error) => console.error(error),
      )
    }

    this.selectedItem = null

    if (isNewItem && pressedEnter) {
      setTimeout(() => this.addItem(), 250)
    }
  }

  // Soft delete item
  softDeleteItem(item: TodoItemDto, countDown?: boolean) {
    if (countDown) {
      if (this.deleting) {
        this.stopDeleteCountDown()
        return
      }
      this.deleteCountDown = 3
      this.deleting = true
      this.deleteCountDownInterval = setInterval(() => {
        if (this.deleting && --this.deleteCountDown <= 0) {
          this.softDeleteItem(item, false)
        }
      }, 1000)
      return
    }
    this.deleting = false
    if (this.itemDetailsModalRef) {
      this.itemDetailsModalRef.hide()
    }

    if (item.id === 0) {
      // For new items that haven't been saved yet
      const itemIndex = this.selectedList.items.indexOf(item)
      if (itemIndex !== -1) {
        this.selectedList.items.splice(itemIndex, 1)
      }
      this.updateFilteredItems()
    } else {
      // Use update method to set isDeleted flag
      const updateCommand: UpdateTodoItemCommand = {
          id: item.id,
          title: item.title,
        done: item.done,
        backgroundColor: item.backgroundColor,
          init: function(_data?: any): void {
              throw new Error("Function not implemented.")
          },
          toJSON: function(data?: any) {
              throw new Error("Function not implemented.")
          }
      }

      this.itemsClient.update(item.id, updateCommand).subscribe(
        () => {
          console.log(`Item ${item.id} soft deleted successfully`)

          // Mark as deleted
          item.isDeleted = true

          // Remove from active items in the selected list
          if (this.selectedList) {
            this.selectedList.items = this.selectedList.items.filter((i) => i.id !== item.id)
          }

          // Update all lists to ensure the item is removed everywhere
          this.lists.forEach((list) => {
            list.items = list.items.filter((i) => !(i.id === item.id))
          })

          this.updateAllTags()
          this.updateMostUsedTags()
          this.updateFilteredItems()

          // Refresh deleted items if they're being shown
          if (this.showDeletedItems) {
            this.loadDeletedItems()
          }
        },
        (error) => {
          console.error("Error soft deleting item:", error)
          alert("Failed to soft delete the item. Please try again.")
        },
      )
    }
  }

  // Hard delete item
  hardDeleteItem(item: TodoItemDto, countDown?: boolean) {
    if (countDown) {
      if (this.deleting) {
        this.stopDeleteCountDown()
        return
      }
      this.deleteCountDown = 3
      this.deleting = true
      this.deleteCountDownInterval = setInterval(() => {
        if (this.deleting && --this.deleteCountDown <= 0) {
          this.hardDeleteItem(item, false)
        }
      }, 1000)
      return
    }
    this.deleting = false
    if (this.itemDetailsModalRef) {
      this.itemDetailsModalRef.hide()
    }

    if (item.id === 0) {
      const itemIndex = this.selectedList.items.indexOf(this.selectedItem)
      this.selectedList.items.splice(itemIndex, 1)
      this.updateFilteredItems()
    } else {
      // Use hard delete
      this.itemsClient.delete(item.id).subscribe(
        () => {
          // Remove from active items
          this.selectedList.items = this.selectedList.items.filter((t) => t.id !== item.id)

          this.updateAllTags()
          this.updateMostUsedTags()
          this.updateFilteredItems()
        },
        (error) => console.error(error),
      )
    }
  }

  stopDeleteCountDown() {
    clearInterval(this.deleteCountDownInterval)
    this.deleteCountDown = 0
    this.deleting = false
  }

  // Tag related methods
  addTag(item: TodoItemDto, tag: string): void {
    if (!tag || !tag.trim() || !item) return

    // Initialize tags array if it doesn't exist
    if (!item.tags) {
      item.tags = []
    }

    // Don't add duplicate tags
    if (item.tags.includes(tag.trim())) {
      this.tagInput = ""
      return
    }

    item.tags.push(tag.trim())
    this.tagInput = ""

    // Update the item
    this.updateItem(item)

    // Update tag collections
    this.updateAllTags()
    this.updateMostUsedTags()
  }

  removeTag(item: TodoItemDto, tag: string): void {
    if (!item || !item.tags) return

    item.tags = item.tags.filter((t) => t !== tag)

    // Update the item
    this.updateItem(item)

    // Update tag collections
    this.updateAllTags()
    this.updateMostUsedTags()

    // Remove from selected tags if it was selected
    if (this.selectedTags.includes(tag)) {
      this.selectedTags = this.selectedTags.filter((t) => t !== tag)
      this.updateFilteredItems()
    }
  }

  updateAllTags(): void {
    const tagSet = new Set<string>()

    this.lists.forEach((list) => {
      // Only consider non-deleted items
      list.items
        .filter((item) => !item.isDeleted)
        .forEach((item) => {
          if (item.tags) {
            item.tags.forEach((tag) => tagSet.add(tag))
          }
        })
    })

    this.allTags = Array.from(tagSet)
  }

  updateMostUsedTags(count = 5): void {
    const tagCounts: { [key: string]: number } = {}

    this.lists.forEach((list) => {
      // Only consider non-deleted items
      list.items
        .filter((item) => !item.isDeleted)
        .forEach((item) => {
          if (item.tags) {
            item.tags.forEach((tag) => {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1
            })
          }
        })
    })

    this.mostUsedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map((entry) => entry[0])
  }

  toggleTagFilter(tag: string): void {
    if (this.selectedTags.includes(tag)) {
      this.selectedTags = this.selectedTags.filter((t) => t !== tag)
    } else {
      this.selectedTags.push(tag)
    }

    this.updateFilteredItems()
  }

  clearTagFilters(): void {
    this.selectedTags = []
    this.updateFilteredItems()
  }

  filterItems(): void {
    this.updateFilteredItems()
  }

  updateFilteredItems(): void {
    if (!this.selectedList) {
      this.filteredItems = []
      return
    }

    this.filteredItems = this.selectedList.items.filter((item) => {
      // Skip deleted items - make this check explicit
      if (item.isDeleted === true) {
        return false
      }

      // Filter by tags if any are selected
      const matchesTags =
        this.selectedTags.length === 0 || (item.tags && this.selectedTags.every((tag) => item.tags.includes(tag)))

      // Filter by search query if one exists
      const matchesSearch =
        !this.searchQuery ||
        !this.searchQuery.trim() ||
        item.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (item.note && item.note.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
        (item.tags && item.tags.some((tag) => tag.toLowerCase().includes(this.searchQuery.toLowerCase())))

      return matchesTags && matchesSearch
    })
  }
}
