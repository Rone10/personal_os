# Answers to Questions
1. Yes, search is only across saved items. 
2. I want them separated, but usually when I enter a word, I might add an example of a phrase or something. 
3. Multiple meanings. One word or verse could have so many meanings from different sources. 
4. - Yes, I want to have ranges for the Quran. 
- Yes, I want structured fields for the hadith. 
- Yes, I want URL + title or autofills, but they should all be optional. 
5. Yes, I want to store the translation or the meaning I saw. I want the Arabic ayah text, and yes, there can be multiple translations per ayah. However, I also want to have a note section for the ayah or the word so that I can put in my own opinion or my own thoughts. 
6. Yes, I want UI to automatically show the saved verse capture. 
7. Yes, Arabic search should be diacritics-insensitive, and English search can be fuzzy. 
8. Yes, I need edit or delete. 
9. Keep flashcards minimal. 
# Plan Creation Stage

Based on our full exchange, now produce a **markdown implementation plan** for the feature in the file path: `./app/study`.

Requirements for the plan:

* Give a **clear, detailed summary** of the feature and the plan so that anyone can read it and understand its context and intent.
* Include **clear, minimal, concise steps**, but:

  * Assume that **each high-level step may be implemented in a separate coding session**.
  * For each high-level step, include enough detail so that a developer can work on it without re-reading the entire conversation.
* For **each step**, include:

  * A short **goal/description** (what this step achieves and why it exists).
  * A checklist of **concrete sub-tasks** that specify:

    * Relevant files / folders (e.g. `./app/study/page.tsx`).
    * Components, functions, hooks, or modules to create or modify.
    * Data structures, types, or API endpoints involved.
    * Any important validations, edge cases, or UX concerns.
* Track the status of each step (and its sub-tasks) using these emojis:

  * 🟩 Done
  * 🟨 In Progress
  * 🟥 To Do
* Include **dynamic tracking of overall progress percentage** at the top (e.g. `Overall Progress: 0%` initially).
* Do **NOT** add extra scope or unnecessary complexity beyond explicitly clarified details.
* Steps should be **modular, elegant, minimal**, and integrate seamlessly within the existing codebase.
* This is a **planning-only** document: do not write actual implementation code, only the plan.

Markdown Template Example:

```md
# Feature Implementation Plan — (Example)

**Overall Progress:** `0%`

## Summary

Provide a 2–5 paragraph summary explaining:
- The purpose of the feature.
- How it fits into the existing `./app/(main)/transactions/[id]/` flow.
- Any important constraints, assumptions, or dependencies.

## Tasks

- [ ] 🟥 **Step 1: Setup authentication module**
  - **Goal:** Ensure only authorized users can access transaction details and perform actions.
  - [ ] 🟥 Create `authService` (e.g. `./lib/auth/authService.ts`) to encapsulate auth logic.
  - [ ] 🟥 Implement JWT token generation, verification, and refresh utility functions.
  - [ ] 🟥 Wire up authentication middleware/guard for the relevant routes under `./app/(main)/transactions/[id]/`.
  - [ ] 🟥 Confirm integration with the existing user and session tables in the database schema.

- [ ] 🟥 **Step 2: Develop frontend login UI**
  - **Goal:** Provide a simple, user-friendly login experience integrated with the new auth endpoints.
  - [ ] 🟥 Create `LoginPage` component under `./app/(auth)/login/page.tsx`.
  - [ ] 🟥 Add a login form with fields for email/username and password.
  - [ ] 🟥 Connect the form submit handler to the auth API endpoint.
  - [ ] 🟥 Implement basic client-side validation and display server-side errors.
  - [ ] 🟥 Ensure consistent styling with existing design system/components.

- [ ] 🟥 **Step 3: Add user session management**
  - **Goal:** Maintain secure user sessions and handle login/logout flows gracefully.
  - [ ] 🟥 Configure secure cookies or session storage for auth tokens.
  - [ ] 🟥 Implement logic to restore user session on page load (e.g. in layout or root provider).
  - [ ] 🟥 Add automatic token/session renewal where applicable.
  - [ ] 🟥 Implement logout functionality and clear session state.
  - [ ] 🟥 Handle session expiry with a redirect to login and a helpful message.

...
```

Again, for clarity: it is **not** time to build yet. Just write the clear plan document. No extra complexity or extra scope beyond what we discussed. The plan should lead to simple, elegant, minimal code that does the job perfectly.
