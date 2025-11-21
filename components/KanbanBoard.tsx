'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { Plus, GripVertical, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo } from 'react';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent, 
  DragOverEvent,
  useDroppable, 
  DragOverlay,
  closestCorners,
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

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

function TaskCard({ task, toggleTask, isOverlay }: { task: Doc<"tasks">, toggleTask?: (args: { id: Id<"tasks"> }) => void, isOverlay?: boolean }) {
  return (
    <div 
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-all hover:shadow-md",
        isOverlay ? "cursor-grabbing shadow-xl rotate-2 scale-105 ring-2 ring-primary/20" : "cursor-grab active:cursor-grabbing",
        task.status === 'done' && "opacity-60 bg-muted/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              toggleTask?.({ id: task._id });
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {task.status === 'done' ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : task.status === 'in_progress' ? (
              <Clock className="h-4 w-4 text-blue-500" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </Button>
          <span className={cn(
            "text-sm font-medium leading-tight",
            task.status === 'done' && "line-through text-muted-foreground"
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
    </div>
  );
}

function SortableTask({ task, toggleTask }: { task: Doc<"tasks">, toggleTask: (args: { id: Id<"tasks"> }) => void }) {
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
        <TaskCard task={task} toggleTask={toggleTask} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <TaskCard task={task} toggleTask={toggleTask} />
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
  const toggleTask = useMutation(api.tasks.toggle);
  const moveTask = useMutation(api.tasks.move);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeId, setActiveId] = useState<Id<"tasks"> | null>(null);
  const [localTasks, setLocalTasks] = useState<Doc<"tasks">[]>([]);
  const prevTasksQuery = React.useRef(tasksQuery);

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

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as Id<"tasks">;
    const overId = over.id;

    // Find the containers
    const activeTask = localTasks.find(t => t._id === activeId);
    const overTask = localTasks.find(t => t._id === overId);
    
    if (!activeTask) return;

    const activeContainer = activeTask.status;
    // If over a task, use its status, otherwise check if over a column
    const overContainer = overTask ? overTask.status : (['todo', 'in_progress', 'done'].includes(overId as string) ? overId as TaskStatus : null);

    if (!overContainer || activeContainer === overContainer) {
      return;
    }

    // Moving between columns
    setLocalTasks((prev) => {
      const activeIndex = prev.findIndex((t) => t._id === activeId);
      const newTasks = [...prev];
      
      // Update the status of the active task to match the new container
      newTasks[activeIndex] = {
        ...newTasks[activeIndex],
        status: overContainer,
      };
      
      return newTasks;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as Id<"tasks">;
    
    setActiveId(null);

    if (!over) return;

    const overId = over.id;
    const activeTask = localTasks.find(t => t._id === activeId);
    const originalTask = tasksQuery?.find(t => t._id === activeId);
    
    if (!activeTask) return;

    // If dropped on a column directly
    if (['todo', 'in_progress', 'done'].includes(overId as string)) {
      const newStatus = overId as TaskStatus;
      // If status changed relative to SERVER state, update it
      if (originalTask?.status !== newStatus) {
        // Calculate new order (append to end of column)
        const columnTasks = localTasks.filter(t => t.status === newStatus);
        const maxOrder = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.order || 0)) : 0;
        const newOrder = maxOrder + 1000;

        moveTask({ id: activeId, status: newStatus, newOrder });
      }
      return;
    }

    // If dropped on another task
    const overTask = localTasks.find(t => t._id === overId);
    if (overTask) {
      const activeIndex = localTasks.findIndex(t => t._id === activeId);
      const overIndex = localTasks.findIndex(t => t._id === overId);

      if (activeIndex !== overIndex) {
        const newTasks = arrayMove(localTasks, activeIndex, overIndex);
        setLocalTasks(newTasks);

        // Calculate new order
        // We need to find the new neighbors in the *same status* list
        const statusTasks = newTasks.filter(t => t.status === activeTask.status);
        const newIndexInStatus = statusTasks.findIndex(t => t._id === activeId);
        
        let newOrder;
        if (newIndexInStatus === 0) {
          // First item
          const nextOrder = statusTasks[1]?.order || 0;
          newOrder = nextOrder - 1000;
        } else if (newIndexInStatus === statusTasks.length - 1) {
          // Last item
          const prevOrder = statusTasks[newIndexInStatus - 1]?.order || 0;
          newOrder = prevOrder + 1000;
        } else {
          // Middle
          const prevOrder = statusTasks[newIndexInStatus - 1]?.order || 0;
          const nextOrder = statusTasks[newIndexInStatus + 1]?.order || 0;
          newOrder = (prevOrder + nextOrder) / 2;
        }

        moveTask({ 
          id: activeId, 
          status: activeTask.status, 
          newOrder: newOrder || Date.now() 
        });
      }
    }
  };

  const activeTask = localTasks.find(t => t._id === activeId);

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCorners}
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
                <SortableTask key={task._id} task={task} toggleTask={toggleTask} />
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
              <SortableTask key={task._id} task={task} toggleTask={toggleTask} />
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
              <SortableTask key={task._id} task={task} toggleTask={toggleTask} />
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