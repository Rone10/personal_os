'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
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
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanBoardProps {
  projectId: Id<"projects">;
}

type TaskStatus = "todo" | "in_progress" | "done";

function TaskCard({ task, toggleTask, isOverlay }: { task: Doc<"tasks">, toggleTask?: (args: { id: Id<"tasks"> }) => void, isOverlay?: boolean }) {
  return (
    <div 
      className={`bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 shadow-sm ${isOverlay ? 'cursor-grabbing shadow-xl rotate-2 scale-105' : 'cursor-grab active:cursor-grabbing'} touch-none`}
    >
      <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-500' : ''}`}>{task.title}</p>
      <div className="mt-2 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 text-xs" 
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag start when clicking button
            toggleTask?.({ id: task._id });
          }}
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
        >
          {task.status === 'todo' ? 'Start' : task.status === 'in_progress' ? 'Done' : 'Undo'}
        </Button>
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
      <div ref={setNodeRef} style={style} className="opacity-30">
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

function DroppableColumn({ id, title, count, children, className, titleColorClass, badgeColorClass }: { 
  id: string, 
  title: string, 
  count: number, 
  children: React.ReactNode, 
  className: string,
  titleColorClass?: string,
  badgeColorClass?: string
}) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div ref={setNodeRef} className={`flex flex-col h-full rounded-lg p-4 ${className}`}>
      <h3 className={`font-semibold mb-4 flex items-center justify-between ${titleColorClass || ''}`}>
        {title}
        <span className={`text-xs px-2 py-1 rounded-full ${badgeColorClass || 'bg-slate-200 dark:bg-slate-800'}`}>{count}</span>
      </h3>
      
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
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

  // Sync local state with backend state when backend updates, 
  // but ONLY if we are not currently dragging to avoid fighting with the drag state
  useEffect(() => {
    if (tasksQuery && !activeId) {
      // Sort by order if available, otherwise by creation time (id)
      const sorted = [...tasksQuery].sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });
      setLocalTasks(sorted);
    }
  }, [tasksQuery, activeId]);

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
    return <div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-900 rounded-lg" />;
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
    
    if (!activeTask) return;

    // If dropped on a column directly
    if (['todo', 'in_progress', 'done'].includes(overId as string)) {
      const newStatus = overId as TaskStatus;
      // If status changed, update it
      if (activeTask.status !== newStatus) {
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
            className="bg-slate-50 dark:bg-slate-900/50 flex-1"
          >
            <SortableContext items={columns.todo.map(t => t._id)} strategy={verticalListSortingStrategy}>
              {columns.todo.map((task) => (
                <SortableTask key={task._id} task={task} toggleTask={toggleTask} />
              ))}
            </SortableContext>
          </DroppableColumn>

          <form onSubmit={handleCreateTask} className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex gap-2">
              <Input 
                placeholder="Add task..." 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="h-8 text-sm"
              />
              <Button type="submit" size="sm" className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>

        {/* IN PROGRESS Column */}
        <DroppableColumn 
          id="in_progress" 
          title="In Progress" 
          count={columns.in_progress.length} 
          className="bg-blue-50/50 dark:bg-blue-900/10"
          titleColorClass="text-blue-700 dark:text-blue-400"
          badgeColorClass="bg-blue-100 dark:bg-blue-900/30"
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
          className="bg-slate-50 dark:bg-slate-900/50 opacity-75"
        >
          <SortableContext items={columns.done.map(t => t._id)} strategy={verticalListSortingStrategy}>
            {columns.done.map((task) => (
              <SortableTask key={task._id} task={task} toggleTask={toggleTask} />
            ))}
          </SortableContext>
        </DroppableColumn>
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
