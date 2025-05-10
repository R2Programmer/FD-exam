import { Component, TemplateRef, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import {
  TodoListsClient, TodoItemsClient,
  TodoListDto, TodoItemDto, PriorityLevelDto,
  CreateTodoListCommand, UpdateTodoListCommand,
  CreateTodoItemCommand, UpdateTodoItemDetailCommand
} from '../web-api-client';

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
  itemDetailsModalRef: BsModalRef
  itemDetailsFormGroup = this.fb.group({
    id: [null],
    listId: [null],
    priority: [""],
    note: [""],
  })

  // Tag related properties
  tagInput = ""
  allTags: string[] = []
  selectedTags: string[] = []
  searchQuery = ""
  filteredItems: TodoItemDto[] = []
  mostUsedTags: string[] = []

  constructor(
    private listsClient: TodoListsClient,
    private itemsClient: TodoItemsClient,
    private modalService: BsModalService,
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.listsClient.get().subscribe(
      (result) => {
        this.lists = result.lists

        // Initialize tags for each item if they don't exist
        this.lists.forEach((list) => {
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

  // Lists
  remainingItems(list: TodoListDto): number {
    return list.items.filter((t) => !t.done).length
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
        ; (this.selectedList.title = this.listOptionsEditor.title), this.listOptionsModalRef.hide()
        this.listOptionsEditor = {}
      },
      (error) => console.error(error),
    )
  }

  confirmDeleteList(template: TemplateRef<any>) {
    this.listOptionsModalRef.hide()
    this.deleteListModalRef = this.modalService.show(template)
  }

  deleteListConfirmed(): void {
    this.listsClient.delete(this.selectedList.id).subscribe(
      () => {
        this.deleteListModalRef.hide()
        this.lists = this.lists.filter((t) => t.id !== this.selectedList.id)
        this.selectedList = this.lists.length ? this.lists[0] : null
        this.updateAllTags()
        this.updateMostUsedTags()
        this.updateFilteredItems()
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
      this.deleteItem(item)
      return
    }

    if (isNewItem) {
      this.itemsClient
        .create({
          ...item,
          listId: this.selectedList.id,
        } as CreateTodoItemCommand)
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
      this.itemsClient.update(item.id, item).subscribe(
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

  deleteItem(item: TodoItemDto, countDown?: boolean) {
    if (countDown) {
      if (this.deleting) {
        this.stopDeleteCountDown()
        return
      }
      this.deleteCountDown = 3
      this.deleting = true
      this.deleteCountDownInterval = setInterval(() => {
        if (this.deleting && --this.deleteCountDown <= 0) {
          this.deleteItem(item, false)
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
      this.itemsClient.delete(item.id).subscribe(
        () => {
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
      list.items.forEach((item) => {
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
      list.items.forEach((item) => {
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
