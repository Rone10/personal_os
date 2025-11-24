'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { Plus, GripVertical, CheckCircle2, Circle, Clock, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo } from 'react';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent, 
  useDroppable, 
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface KanbanBoardProps {
  projectId: Id<"projects">;
}

type TaskStatus = "todo" | "in_progress" | "done";
const COLUMN_IDS: TaskStatus[] = ["todo", "in_progress", "done"];

interface LinkedTodoMeta {
  taskId: Id<"tasks">;
  todoId: Id<"todos">;
  todoTitle: string;
  todoStatus: TaskStatus;
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

function TaskCard({ task, onAdvance, isOverlay, linkedTodo }: { task: Doc<"tasks">; onAdvance?: (task: Doc<"tasks">) => void; isOverlay?: boolean; linkedTodo?: LinkedTodoMeta }) {
  return (
    <div 
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md",
        isOverlay ? "cursor-grabbing shadow-xl rotate-2 scale-105 ring-2 ring-primary/20" : "cursor-grab active:cursor-grabbing",
        task.status === 'done' ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900" : 
        task.status === 'in_progress' ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900" :
        "bg-card text-card-foreground"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0 hover:text-primary",
              task.status === 'done' ? "text-emerald-600 dark:text-emerald-400" : 
              task.status === 'in_progress' ? "text-blue-600 dark:text-blue-400" : 
              "text-muted-foreground"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onAdvance?.(task);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {task.status === 'done' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : task.status === 'in_progress' ? (
              <Clock className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </Button>
          <span className={cn(
            "text-sm font-medium leading-tight",
            task.status === 'done' && "text-muted-foreground"
          )}>
            {task.title}
          </span>
        </div>
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="h-4 w-4 text-muted-foreground/50" />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {task.priority === 3 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase">High</Badge>
          )}
          {task.priority === 2 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] uppercase bg-orange-100 text-orange-700 hover:bg-orange-100/80 dark:bg-orange-900/30 dark:text-orange-400">Medium</Badge>
          )}
        </div>
        {task.dueDate && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {linkedTodo && (
        <LinkedTodoBadge meta={linkedTodo} taskId={task._id} />
      )}
    </div>
  );
}

function SortableTask({ task, onAdvance, linkedTodo }: { task: Doc<"tasks">; onAdvance: (task: Doc<"tasks">) => void; linkedTodo?: LinkedTodoMeta }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id, data: { task } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  
  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-0">
        <TaskCard task={task} onAdvance={onAdvance} linkedTodo={linkedTodo} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} onAdvance={onAdvance} linkedTodo={linkedTodo} />
    </div>
  );
}

