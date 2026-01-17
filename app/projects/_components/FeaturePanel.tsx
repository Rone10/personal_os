'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useDroppable } from '@dnd-kit/core';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ListChecks, ChevronDown, X, Circle, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface FeaturePanelProps {
  projectId: Id<'projects'>;
  features: FeatureRecord[] | undefined;
  enableTaskTargets?: boolean;
  activeTaskId?: Id<'tasks'> | null;
}

type FeatureRecord = Doc<'projectFeatures'> & {
  checklist: Doc<'featureChecklistItems'>[];
  progress: {
    total: number;
    completed: number;
    percentage: number;
  };
};

const emptyFeatureForm = {
  title: '',
  description: '',
  whatDoneLooksLike: '',
};

type LinkedTaskInfo = {
  _id: Id<'tasks'>;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priorityLevel: string;
};

export function FeaturePanel({ projectId, features, enableTaskTargets = false, activeTaskId }: FeaturePanelProps) {
  const createFeature = useMutation(api.features.createFeature);
  const updateFeature = useMutation(api.features.updateFeature);
  const deleteFeature = useMutation(api.features.deleteFeature);
  const reorderFeatures = useMutation(api.features.reorderFeatures);
  const createChecklistItem = useMutation(api.features.createChecklistItem);
  const updateChecklistItem = useMutation(api.features.updateChecklistItem);
  const deleteChecklistItem = useMutation(api.features.deleteChecklistItem);
  const reorderChecklist = useMutation(api.features.reorderChecklist);
  const unlinkTaskFromFeature = useMutation(api.features.unlinkTaskFromFeature);

  // Collect all checklist IDs to batch-fetch linked tasks
  const allChecklistIds = useMemo(() => {
    if (!features) return [];
    return features.flatMap((f) => f.checklist.map((item) => item._id));
  }, [features]);

  const linkedTasksData = useQuery(
    api.features.getLinkedTasksForChecklistItemsBatch,
    allChecklistIds.length > 0 ? { checklistIds: allChecklistIds } : 'skip'
  );

  const handleUnlinkTask = async (taskId: Id<'tasks'>) => {
    try {
      await unlinkTaskFromFeature({ taskId });
      toast.success('Task unlinked from feature');
    } catch (error) {
      console.error(error);
      toast.error('Unable to unlink task');
    }
  };

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
  const [activeFeature, setActiveFeature] = useState<FeatureRecord | null>(null);
  const [featureForm, setFeatureForm] = useState(emptyFeatureForm);
  const [isSavingFeature, setIsSavingFeature] = useState(false);
  const [newChecklistTitles, setNewChecklistTitles] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setSheetMode('create');
    setActiveFeature(null);
    setFeatureForm(emptyFeatureForm);
    setSheetOpen(true);
  };

  const handleOpenEdit = (feature: FeatureRecord) => {
    setSheetMode('edit');
    setActiveFeature(feature);
    setFeatureForm({
      title: feature.title,
      description: feature.description ?? '',
      whatDoneLooksLike: feature.whatDoneLooksLike ?? '',
    });
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setActiveFeature(null);
    setFeatureForm(emptyFeatureForm);
    setSheetMode('create');
  };

  const handleFeatureSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingFeature(true);
    try {
      if (sheetMode === 'create') {
        await createFeature({
          projectId,
          title: featureForm.title.trim(),
          description: featureForm.description.trim() || undefined,
          whatDoneLooksLike: featureForm.whatDoneLooksLike.trim() || undefined,
        });
        toast.success('Feature created');
      } else if (activeFeature) {
        await updateFeature({
          featureId: activeFeature._id,
          title: featureForm.title.trim() || activeFeature.title,
          description: featureForm.description.trim() ? featureForm.description.trim() : null,
          whatDoneLooksLike: featureForm.whatDoneLooksLike.trim() ? featureForm.whatDoneLooksLike.trim() : null,
        });
        toast.success('Feature updated');
      }
      closeSheet();
    } catch (error) {
      console.error(error);
      toast.error('Unable to save feature');
    } finally {
      setIsSavingFeature(false);
    }
  };

  const handleFeatureDelete = async (featureId: Id<'projectFeatures'>) => {
    try {
      await deleteFeature({ featureId });
      toast.success('Feature deleted');
    } catch (error) {
      console.error(error);
      toast.error('Unable to delete feature');
    }
  };

  const handleFeatureMove = async (featureId: Id<'projectFeatures'>, direction: 'up' | 'down') => {
    if (!features?.length) return;
    const currentOrder = [...features];
    const index = currentOrder.findIndex((feature) => feature._id === featureId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentOrder.length) return;

    const reordered = [...currentOrder];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    try {
      await reorderFeatures({ projectId, orderedFeatureIds: reordered.map((item) => item._id) });
    } catch (error) {
      console.error(error);
      toast.error('Unable to reorder features');
    }
  };

  const handleChecklistCreate = async (featureId: Id<'projectFeatures'>) => {
    const title = (newChecklistTitles[featureId] ?? '').trim();
    if (!title) return;
    try {
      await createChecklistItem({ featureId, title });
      setNewChecklistTitles((prev) => ({ ...prev, [featureId]: '' }));
    } catch (error) {
      console.error(error);
      toast.error('Unable to add checklist item');
    }
  };

  const handleChecklistToggle = async (item: Doc<'featureChecklistItems'>) => {
    const nextStatus = item.status === 'done' ? 'todo' : 'done';
    try {
      await updateChecklistItem({ checklistId: item._id, status: nextStatus });
    } catch (error) {
      console.error(error);
      toast.error('Checklist status is managed by linked tasks');
    }
  };

  const handleChecklistUpdate = async (
    item: Doc<'featureChecklistItems'>,
    payload: { title?: string; description?: string | null },
  ) => {
    try {
      const updatePayload: {
        checklistId: Id<'featureChecklistItems'>;
        title?: string;
        description?: string | null;
      } = { checklistId: item._id };
      if (payload.title !== undefined) {
        updatePayload.title = payload.title;
      }
      if (payload.description !== undefined) {
        updatePayload.description = payload.description;
      }
      await updateChecklistItem(updatePayload);
      toast.success('Checklist updated');
    } catch (error) {
      console.error(error);
      toast.error('Unable to update checklist item');
    }
  };

  const handleChecklistDelete = async (item: Doc<'featureChecklistItems'>) => {
    try {
      await deleteChecklistItem({ checklistId: item._id });
      toast.success('Checklist item removed');
    } catch (error) {
      console.error(error);
      toast.error('Unable to remove checklist item');
    }
  };

  const handleChecklistMove = async (
    feature: FeatureRecord,
    itemId: Id<'featureChecklistItems'>,
    direction: 'up' | 'down',
  ) => {
    const index = feature.checklist.findIndex((entry) => entry._id === itemId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= feature.checklist.length) return;

    const nextOrder = [...feature.checklist];
    const [moved] = nextOrder.splice(index, 1);
    nextOrder.splice(targetIndex, 0, moved);

    try {
      await reorderChecklist({ featureId: feature._id, orderedChecklistIds: nextOrder.map((entry) => entry._id) });
    } catch (error) {
      console.error(error);
      toast.error('Unable to reorder checklist');
    }
  };

  const isDragActive = enableTaskTargets && Boolean(activeTaskId);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Feature Cockpit
          </h2>
        </div>
        <Button size="sm" onClick={handleOpenCreate} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> New Feature
        </Button>
      </div>
      
      {features === undefined ? (
        <div className="space-y-4">
          {[0, 1].map((key) => (
            <div key={key} className="animate-pulse rounded-xl bg-slate-100 h-32 dark:bg-slate-900" />
          ))}
        </div>
      ) : features.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
          <p className="text-sm text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
            No features yet. Use the button above to capture major slices of this project.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-3 pr-3">
          <div className="space-y-4 pb-4">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature._id}
                feature={feature}
                isFirst={index === 0}
                isLast={index === (features?.length ?? 0) - 1}
                enableTaskTargets={enableTaskTargets}
                isDragActive={isDragActive}
                linkedTasksData={linkedTasksData}
                onUnlinkTask={handleUnlinkTask}
                onEdit={() => handleOpenEdit(feature)}
                onDelete={() => handleFeatureDelete(feature._id)}
                onMove={(direction) => handleFeatureMove(feature._id, direction)}
                onChecklistAdd={() => handleChecklistCreate(feature._id)}
                onChecklistTitleChange={(value) =>
                  setNewChecklistTitles((prev) => ({ ...prev, [feature._id]: value }))
                }
                pendingChecklistTitle={newChecklistTitles[feature._id] ?? ''}
                onChecklistToggle={handleChecklistToggle}
                onChecklistEdit={handleChecklistUpdate}
                onChecklistDelete={handleChecklistDelete}
                onChecklistMove={(itemId, direction) => handleChecklistMove(feature, itemId, direction)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <FeatureSheet
        open={sheetOpen}
        mode={sheetMode}
        formState={featureForm}
        onOpenChange={(next) => {
          setSheetOpen(next);
          if (!next) {
            closeSheet();
          }
        }}
        onChange={setFeatureForm}
        onSubmit={handleFeatureSubmit}
        isSaving={isSavingFeature}
        feature={activeFeature}
      />
    </div>
  );
}

