export interface Comment {
  id: string;
  text: string;
  createdAt: string;
}

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  content: string; // base64 encoded, compressed content
  isCompressed: boolean;
}

export type HistoryAction = 'created' | 'updated' | 'moved' | 'subtask_toggled';

export interface TaskHistory {
  id: string;
  timestamp: string;
  action: HistoryAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
}

export type TaskCategory = 'bug' | 'feature' | 'meeting' | 'chore';
export type TaskPriority = 'low' | 'medium' | 'high';
export type SortType = 'default' | 'dueDateAsc' | 'dueDateDesc' | 'creationDateAsc' | 'creationDateDesc';
export type ReminderOption = 'none' | 'on-due-date' | '1-day-before' | '2-days-before' | '1-week-before';


export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  category?: TaskCategory;
  priority?: TaskPriority;
  creationDate: string;
  tags?: string[];
  comments?: Comment[];
  reminder?: ReminderOption;
  subtasks?: Subtask[];
  attachments?: Attachment[];
  history?: TaskHistory[];
}

export enum ColumnId {
  ToDo = 'todo',
  InProgress = 'inProgress',
  Done = 'done',
}

export interface Column {
  id: ColumnId;
  title: string;
  taskIds: string[];
}

export interface BoardData {
  tasks: Record<string, Task>;
  columns: Record<ColumnId, Column>;
  columnOrder: ColumnId[];
}