function DroppableColumn({ id, title, count, children, className, headerColor }: { 
  id: string, 
  title: string, 
  count: number, 
  children: React.ReactNode, 
  className?: string,
  headerColor?: string
}) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div ref={setNodeRef} className={cn("flex h-full flex-col rounded-xl bg-muted/50 p-4", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", headerColor || "bg-slate-400")} />
          <h3 className="font-semibold text-sm text-foreground/80">{title}</h3>
        </div>
        <Badge variant="secondary" className="bg-background text-muted-foreground hover:bg-background">
          {count}
        </Badge>
      </div>
      
      <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pr-2 -mr-2">
        {children}
      </div>
    </div>
  );
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const tasksQuery = useQuery(api.tasks.getByProject, { projectId });
  const createTask = useMutation(api.tasks.create);
  const moveTask = useMutation(api.tasks.move);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeId, setActiveId] = useState<Id<"tasks"> | null>(null);
  const [localTasks, setLocalTasks] = useState<Doc<"tasks">[]>([]);
  const prevTasksQuery = React.useRef(tasksQuery);

  const handleAdvance = (task: Doc<"tasks">) => {
    const nextStatus: "todo" | "in_progress" | "done" = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
    
    // Calculate new order (append to end of destination column)
    const columnTasks = localTasks.filter(t => t.status === nextStatus);
    const maxOrder = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.order || 0)) : 0;
    const newOrder = maxOrder + 1000;

    // Optimistic update
    const updatedTasks = localTasks.map(t => 
      t._id === task._id ? { ...t, status: nextStatus, order: newOrder } : t
    );
    setLocalTasks(updatedTasks);

    moveTask({ id: task._id, status: nextStatus, newOrder });
  };

  // Sync local state with backend state when backend updates, 
  // but ONLY if we are not currently dragging to avoid fighting with the drag state
  useEffect(() => {
    if (!tasksQuery) return;
    
    if (tasksQuery !== prevTasksQuery.current && !activeId) {
      // Sort by order if available, otherwise by creation time (id)
      const sorted = [...tasksQuery].sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });
      setLocalTasks(sorted);
      prevTasksQuery.current = tasksQuery;
    } else if (localTasks.length === 0 && tasksQuery.length > 0) {
       // Initial load
       const sorted = [...tasksQuery].sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });
      setLocalTasks(sorted);
      prevTasksQuery.current = tasksQuery;
    }
  }, [tasksQuery, activeId, localTasks.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const columns = useMemo(() => {
    return {
      todo: localTasks.filter((t) => t.status === 'todo'),
      in_progress: localTasks.filter((t) => t.status === 'in_progress'),
      done: localTasks.filter((t) => t.status === 'done'),
    };
  }, [localTasks]);

  const taskIds = useMemo(() => {
    return localTasks.map((task) => task._id).sort((a, b) => a.localeCompare(b));
  }, [localTasks]);

  const linkedMeta = useQuery(api.todos.getLinkedTodoMeta, { taskIds });
  const linkedMetaMap = useMemo(() => {
    const map = new Map<string, LinkedTodoMeta>();
    (linkedMeta || []).forEach((entry) => {
      map.set(entry.taskId.toString(), entry as LinkedTodoMeta);
    });
    return map;
  }, [linkedMeta]);

  if (tasksQuery === undefined) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-full rounded-xl bg-muted/50 p-4 animate-pulse">
            <div className="h-6 w-24 bg-muted rounded mb-4" />
            <div className="space-y-3">
              <div className="h-24 bg-muted rounded-xl" />
              <div className="h-24 bg-muted rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    await createTask({
      title: newTaskTitle,
      projectId,
      priority: 1,
    });
    
    setNewTaskTitle('');
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as Id<"tasks">);
  };

  const handleDragOver = () => {
    // We rely on drag end to reconcile state to avoid shuffling other cards mid-drag
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as Id<"tasks">;
    
    setActiveId(null);

    if (!over) return;

    const overId = over.id;
    const activeTask = localTasks.find(t => t._id === activeId);
    
    if (!activeTask) return;

    const isColumnTarget = COLUMN_IDS.includes(overId as TaskStatus);
    const overTask = isColumnTarget ? undefined : localTasks.find(t => t._id === overId);

    let newStatus: TaskStatus = activeTask.status;
    if (isColumnTarget) {
      newStatus = overId as TaskStatus;
    } else if (overTask) {
      newStatus = overTask.status;
    }

    if (isColumnTarget) {
      const columnTasks = localTasks.filter(t => t.status === newStatus && t._id !== activeId);
      const maxOrder = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.order || 0)) : 0;
      const newOrder = maxOrder + 1000;

      setLocalTasks(prev => {
        const next = prev.filter(t => t._id !== activeId);
        const updatedTask = { ...activeTask, status: newStatus, order: newOrder };
        return [...next, updatedTask].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      });

      moveTask({ id: activeId, status: newStatus, newOrder });
      return;
    }

    if (overTask) {
      const activeIndex = localTasks.findIndex(t => t._id === activeId);
      const overIndex = localTasks.findIndex(t => t._id === overTask._id);

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
        return;
      }

      const reordered = arrayMove(localTasks, activeIndex, overIndex).map(t =>
        t._id === activeId ? { ...t, status: newStatus } : t
      );

      const statusTasks = reordered.filter(t => t.status === newStatus);
      const newIndexInStatus = statusTasks.findIndex(t => t._id === activeId);

      let newOrder;
      if (statusTasks.length === 1) {
        newOrder = statusTasks[0].order ?? Date.now();
      } else if (newIndexInStatus === 0) {
        const nextOrder = statusTasks[1]?.order || 0;
        newOrder = nextOrder - 1000;
      } else if (newIndexInStatus === statusTasks.length - 1) {
        const prevOrder = statusTasks[newIndexInStatus - 1]?.order || 0;
        newOrder = prevOrder + 1000;
      } else {
        const prevOrder = statusTasks[newIndexInStatus - 1]?.order || 0;
        const nextOrder = statusTasks[newIndexInStatus + 1]?.order || 0;
        newOrder = (prevOrder + nextOrder) / 2;
      }

      setLocalTasks(reordered.map(t =>
        t._id === activeId ? { ...t, order: newOrder, status: newStatus } : t
      ));

      moveTask({ 
        id: activeId, 
        status: newStatus, 
        newOrder: newOrder || Date.now() 
      });
    }
  };

  const activeTask = localTasks.find(t => t._id === activeId);

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart} 
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
        {/* TODO Column */}
        <div className="flex flex-col h-full">
          <DroppableColumn 
            id="todo" 
            title="To Do" 
            count={columns.todo.length} 
            headerColor="bg-slate-500"
            className="flex-1"
          >
            <SortableContext items={columns.todo.map(t => t._id)} strategy={verticalListSortingStrategy}>
              {columns.todo.map((task) => (
                <SortableTask
                  key={task._id}
                  task={task}
                  onAdvance={handleAdvance}
                  linkedTodo={linkedMetaMap.get(task._id.toString())}
                />
              ))}
            </SortableContext>
            
            <form onSubmit={handleCreateTask} className="mt-2">
              <div className="relative">
                <Input 
                  placeholder="Add a task..." 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="pr-8 bg-background shadow-sm border-dashed border-muted-foreground/30 focus:border-solid"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  variant="ghost"
                  className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </DroppableColumn>
        </div>

        {/* IN PROGRESS Column */}
        <DroppableColumn 
          id="in_progress" 
          title="In Progress" 
          count={columns.in_progress.length} 
          headerColor="bg-blue-500"
        >
          <SortableContext items={columns.in_progress.map(t => t._id)} strategy={verticalListSortingStrategy}>
              {columns.in_progress.map((task) => (
                <SortableTask
                  key={task._id}
                  task={task}
                  onAdvance={handleAdvance}
                  linkedTodo={linkedMetaMap.get(task._id.toString())}
                />
            ))}
          </SortableContext>
        </DroppableColumn>

        {/* DONE Column */}
        <DroppableColumn 
          id="done" 
          title="Done" 
          count={columns.done.length} 
          headerColor="bg-green-500"
        >
          <SortableContext items={columns.done.map(t => t._id)} strategy={verticalListSortingStrategy}>
              {columns.done.map((task) => (
                <SortableTask
                  key={task._id}
                  task={task}
                  onAdvance={handleAdvance}
                  linkedTodo={linkedMetaMap.get(task._id.toString())}
                />
            ))}
          </SortableContext>
        </DroppableColumn>
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function LinkedTodoBadge({ meta, taskId }: { meta: LinkedTodoMeta; taskId: Id<"tasks"> }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-xs">
      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
        <LinkIcon className="h-3.5 w-3.5" />
        <span className="font-medium">{meta.todoTitle}</span>
      </div>
      <TaskRelinkDialog taskId={taskId} currentTodoId={meta.todoId} />
    </div>
  );
}