interface FeatureCardProps {
  feature: FeatureRecord;
  isFirst: boolean;
  isLast: boolean;
  enableTaskTargets?: boolean;
  isDragActive: boolean;
  linkedTasksData?: Record<string, LinkedTaskInfo[]>;
  onUnlinkTask: (taskId: Id<'tasks'>) => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void> | void;
  onMove: (direction: 'up' | 'down') => Promise<void> | void;
  onChecklistAdd: () => Promise<void> | void;
  onChecklistTitleChange: (value: string) => void;
  pendingChecklistTitle: string;
  onChecklistToggle: (item: Doc<'featureChecklistItems'>) => Promise<void> | void;
  onChecklistEdit: (
    item: Doc<'featureChecklistItems'>,
    payload: { title?: string; description?: string | null },
  ) => Promise<void> | void;
  onChecklistDelete: (item: Doc<'featureChecklistItems'>) => Promise<void> | void;
  onChecklistMove: (itemId: Id<'featureChecklistItems'>, direction: 'up' | 'down') => Promise<void> | void;
}

function FeatureCard({
  feature,
  isFirst,
  isLast,
  enableTaskTargets = false,
  isDragActive,
  linkedTasksData,
  onUnlinkTask,
  onEdit,
  onDelete,
  onMove,
  onChecklistAdd,
  onChecklistTitleChange,
  pendingChecklistTitle,
  onChecklistToggle,
  onChecklistEdit,
  onChecklistDelete,
  onChecklistMove,
}: FeatureCardProps) {
  const hasChecklist = feature.checklist.length > 0;
  const disableChecklistToggle = (item: Doc<'featureChecklistItems'>) => Boolean(item.linkedTaskIds?.length);
  const { setNodeRef, isOver } = useDroppable({
    id: `feature:${feature._id}`,
    disabled: !enableTaskTargets,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onEdit}
      className={cn(
        'group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900 cursor-pointer',
        enableTaskTargets && isDragActive && 'border-dashed border-slate-400 ring-2 ring-slate-400/20',
        isOver && 'border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/30'
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <div className={cn("h-2 w-2 rounded-full shrink-0 mt-1.5", feature.progress.percentage === 1 ? "bg-emerald-500" : "bg-blue-500")} />
              <h3 className="text-base font-semibold line-clamp-2">{feature.title}</h3>
            </div>
            {feature.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{feature.description}</p>
            )}
          </div>
          
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity -mr-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); void onMove('up'); }} disabled={isFirst}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); void onMove('down'); }} disabled={isLast}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete feature?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the feature, its checklist, and will unlink any related tasks.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void onDelete()}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(feature.progress.percentage * 100)}%</span>
          </div>
          <Progress value={Math.round(feature.progress.percentage * 100)} className="h-1.5" />
        </div>

        {feature.whatDoneLooksLike && (
          <div className="rounded-lg bg-slate-50 p-2.5 text-xs italic text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
            {feature.whatDoneLooksLike}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {hasChecklist ? (
          feature.checklist.map((item, index) => (
            <ChecklistRow
              key={item._id}
              item={item}
              isFirst={index === 0}
              isLast={index === feature.checklist.length - 1}
              enableTaskTargets={enableTaskTargets}
              isDragActive={isDragActive}
              disableToggle={disableChecklistToggle(item)}
              linkedTasks={linkedTasksData?.[item._id] ?? []}
              onUnlinkTask={onUnlinkTask}
              onChecklistMove={onChecklistMove}
              onChecklistToggle={onChecklistToggle}
              onChecklistEdit={onChecklistEdit}
              onChecklistDelete={onChecklistDelete}
            />
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 p-2.5 text-xs text-center text-muted-foreground dark:border-slate-800">
            No checklist items yet.
          </p>
        )}
      </div>

      <form
        className="mt-3 flex gap-2"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          void onChecklistAdd();
        }}
      >
        <Input
          placeholder="Add checklist item..."
          value={pendingChecklistTitle}
          onChange={(event) => onChecklistTitleChange(event.target.value)}
          className="h-8 text-xs"
        />
        <Button type="submit" variant="secondary" size="sm" className="h-8 px-3">
          Add
        </Button>
      </form>
    </div>
  );
}

