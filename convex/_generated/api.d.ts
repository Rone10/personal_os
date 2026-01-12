/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib_arabic from "../_lib/arabic.js";
import type * as bugs from "../bugs.js";
import type * as features from "../features.js";
import type * as projects from "../projects.js";
import type * as prompts from "../prompts.js";
import type * as study__helpers from "../study/_helpers.js";
import type * as study_backlinks from "../study/backlinks.js";
import type * as study_books from "../study/books.js";
import type * as study_courses from "../study/courses.js";
import type * as study_explanations from "../study/explanations.js";
import type * as study_hadiths from "../study/hadiths.js";
import type * as study_notes from "../study/notes.js";
import type * as study_roots from "../study/roots.js";
import type * as study_search from "../study/search.js";
import type * as study_tags from "../study/tags.js";
import type * as study_verses from "../study/verses.js";
import type * as study_words from "../study/words.js";
import type * as tasks from "../tasks.js";
import type * as todos from "../todos.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_lib/arabic": typeof _lib_arabic;
  bugs: typeof bugs;
  features: typeof features;
  projects: typeof projects;
  prompts: typeof prompts;
  "study/_helpers": typeof study__helpers;
  "study/backlinks": typeof study_backlinks;
  "study/books": typeof study_books;
  "study/courses": typeof study_courses;
  "study/explanations": typeof study_explanations;
  "study/hadiths": typeof study_hadiths;
  "study/notes": typeof study_notes;
  "study/roots": typeof study_roots;
  "study/search": typeof study_search;
  "study/tags": typeof study_tags;
  "study/verses": typeof study_verses;
  "study/words": typeof study_words;
  tasks: typeof tasks;
  todos: typeof todos;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
