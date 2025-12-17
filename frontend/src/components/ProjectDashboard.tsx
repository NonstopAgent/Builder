import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FolderKanban,
  Code,
  Database,
  Globe,
  Terminal,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Project, Task } from "../types";
import { projectsApi } from "../api/projects";
import { useUIStore } from "../store/useStore";
import clsx from "clsx";

// Project templates
const PROJECT_TEMPLATES = [
  {
    id: "react-app",
    name: "React App",
    description: "A modern React application with TypeScript and Vite",
    icon: Code,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "fastapi-backend",
    name: "FastAPI Backend",
    description: "Python FastAPI server with async support",
    icon: Database,
    color: "from-green-500 to-emerald-500",
  },
  {
    id: "nextjs-site",
    name: "Next.js Site",
    description: "Full-stack Next.js application",
    icon: Globe,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "python-cli",
    name: "Python CLI",
    description: "Command-line tool with Click",
    icon: Terminal,
    color: "from-orange-500 to-red-500",
  },
];

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { icon: React.ElementType; color: string }> = {
    active: { icon: CheckCircle2, color: "text-green-400 bg-green-400/10" },
    in_progress: { icon: Loader2, color: "text-blue-400 bg-blue-400/10" },
    pending: { icon: Clock, color: "text-yellow-400 bg-yellow-400/10" },
    completed: { icon: CheckCircle2, color: "text-green-400 bg-green-400/10" },
    failed: { icon: AlertCircle, color: "text-red-400 bg-red-400/10" },
    queued: { icon: Clock, color: "text-slate-400 bg-slate-400/10" },
    archived: { icon: Clock, color: "text-slate-500 bg-slate-500/10" },
  };

  const { icon: Icon, color } = config[status] || config.pending;

  return (
    <span className={clsx("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs", color)}>
      <Icon size={12} className={status === "in_progress" ? "animate-spin" : ""} />
      {status.replace("_", " ")}
    </span>
  );
};

// Project card component
const ProjectCard = ({
  project,
  isSelected,
  taskCount,
  onClick,
  onDelete,
}: {
  project: Project;
  isSelected: boolean;
  taskCount: number;
  onClick: () => void;
  onDelete: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={clsx(
        "relative p-4 rounded-xl cursor-pointer transition-all group",
        isSelected
          ? "bg-gradient-to-br from-sky-500/20 to-blue-600/20 border-2 border-sky-500/50 shadow-lg shadow-sky-500/10"
          : "bg-slate-800/60 border border-slate-700/50 hover:border-slate-600"
      )}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete project"
      >
        <Trash2 size={14} />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <FolderKanban size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-100 truncate">{project.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {project.description || "No description"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{taskCount} tasks</span>
        </div>
        <StatusBadge status={project.status} />
      </div>
    </motion.div>
  );
};

// Task card component
const TaskCard = ({ task }: { task: Task }) => {
  const progress = task.steps
    ? Math.round((task.steps.filter((s) => s.status === "completed").length / task.steps.length) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800/60 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-slate-100 truncate">{task.goal}</h4>
          <p className="text-xs text-slate-500 mt-1">
            {task.steps?.length || 0} steps
            {task.updatedAt && ` • Updated ${new Date(task.updatedAt).toLocaleTimeString()}`}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      {/* Progress bar */}
      {task.steps && task.steps.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

// New project modal
const NewProjectModal = ({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, template?: string) => void;
}) => {
  const [name, setName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), selectedTemplate || undefined);
      setName("");
      setSelectedTemplate(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Sparkles className="text-sky-400" size={24} />
          Create New Project
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Project"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Start from Template (Optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PROJECT_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() =>
                      setSelectedTemplate(
                        selectedTemplate === template.id ? null : template.id
                      )
                    }
                    className={clsx(
                      "text-left p-3 rounded-xl border transition-all",
                      selectedTemplate === template.id
                        ? "border-sky-500 bg-sky-500/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    )}
                  >
                    <div
                      className={clsx(
                        "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2",
                        template.color
                      )}
                    >
                      <Icon size={20} className="text-white" />
                    </div>
                    <h3 className="font-medium text-slate-100 text-sm">
                      {template.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {template.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white font-medium hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Create Project
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Main ProjectDashboard component
export const ProjectDashboard: React.FC = () => {
  const { currentProjectId, setCurrentProjectId } = useUIStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (currentProjectId) {
      loadTasks(currentProjectId);
    } else {
      setTasks([]);
    }
  }, [currentProjectId]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await projectsApi.list();
      setProjects(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (projectId: string) => {
    try {
      const list = await projectsApi.getTasks(projectId);
      setTasks(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateProject = useCallback(async (name: string, template?: string) => {
    try {
      const p = await projectsApi.create(name, template ? `Created from ${template} template` : undefined);
      setProjects((prev) => [p, ...prev]);
      setCurrentProjectId(p.id);
    } catch (e) {
      console.error(e);
    }
  }, [setCurrentProjectId]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    // In a real app, you'd call an API to delete the project
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (currentProjectId === projectId) {
      setCurrentProjectId(undefined);
    }
  }, [currentProjectId, setCurrentProjectId]);

  const selectedProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div className="h-full flex bg-slate-950">
      {/* Projects Sidebar */}
      <div className="w-80 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <FolderKanban size={20} className="text-sky-400" />
              Projects
            </h2>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="p-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white transition-colors"
              title="New Project"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && projects.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <Loader2 className="animate-spin mr-2" size={20} />
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderKanban size={48} className="mx-auto text-slate-700 mb-3" />
              <p className="text-slate-400 text-sm mb-4">No projects yet</p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm transition-colors"
              >
                Create your first project
              </button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isSelected={currentProjectId === project.id}
                  taskCount={currentProjectId === project.id ? tasks.length : 0}
                  onClick={() => setCurrentProjectId(project.id)}
                  onDelete={() => handleDeleteProject(project.id)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedProject ? (
          <>
            {/* Project Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                  <FolderKanban size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">
                    {selectedProject.name}
                  </h1>
                  <p className="text-sm text-slate-400">
                    {selectedProject.description || "No description"}
                  </p>
                </div>
              </div>
            </div>

            {/* Tasks Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-200">Tasks</h2>
                <span className="text-sm text-slate-400">
                  {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                </span>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-slate-600" />
                  </div>
                  <p className="text-slate-400 mb-2">No tasks in this project</p>
                  <p className="text-sm text-slate-500">
                    Go to the Chat view to create tasks for this project
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {tasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <ChevronRight size={40} className="text-slate-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-300 mb-2">
                Select a project
              </h2>
              <p className="text-slate-500 mb-6">
                Choose a project from the sidebar to view its tasks
              </p>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Plus size={18} />
                Create New Project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <AnimatePresence>
        {showNewProjectModal && (
          <NewProjectModal
            isOpen={showNewProjectModal}
            onClose={() => setShowNewProjectModal(false)}
            onCreate={handleCreateProject}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