interface ChecklistRowProps {
  item: Doc<'featureChecklistItems'>;
  isFirst: boolean;
  isLast: boolean;
  enableTaskTargets?: boolean;
  isDragActive: boolean;
  disableToggle: boolean;
  linkedTasks: LinkedTaskInfo[];
  onUnlinkTask: (taskId: Id<'tasks'>) => Promise<void>;
  onChecklistToggle: (item: Doc<'featureChecklistItems'>) => Promise<void> | void;
  onChecklistMove: (itemId: Id<'featureChecklistItems'>, direction: 'up' | 'down') => Promise<void> | void;
  onChecklistEdit: (
    item: Doc<'featureChecklistItems'>,
    payload: { title?: string; description?: string | null },
  ) => Promise<void> | void;
  onChecklistDelete: (item: Doc<'featureChecklistItems'>) => Promise<void> | void;
}

function ChecklistRow({
  item,
  isFirst,
  isLast,
  enableTaskTargets = false,
  isDragActive,
  disableToggle,
  linkedTasks,
  onUnlinkTask,
  onChecklistToggle,
  onChecklistMove,
  onChecklistEdit,
  onChecklistDelete,
}: ChecklistRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: `checklist:${item._id}`,
    disabled: !enableTaskTargets,
  });

  const hasLinkedTasks = linkedTasks.length > 0;

  const getStatusIcon = (status: 'todo' | 'in_progress' | 'done') => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      case 'in_progress':
        return <Clock className="h-3 w-3 text-blue-500" />;
      default:
        return <Circle className="h-3 w-3 text-slate-400" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800 transition-all',
        item.status === 'done' && 'bg-emerald-50/70 dark:bg-emerald-950/40',
        enableTaskTargets && isDragActive && 'border-dashed border-slate-400/70 ring-2 ring-slate-400/20',
        isOver && 'border-blue-500 bg-blue-50/60 dark:border-blue-400 dark:bg-blue-950/40 scale-[1.02]'
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={item.status === 'done'}
          onCheckedChange={() => void onChecklistToggle(item)}
          disabled={disableToggle}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{item.title}</p>
          {item.description && (
            <p className="text-xs text-muted-foreground">{item.description}</p>
          )}

          {hasLinkedTasks && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mt-2">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                  <span>
                    {linkedTasks.length} task{linkedTasks.length > 1 ? 's' : ''}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1.5">
                {linkedTasks.map((task) => (
                  <div
                    key={task._id}
                    className="group/task flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getStatusIcon(task.status)}
                      <span className={cn(
                        'truncate',
                        task.status === 'done' && 'line-through text-muted-foreground'
                      )}>
                        {task.title}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover/task:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                      onClick={() => void onUnlinkTask(task._id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void onChecklistMove(item._id, 'up')} disabled={isFirst}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => void onChecklistMove(item._id, 'down')}
            disabled={isLast}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <ChecklistEditDialog item={item} onSave={onChecklistEdit} onDelete={onChecklistDelete} />
        </div>
      </div>
    </div>
  );
}

interface FeatureSheetProps {
  open: boolean;
  mode: 'create' | 'edit';
  feature: FeatureRecord | null;
  formState: typeof emptyFeatureForm;
  onChange: (next: typeof emptyFeatureForm) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  isSaving: boolean;
}

function FeatureSheet({ open, mode, feature, formState, onChange, onSubmit, onOpenChange, isSaving }: FeatureSheetProps) {
  const isDisabled = isSaving || formState.title.trim().length === 0;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0" side="right">
        <SheetHeader>
          <SheetTitle>{mode === 'create' ? 'Create feature' : `Edit ${feature?.title}`}</SheetTitle>
        </SheetHeader>
        <form className="flex flex-1 flex-col gap-4 p-4" onSubmit={onSubmit}>
          <Input
            required
            value={formState.title}
            onChange={(event) => onChange({ ...formState, title: event.target.value })}
            placeholder="Feature title"
          />
          <Textarea
            value={formState.description}
            onChange={(event) => onChange({ ...formState, description: event.target.value })}
            placeholder="Short summary"
            rows={3}
          />
          <Textarea
            value={formState.whatDoneLooksLike}
            onChange={(event) => onChange({ ...formState, whatDoneLooksLike: event.target.value })}
            placeholder={"What does 'done' look like?"}
            rows={4}
          />
          <SheetFooter>
            <Button type="submit" disabled={isDisabled}>
              {mode === 'create' ? 'Save Feature' : 'Update Feature'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

interface ChecklistEditDialogProps {
  item: Doc<'featureChecklistItems'>;
  onSave: (
    item: Doc<'featureChecklistItems'>,
    payload: { title?: string; description?: string | null },
  ) => Promise<void> | void;
  onDelete: (item: Doc<'featureChecklistItems'>) => Promise<void> | void;
}

function ChecklistEditDialog({ item, onSave, onDelete }: ChecklistEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? '');
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setTitle(item.title);
      setDescription(item.description ?? '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit checklist item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Details"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="flex flex-row justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              void onDelete(item);
              setOpen(false);
            }}
          >
            Remove
          </Button>
          <Button
            type="button"
            onClick={() => {
              void onSave(item, {
                title: title.trim() || item.title,
                description: description.trim() ? description.trim() : null,
              });
              setOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
