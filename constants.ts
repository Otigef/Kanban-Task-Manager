import { BoardData, ColumnId, TaskCategory, TaskPriority, ReminderOption } from './types';

export const TASK_CATEGORIES: {
  id: TaskCategory;
  label: string;
}[] = [
  { id: 'bug', label: 'Bug' },
  { id: 'feature', label: 'Feature' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'chore', label: 'Chore' },
];

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  bug: 'text-red-500 dark:text-red-400',
  feature: 'text-indigo-500 dark:text-indigo-400',
  meeting: 'text-purple-500 dark:text-purple-400',
  chore: 'text-gray-500 dark:text-gray-400',
};

export const TASK_PRIORITIES: {
  id: TaskPriority;
  label: string;
}[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

export const REMINDER_OPTIONS: { id: ReminderOption; label: string }[] = [
    { id: 'none', label: 'No Reminder' },
    { id: 'on-due-date', label: 'On Due Date' },
    { id: '1-day-before', label: '1 Day Before' },
    { id: '2-days-before', label: '2 Days Before' },
    { id: '1-week-before', label: '1 Week Before' },
];

export const INITIAL_BOARD_DATA: BoardData = {
  tasks: {
    'task-1': { id: 'task-1', title: 'Design the UI Mockups', description: 'Create detailed mockups in Figma for all screens.', dueDate: '2024-08-15', category: 'feature', priority: 'high', creationDate: '2024-07-20T10:00:00Z', tags: ['design', 'figma', 'ui'], comments: [
      { id: 'comment-1', text: 'We should use the new branding guidelines.', createdAt: '2024-07-21T14:00:00Z' },
      { id: 'comment-2', text: 'Approved by the design lead.', createdAt: '2024-07-22T09:30:00Z' }
    ], reminder: '1-day-before', subtasks: [
        { id: 'sub-1', text: 'Create wireframes for main screens', completed: true, dueDate: '2024-08-01' },
        { id: 'sub-2', text: 'Design component library', completed: true, dueDate: '2024-08-05' },
        { id: 'sub-3', text: 'Develop final mockups', completed: false, dueDate: '2024-08-10' },
        { id: 'sub-4', text: 'Create interactive prototype', completed: false },
    ], attachments: [], history: [] },
    'task-2': { id: 'task-2', title: 'Set up React Project', description: 'Initialize a new React project with TypeScript and Tailwind CSS.', dueDate: '2024-08-10', category: 'chore', priority: 'medium', creationDate: '2024-07-21T11:30:00Z', tags: ['setup', 'dev-ops'], history: [] },
    'task-3': { id: 'task-3', title: 'Develop Task Card Component', description: 'Build the reusable TaskCard component.', category: 'feature', priority: 'medium', creationDate: '2024-07-22T14:00:00Z', tags: ['react', 'component'], history: [] },
    'task-4': { id: 'task-4', title: 'Implement Drag and Drop', description: 'Use @dnd-kit to enable task reordering.', dueDate: '2024-07-30', category: 'feature', priority: 'high', creationDate: '2024-07-23T16:45:00Z', tags: ['core-feature', 'dnd'], history: [] },
    'task-5': { id: 'task-5', title: 'Test on Mobile Devices', description: 'Ensure the layout is responsive and usable on small screens.', category: 'bug', priority: 'low', creationDate: '2024-07-24T09:20:00Z', tags: ['testing', 'responsive'], history: [] },
  },
  columns: {
    [ColumnId.ToDo]: {
      id: ColumnId.ToDo,
      title: 'To Do',
      taskIds: ['task-1', 'task-2'],
    },
    [ColumnId.InProgress]: {
      id: ColumnId.InProgress,
      title: 'In Progress',
      taskIds: ['task-3'],
    },
    [ColumnId.Done]: {
      id: ColumnId.Done,
      title: 'Done',
      taskIds: ['task-4', 'task-5'],
    },
  },
  columnOrder: [ColumnId.ToDo, ColumnId.InProgress, ColumnId.Done],
};