# Answers to Questions
1. Yes keep WORKOS
2. Yes add userId to the schema
3. No, don't add src folder.
4. Yes, you should delete it

**IMPORTANT**: You can use /documents/design.md to guide your UI components implementation

# Plan Creation Stage

Based on our full exchange, now, produce a markdown plan document (`./app/documents/plans/`).

Requirements for the plan:

- Give a detailed summary about the plan so that anyone can read it and understand its context.
- Include clear, minimal, concise steps.
- Track the status of each step using these emojis:
  - 🟩 Done
  - 🟨 In Progress
  - 🟥 To Do
- Include dynamic tracking of overall progress percentage (at top).
- Do NOT add extra scope or unnecessary complexity beyond explicitly clarified details.
- Steps should be modular, elegant, minimal, and integrate seamlessly within the existing codebase.

Markdown Template Example:

```e-signasture-feature.md (example)
# (Example) Feature Implementation Plan

**Overall Progress:** `0%`

## Tasks:

- [ ] 🟥 **Step 1: Setup authentication module**
  - [ ] 🟥 Create authentication service class
  - [ ] 🟥 Implement JWT token handling
  - [ ] 🟥 Connect service to existing database schema

- [ ] 🟥 **Step 2: Develop frontend login UI**
  - [ ] 🟥 Design login page component (React)
  - [ ] 🟥 Integrate component with auth endpoints
  - [ ] 🟥 Add form validation and error handling

- [ ] 🟥 **Step 3: Add user session management**
  - [ ] 🟥 Set up session cookies securely
  - [ ] 🟥 Implement session renewal logic
  - [ ] 🟥 Handle session expiry and logout process

...
```

Again, for clarity, it's still not time to build yet. Just write the clear plan document. No extra complexity or extra scope beyond what we discussed. The plan should lead to simple, elegant, minimal code that does the job perfectly.
---