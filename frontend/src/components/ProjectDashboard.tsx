import React, { useEffect, useState } from "react";
import { Project, Task } from "../types";
import { projectsApi } from "../api/projects";
import { useUIStore } from "../store/useStore";
import { fetchTasks } from "../api";

export const ProjectDashboard: React.FC = () => {
  const { currentProjectId, setCurrentProjectId } = useUIStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [loading, setLoading] = useState(false);

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
    try {
      const list = await projectsApi.list();
      setProjects(list);
    } catch (e) {
      console.error(e);
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

  const handleCreateProject = async () => {
    if (!newProjectName) return;
    setLoading(true);
    try {
      const p = await projectsApi.create(newProjectName);
      setProjects([...projects, p]);
      setNewProjectName("");
      setCurrentProjectId(p.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-gray-900 text-white">
      <div className="flex gap-4 h-full">
        {/* Sidebar / List */}
        <div className="w-1/4 border-r border-gray-700 pr-4">
          <h2 className="text-xl font-bold mb-4">Projects</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="New project name"
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 flex-1 text-sm"
            />
            <button
              onClick={handleCreateProject}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-sm"
            >
              +
            </button>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => setCurrentProjectId(p.id)}
                className={`p-2 rounded cursor-pointer ${
                  currentProjectId === p.id ? "bg-gray-700" : "hover:bg-gray-800"
                }`}
              >
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-gray-400">{p.status}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 pl-4">
          {currentProjectId ? (
            <>
              <h2 className="text-xl font-bold mb-4">
                {projects.find((p) => p.id === currentProjectId)?.name} Tasks
              </h2>
              <div className="space-y-2">
                {tasks.length === 0 && <p className="text-gray-500">No tasks found.</p>}
                {tasks.map((task) => (
                    <div key={task.id} className="bg-gray-800 p-3 rounded flex justify-between items-center border border-gray-700">
                      <div>
                        <div className="font-bold">{task.goal}</div>
                        <div className="text-sm text-gray-400">Status: {task.status} | Steps: {task.current_step ?? 0} / {task.plan?.length ?? 0}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {task.updatedAt ? new Date(task.updatedAt).toLocaleTimeString() : ""}
                      </div>
                    </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a project to view tasks
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