function TaskRelinkDialog({ taskId, currentTodoId }: { taskId: Id<"tasks">; currentTodoId: Id<"todos"> }) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const todos = useQuery(api.todos.listTodos, {});
  const relinkTask = useMutation(api.todos.relinkTask);
  const unlinkTask = useMutation(api.todos.unlinkTaskFromTodo);

  const availableTodos = useMemo(() => (todos || []).filter((todo) => todo._id !== currentTodoId), [todos, currentTodoId]);

  const handleRelink = async (targetTodoId: Id<"todos">) => {
    setIsUpdating(true);
    await relinkTask({ sourceTodoId: currentTodoId, targetTodoId, taskId });
    setIsUpdating(false);
    setOpen(false);
  };

  const handleUnlink = async () => {
    setIsUpdating(true);
    await unlinkTask({ todoId: currentTodoId, taskId });
    setIsUpdating(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-blue-600">
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move task to another todo</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">Select a destination todo or unlink entirely.</p>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {availableTodos.length ? (
              availableTodos.map((todo) => (
                <Button
                  key={todo._id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  disabled={isUpdating}
                  onClick={() => handleRelink(todo._id)}
                >
                  <span className="text-left">
                    <span className="font-medium">{todo.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{todo.status}</span>
                  </span>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No other todos available.</p>
            )}
          </div>
          <Button type="button" variant="ghost" className="text-red-500" disabled={isUpdating} onClick={handleUnlink}>
            Unlink from todo
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}