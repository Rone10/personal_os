# Initial Explanation Stage

Your task is NOT to implement this yet, but to fully understand and prepare. Think hard and ultrathink through this task.

Here is exactly what I need implemented:

<feature_description>
You know when working on projects, especially coding projects, it would help to link the project's tasks to say, features of the project. For eg when working on a chat app, a major feature like messaging could be linked to tasks like "show notification counts" etc.

When managing projects (especially coding projects), link project **features** to individual **tasks** so feature context appears on task cards alongside existing sub-indicators (priority, due date, assignee).

Specification:

* **Purpose:** Allow project features (for example, “Messaging” in a chat app) to be created and associated with tasks so users can see feature context on task cards and manage feature progress via a checklist.

* **Project schema changes:** Add an optional `features` collection to the project model. Each Feature contains:

  * `title` (string)
  * `description` (text)
  * `whatDoneLooksLike` (acceptance criteria / text)
  * `checklist` (ordered list of checklist items)

* **Checklist items:** A checklist item may optionally reference an existing task ID. Checklist items are checkable and represent work needed to complete the Feature.

* **Project-type behavior:**

  * Detect whether a project is a coding project. If it is, allow users to add Features either during project creation or later from the project settings/UI.
  * For non-coding projects, Features remain optional and may be omitted.

* **Linking tasks to features:** Provide UI affordances to link a task to a Feature (or to a specific checklist item within a Feature). When a task is linked to a checklist item, the linkage is stored in the task and the Feature checklist item.

* **Kanban interaction rule (required):** If a checklist item references a task, moving that task to the **Done** column on the Kanban board must automatically check off the corresponding checklist item in the Feature’s checklist.

* **UI display:** Show the Feature name (or a link to the Feature) on the task card next to existing sub-indicators (priority, due date, assignee) so users can easily see which Feature a task contributes to.

* **Constraints:** Do not remove or alter existing sub-indicators; only add Feature context alongside them. Do not introduce functionality beyond the described behaviors.



</feature_description>
--

Your responsibilities:

- Analyze and understand the existing codebase thoroughly.
- Determine exactly how this feature integrates, including dependencies, structure, edge cases (within reason, don't go overboard), and constraints.
- Clearly identify anything unclear or ambiguous in my description or the current implementation.
- List clearly all questions or ambiguities you need clarified.

Remember, your job is not to implement (yet). Just exploring, planning, and then asking me questions to ensure all ambiguities are covered. We will go back and forth until you have no further questions. Do NOT assume any requirements or scope beyond explicitly described details.
---