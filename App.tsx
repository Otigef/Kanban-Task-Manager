import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
} from '@dnd-kit/sortable';

import { INITIAL_BOARD_DATA, TASK_CATEGORIES, TASK_PRIORITIES } from './constants';
import { BoardData, ColumnId, Task, SortType, TaskCategory, TaskPriority, TaskHistory } from './types';
import { Column } from './components/Column';
import { TaskModal } from './components/TaskModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { PlusIcon, SearchIcon, TrashIcon, SunIcon, MoonIcon } from './components/icons';
import { TaskCard } from './components/TaskCard';
import { NotificationCenter } from './components/NotificationCenter';

const LOCAL_STORAGE_KEY = 'kanbanBoardData';

interface Notification {
  id: string;
  title: string;
  message: string;
}

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [boardData, setBoardData] = useState<BoardData>(() => {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      return savedData ? JSON.parse(savedData) : INITIAL_BOARD_DATA;
    } catch {
      return INITIAL_BOARD_DATA;
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [sortOrders, setSortOrders] = useState<Record<ColumnId, SortType>>({
    [ColumnId.ToDo]: 'default',
    [ColumnId.InProgress]: 'default',
    [ColumnId.Done]: 'default',
  });
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(boardData));
  }, [boardData]);
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkReminders = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        setNotifications(prevNotifications => {
            const newNotifications: Notification[] = [];
            const existingNotificationIds = new Set(prevNotifications.map(n => n.id));

            Object.values(boardData.tasks).forEach(task => {
                if (!task.dueDate || !task.reminder || task.reminder === 'none') {
                    return;
                }

                const dueDate = new Date(task.dueDate + 'T00:00:00');
                if (isNaN(dueDate.getTime())) return;

                let reminderDate = new Date(dueDate);
                let message = '';

                switch (task.reminder) {
                    case 'on-due-date':
                        message = `Task "${task.title}" is due today.`;
                        break;
                    case '1-day-before':
                        reminderDate.setDate(dueDate.getDate() - 1);
                        message = `Task "${task.title}" is due tomorrow.`;
                        break;
                    case '2-days-before':
                        reminderDate.setDate(dueDate.getDate() - 2);
                        message = `Task "${task.title}" is due in 2 days.`;
                        break;
                    case '1-week-before':
                        reminderDate.setDate(dueDate.getDate() - 7);
                        message = `Task "${task.title}" is due in one week.`;
                        break;
                    default:
                        return;
                }

                const notificationId = `reminder-${task.id}-${task.reminder}-${task.dueDate}`;

                // Trigger if reminder date is today or in the past, but the due date is not in the past
                if (reminderDate <= today && dueDate >= today && !existingNotificationIds.has(notificationId)) {
                    newNotifications.push({
                        id: notificationId,
                        title: 'Upcoming Task Reminder',
                        message: message,
                    });
                }
            });

            return newNotifications.length > 0 ? [...prevNotifications, ...newNotifications] : prevNotifications;
        });
    };

    const intervalId = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Also check on component mount

    return () => clearInterval(intervalId);
  }, [boardData.tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );
  
  const handleAddTaskClick = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };
  
  const handleDeleteTask = (taskObject: Task) => {
    setTaskToDelete(taskObject);
    setIsBulkDelete(false);
    setIsConfirmModalOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedTaskIds.size === 0) return;
    setIsBulkDelete(true);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (isBulkDelete) {
      setBoardData(prev => {
        const newTasks = { ...prev.tasks };
        const newColumns = { ...prev.columns };
        
        selectedTaskIds.forEach(idToDelete => {
            delete newTasks[idToDelete];
        });

        for (const columnId in newColumns) {
            newColumns[columnId as ColumnId].taskIds = newColumns[columnId as ColumnId].taskIds.filter(id => !selectedTaskIds.has(id));
        }
        
        return { ...prev, tasks: newTasks, columns: newColumns };
      });
      setSelectedTaskIds(new Set());
    } 
    else if (taskToDelete) {
      const idToDelete = taskToDelete.id;
      setBoardData(prev => {
        const newTasks = { ...prev.tasks };
        delete newTasks[idToDelete];

        const newColumns = { ...prev.columns };
        for (const columnId in newColumns) {
          newColumns[columnId as ColumnId].taskIds = newColumns[columnId as ColumnId].taskIds.filter(id => id !== idToDelete);
        }
        
        return { ...prev, tasks: newTasks, columns: newColumns };
      });
    }
    
    setIsConfirmModalOpen(false);
    setTaskToDelete(null);
    setIsBulkDelete(false);
  };

  const handleCancelDelete = () => {
    setIsConfirmModalOpen(false);
    setTaskToDelete(null);
    setIsBulkDelete(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'creationDate'>, id?: string) => {
    setBoardData(prev => {
      const newTasks = { ...prev.tasks };
      let taskId = id;
      const timestamp = new Date().toISOString();

      if (id) { // Editing existing task
        const oldTask = prev.tasks[id];
        const newHistory: TaskHistory[] = [];

        // Helper to add history entry
        const addHistory = (field: string, oldValue: any, newValue: any) => {
            const oldStr = oldValue || '';
            const newStr = newValue || '';
            if (oldStr !== newStr) {
                newHistory.push({
                    id: `hist-${Date.now()}-${field.toLowerCase()}`,
                    timestamp,
                    action: 'updated',
                    field,
                    oldValue: String(oldStr),
                    newValue: String(newStr),
                });
            }
        };

        addHistory('Title', oldTask.title, taskData.title);
        if((oldTask.description || '') !== (taskData.description || '')){
             newHistory.push({
                id: `hist-${Date.now()}-description`,
                timestamp,
                action: 'updated',
                field: 'Description',
                details: 'Description was updated.'
             });
        }
        addHistory('Due Date', oldTask.dueDate, taskData.dueDate);
        addHistory('Priority', oldTask.priority, taskData.priority);
        addHistory('Category', oldTask.category, taskData.category);
        
        const oldSubtasks = oldTask.subtasks || [];
        const newSubtasks = taskData.subtasks || [];
        newSubtasks.forEach(newSub => {
            const oldSub = oldSubtasks.find(s => s.id === newSub.id);
            if (oldSub && oldSub.completed !== newSub.completed) {
                newHistory.push({
                    id: `hist-${Date.now()}-${newSub.id}`,
                    timestamp,
                    action: 'subtask_toggled',
                    details: `Subtask "${newSub.text.substring(0, 30)}${newSub.text.length > 30 ? '...' : ''}" was marked as ${newSub.completed ? 'complete' : 'incomplete'}.`
                });
            }
        });

        const currentHistory = oldTask.history || [];
        newTasks[id] = { ...oldTask, ...taskData, history: [...currentHistory, ...newHistory] };

      } else { // Creating new task
        taskId = `task-${Date.now()}`;
        newTasks[taskId] = { 
          id: taskId, 
          ...taskData,
          creationDate: new Date().toISOString(),
          history: [{
              id: `hist-${Date.now()}-created`,
              timestamp,
              action: 'created',
              details: 'Task was created.'
          }]
        };
      }

      const newColumns = { ...prev.columns };
      if (!id) { 
          const todoColumn = newColumns[ColumnId.ToDo];
          newColumns[ColumnId.ToDo] = { ...todoColumn, taskIds: [taskId!, ...todoColumn.taskIds] };
      }

      return { ...prev, tasks: newTasks, columns: newColumns };
    });

    handleCloseModal();
  };
  
    const handleBulkUpdate = (updates: Partial<Pick<Task, 'priority' | 'category' | 'dueDate'>>) => {
        if (selectedTaskIds.size === 0) return;
        setBoardData(prev => {
            const newTasks = { ...prev.tasks };
            selectedTaskIds.forEach(taskId => {
                if (newTasks[taskId]) {
                    newTasks[taskId] = { ...newTasks[taskId], ...updates };
                }
            });
            return { ...prev, tasks: newTasks };
        });
    };

  const findColumn = (taskId: string) => {
    return boardData.columnOrder.find(columnId => boardData.columns[columnId].taskIds.includes(taskId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setSelectedTaskIds(new Set());
    setActiveTask(boardData.tasks[active.id as string] || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();
    
    const activeColumnId = findColumn(activeId);
    let overColumnId = findColumn(overId);
    
    if(!overColumnId) {
        overColumnId = overId as ColumnId;
    }

    if (!activeColumnId || !overColumnId) {
      return;
    }

    setBoardData(prev => {
      const newColumnsData = JSON.parse(JSON.stringify(prev.columns));
      const newTasksData = JSON.parse(JSON.stringify(prev.tasks));
      
      if (activeColumnId === overColumnId) {
        const column = newColumnsData[activeColumnId];
        const oldIndex = column.taskIds.indexOf(activeId);
        const newIndex = column.taskIds.indexOf(overId);
        
        column.taskIds = arrayMove(column.taskIds, oldIndex, newIndex);

      } else {
        const activeColumn = newColumnsData[activeColumnId];
        const overColumn = newColumnsData[overColumnId];

        const oldTaskIndex = activeColumn.taskIds.indexOf(activeId);
        activeColumn.taskIds.splice(oldTaskIndex, 1);
        
        const overTaskIndex = overColumn.taskIds.indexOf(overId);

        if (overTaskIndex >= 0) {
           overColumn.taskIds.splice(overTaskIndex, 0, activeId);
        } else {
           overColumn.taskIds.push(activeId);
        }
        
        const movedTask = newTasksData[activeId];
        if (movedTask) {
            const currentHistory = movedTask.history || [];
            const newHistoryEntry: TaskHistory = {
                id: `hist-${Date.now()}-move`,
                timestamp: new Date().toISOString(),
                action: 'moved',
                details: `Moved from '${prev.columns[activeColumnId].title}' to '${prev.columns[overColumnId].title}'.`
            };
            movedTask.history = [...currentHistory, newHistoryEntry];
        }
      }
      return { ...prev, columns: newColumnsData, tasks: newTasksData };
    });
  };

  const handleToggleSort = (columnId: ColumnId) => {
    setSortOrders(prev => {
      const currentSort = prev[columnId];
      const sortCycle: SortType[] = ['default', 'dueDateAsc', 'dueDateDesc', 'creationDateAsc', 'creationDateDesc'];
      const currentIndex = sortCycle.indexOf(currentSort);
      const nextIndex = (currentIndex + 1) % sortCycle.length;
      const nextSort = sortCycle[nextIndex];
      return { ...prev, [columnId]: nextSort };
    });
  };

  const getSortedTasks = (tasks: Task[], sortOrder: SortType): Task[] => {
    if (sortOrder === 'default') {
      return tasks;
    }

    return [...tasks].sort((a, b) => {
      if (sortOrder.startsWith('dueDate')) {
        const aHasDate = !!a.dueDate;
        const bHasDate = !!b.dueDate;

        if (aHasDate && !bHasDate) return -1;
        if (!aHasDate && bHasDate) return 1;
        if (!aHasDate && !bHasDate) return 0;
        
        const dateA = new Date(a.dueDate!).getTime();
        const dateB = new Date(b.dueDate!).getTime();

        return sortOrder === 'dueDateAsc' ? dateA - dateB : dateB - dateA;
      }
      
      if (sortOrder.startsWith('creationDate')) {
        const dateA = new Date(a.creationDate).getTime();
        const dateB = new Date(b.creationDate).getTime();
        
        return sortOrder === 'creationDateAsc' ? dateA - dateB : dateB - dateA;
      }

      return 0;
    });
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
  };
  
  const handleToggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const filteredTaskIds = useMemo(() => {
    if (!searchQuery) {
      return new Set(Object.keys(boardData.tasks));
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return new Set(
      Object.values(boardData.tasks)
        .filter(task => {
          const titleMatch = task.title.toLowerCase().includes(lowercasedQuery);
          const descriptionMatch = task.description.toLowerCase().includes(lowercasedQuery);
          const idMatch = task.id.toLowerCase().includes(lowercasedQuery);
          const categoryMatch = task.category ? task.category.toLowerCase().includes(lowercasedQuery) : false;
          const dueDateMatch = task.dueDate ? task.dueDate.includes(searchQuery) : false;
          const tagsMatch = task.tags?.some(tag => tag.toLowerCase().includes(lowercasedQuery));

          return titleMatch || descriptionMatch || idMatch || categoryMatch || dueDateMatch || tagsMatch;
        })
        .map(task => task.id)
    );
  }, [searchQuery, boardData.tasks]);

  const handleToggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(taskId)) {
            newSelection.delete(taskId);
        } else {
            newSelection.add(taskId);
        }
        return newSelection;
    });
  };

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const confirmationMessage = isBulkDelete 
    ? `Are you sure you want to delete these ${selectedTaskIds.size} tasks? This action cannot be undone.`
    : (taskToDelete ? `Are you sure you want to delete the task "${taskToDelete.title}"? This action cannot be undone.` : "");
    
  const commonSelectClasses = "px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";

  return (
    <div className="flex flex-col h-screen text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <header className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center flex-shrink-0 gap-4 sticky top-0 z-20">
        <h1 className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">Kanban Board</h1>
        <div className="flex-grow flex justify-center items-center gap-4">
            <div className="relative max-w-xl w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon className="w-5 h-5 text-gray-400" />
                </span>
                <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all"
                />
            </div>
             {selectedTaskIds.size > 0 && (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900/50 p-2 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">{selectedTaskIds.size} selected</span>
                    <select
                        onChange={(e) => handleBulkUpdate({ priority: e.target.value as TaskPriority })}
                        defaultValue=""
                        className={commonSelectClasses}
                        aria-label="Change priority for selected tasks"
                    >
                        <option value="" disabled>Priority...</option>
                        {TASK_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                     <select
                        onChange={(e) => handleBulkUpdate({ category: e.target.value as TaskCategory })}
                        defaultValue=""
                        className={commonSelectClasses}
                        aria-label="Change category for selected tasks"
                    >
                        <option value="" disabled>Category...</option>
                        {TASK_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <input
                        type="date"
                        onChange={(e) => handleBulkUpdate({ dueDate: e.target.value })}
                        className={`${commonSelectClasses} h-[34px]`}
                        aria-label="Set due date for selected tasks"
                    />
                    <button
                        onClick={handleBulkDeleteClick}
                        className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ring-offset-gray-100 dark:ring-offset-gray-900/50 transition-all"
                        aria-label={`Delete ${selectedTaskIds.size} selected tasks`}
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
            <button
            onClick={handleAddTaskClick}
            className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ring-offset-gray-50 dark:ring-offset-gray-900 transition-all"
            >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Add Task</span>
            </button>
            <button
                onClick={handleToggleTheme}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ring-offset-gray-50 dark:ring-offset-gray-900 transition-all"
                aria-label="Toggle theme"
            >
                {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
            </button>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-6 lg:p-8 overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex space-x-6 h-full">
            {boardData.columnOrder.map((columnId) => {
              const column = boardData.columns[columnId];
              const tasks = column.taskIds
                .filter(taskId => filteredTaskIds.has(taskId))
                .map((taskId) => boardData.tasks[taskId])
                .filter(Boolean);
              const sortedTasks = getSortedTasks(tasks, sortOrders[columnId]);

              return (
                <Column
                  key={column.id}
                  column={column}
                  tasks={sortedTasks}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onSort={handleToggleSort}
                  sortOrder={sortOrders[columnId]}
                  onTagClick={handleTagClick}
                  searchQuery={searchQuery}
                  selectedTaskIds={selectedTaskIds}
                  onToggleTaskSelection={handleToggleTaskSelection}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} onEdit={()=>{}} onDelete={()=>{}} onTagClick={() => {}} isSelected={false} onToggleSelection={() => {}} /> : null}
          </DragOverlay>
        </DndContext>
      </main>

      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveTask}
        taskToEdit={editingTask}
      />

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={confirmationMessage}
      />
      
      <NotificationCenter 
        notifications={notifications} 
        onDismiss={handleDismissNotification} 
      />
    </div>
  );
};

export default App;