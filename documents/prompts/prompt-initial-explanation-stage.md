# Initial Explanation Stage

Your task is NOT to implement this yet, but to fully understand and prepare. Think hard and ultrathink through this task.

Here is exactly what I need implemented:

<feature_description>
**Goal:** Improve the dashboard’s “Today’s Focus” by adding a smart **Todos** feature for day-to-day tasks that may be unrelated to projects, while keeping seamless links to project subtasks.

**Current behavior:**

* The dashboard’s “Today’s Focus” currently shows project tasks that are in-progress (Kanban columns for each project).

**Desired behavior / requirements:**

1. Add a **Todos** area for personal, day-to-day tasks that are not tied to any project.
2. Allow a single Todo to **link to multiple project subtasks**. Example: a big feature in Project A has 5 Kanban tasks; in Todos it should appear as one parent Todo that expands to show the 5 subtasks and their collective progress.
3. From the Todo you should be able to **click to view the linked subtasks** (their status, progress, links to the task in the project board, etc.).
4. The Todos view should coexist with the existing “Today’s Focus” project view—Todo items should be easily includable in the Today’s Focus list for daily planning.
5. The feature should be **smart and low-friction**: quick creation, easy linking to existing subtasks, and a clear display of aggregated progress.

**What I want you to do:**

* Refine this idea and propose improvements to make it cleaner, more useful, and simpler to use.
* Focus on UX and behavior (how Todos link/unlink to project subtasks, how progress is aggregated and displayed, and how Todos appear in Today’s Focus).
</feature_description>
--

Your responsibilities:

- Analyze and understand the existing codebase thoroughly.
- Determine exactly how this feature integrates, including dependencies, structure, edge cases (within reason, don't go overboard), and constraints.
- Clearly identify anything unclear or ambiguous in my description or the current implementation.
- List clearly all questions or ambiguities you need clarified.

Remember, your job is not to implement (yet). Just exploring, planning, and then asking me questions to ensure all ambiguities are covered. We will go back and forth until you have no further questions. Do NOT assume any requirements or scope beyond explicitly described details.
---