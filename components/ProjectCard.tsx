'use client';

import Link from 'next/link';
import { Doc } from '@/convex/_generated/dataModel';
import { Folder, ArrowRight } from 'lucide-react';

interface ProjectCardProps {
  project: Doc<"projects">;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project._id}`} className="block group">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors h-full flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">
            {project.icon || <Folder className="h-5 w-5 text-slate-500" />}
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            project.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            project.status === 'idea' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {project.status}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-500 transition-colors">
          {project.name}
        </h3>
        
        <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1">
          {project.description || "No description provided."}
        </p>

        <div className="flex items-center text-sm text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View Project <ArrowRight className="ml-1 h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
