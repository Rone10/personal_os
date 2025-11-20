UI Design Specification: Personal OS

1. Design Philosophy

"The Cockpit"
The interface is designed for high-frequency daily use by a developer. It prioritizes information density over whitespace, speed over animation, and keyboard accessibility over mouse interaction.

Visual Style: "Clean Industrial." Muted slate grays, crisp borders, and purposeful use of color only to indicate status or context.

Mode: Dark Mode First (optimized for long coding sessions). Light mode is supported but secondary.

Interaction Model: Optimistic UI. Clicking a checkbox should feel instant.

Typography:

UI: Inter or Geist Sans (Clean, readable, neutral).

Code/Bugs: JetBrains Mono or Fira Code (Ligatures support).

Arabic/Quran: Noto Sans Arabic or Amiri (Must be legible at small sizes).

2. Design Tokens

2.1 Color Palette (Tailwind Slate)

We rely heavily on the slate scale for neutral UI elements to avoid the harshness of pure black/gray.

Role

Light Mode (Tailwind)

Dark Mode (Tailwind)

Usage

Background

slate-50

slate-950

Main app background

Surface

white

slate-900

Cards, Sidebar, Modals

Border

slate-200

slate-800

Separators, inputs

Text Main

slate-900

slate-50

Headings, primary data

Text Muted

slate-500

slate-400

Metadata, labels

2.2 Semantic Accents

Each domain within the OS has a distinct color identity to aid rapid scanning.

Tasks (Blue): blue-500 (Focus, Action)

Study/Quran (Emerald): emerald-500 (Growth, Nature, Traditional Islamic color)

Bugs (Orange/Red): orange-500 (Warning, Heat)

Prompts (Purple): purple-500 (Magic, AI, Creative)

Ideas (Yellow): yellow-500 (Lightbulb, Spark)

3. Layout & Chrome

3.1 The Sidebar (Desktop)

Width: Fixed 256px (w-64).

Behavior: Sticky, full height.

Structure:

Brand/User: Top left.

Global Nav: Dashboard, Tasks, Study, Prompts, Bugs.

Contexts/Projects: Scrollable list of active projects with colored dot indicators.

Footer: Search trigger (⌘K) and User Profile.

3.2 The Global Command Palette (CMDK)

Trigger: ⌘K (Mac) or Ctrl+K (Windows).

Appearance: Centered modal, backdrop blur (bg-slate-950/50).

Visuals: No header, large input field, list of results below.

Result Items: Icon + Label + Shortcut hint on the right.

4. Page-Specific Layouts

4.1 Dashboard (/)

Layout: Masonry-style or CSS Grid.

Hero Section: "Good Morning" greeting + Quick Stats row.

Widget: Today's Focus:

List view.

Checkbox on left.

Project label (small pill) on right.

Widget: Recent Vocab:

Horizontal cards or compact list.

Arabic text must be text-lg (larger than English) for readability.

4.2 Project Hub (/projects)

Grid: Responsive cards (grid-cols-1 md:grid-cols-3).

Card Anatomy:

Header: Project Icon + Title.

Body: Progress bar (Tasks Done / Total).

Footer: "3 Active Bugs" (clickable link).

4.3 Project Detail (/projects/[id])

Header: Title, Status Badge, "Archive" button.

Layout: 3-Column Board (Kanban) OR List View (toggleable).

Tabs:

Tasks: The main view.

Bugs: Filtered list of open bugs for this project.

Notes: Markdown editor/viewer.

4.4 Study Center (/study)

Layout: Split View.

Left (List): Filterable list of vocab words (search by root).

Right (Preview/Flashcard): Large card centered.

Flashcard Design:

Front: Large Arabic Text (text-4xl).

Back: Meaning, Root, Transliteration, Example sentence.

Controls: "Hard", "Good", "Easy" buttons (Spaced Repetition).

4.5 Prompt Library (/prompts)

Layout: Sidebar-List + Main-Detail.

List: Compact items (Title + Tags).

Detail: Large code block area with syntax highlighting.

Actions: "Copy to Clipboard" (Primary), "Edit" (Secondary).

5. Component Specs

5.1 Buttons

Primary: bg-slate-900 text-white hover:bg-slate-800 (Dark: bg-white text-slate-900).

Ghost: text-slate-600 hover:bg-slate-100.

Destructive: text-red-600 hover:bg-red-50.

5.2 Inputs

Style: Minimal border, no shadow.

Focus: ring-2 ring-blue-500/20 border-blue-500.

5.3 Tags/Badges

Design: Rounded-md, px-2 py-0.5, text-xs font-medium.

Colors: Background should be bg-{color}-100, text text-{color}-700.

5.4 Arabic Text Containers

Class: font-arabic text-right dir-rtl.

Sizing: Always text-lg or text-xl when equivalent English is text-sm or text-base.

6. Animation & feedback

Task Completion: When checked, line-through animates in, opacity drops to 50%.

Page Transitions: Subtle fade-in (animate-in fade-in duration-300).

Hover: Instant color shift, no slow drifts for interactive elements.