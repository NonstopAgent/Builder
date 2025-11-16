import React, { useEffect, useState } from 'react';
import {
  createSession,
  getSessionState,
  createTask,
  runTask,
  sendMessage,
} from './api';

interface Step {
  description: string;
  status: string;
  result?: string | null;
  logs?: string[];
  error?: string | null;
  metadata?: Record<string, any> | null;
}

interface Task {
  id: number;
  type: string;
  goal: string;
  project_id?: string | null;
  status: string;
  plan: Step[];
  current_step: number;
  logs?: string[];
  error?: string | null;
}

interface MessagePair {
  user: string;
  assistant: string;
}

const App: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState<string>('');
  const [typeInput, setTypeInput] = useState<string>('build');
  const [loading, setLoading] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [messages, setMessages] = useState<MessagePair[]>([]);

  // Initialize a new session
  useEffect(() => {
    async function initSession() {
      const id = await createSession();
      setSessionId(id);
    }
    initSession();
  }, []);

  // Fetch tasks whenever the session ID changes
  useEffect(() => {
    if (!sessionId) return;
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function fetchTasks() {
    if (!sessionId) return;
    const tasksList = await getSessionState(sessionId);
    setTasks(tasksList as Task[]);
  }

  async function handleCreateTask() {
    if (!sessionId || goalInput.trim() === '') return;
    await createTask(sessionId, typeInput, goalInput);
    setGoalInput('');
    await fetchTasks();
  }

  async function handleRunStep(taskId: number) {
    if (!sessionId) return;
    setLoading(true);
    await runTask(sessionId, taskId);
    await fetchTasks();
    setLoading(false);
  }

  async function handleSendChat() {
    if (!sessionId || chatInput.trim() === '') return;
    const res = await sendMessage(sessionId, chatInput);
    setMessages((prev) => [...prev, { user: chatInput, assistant: res.response }]);
    setChatInput('');
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  return (
    <div className="flex h-screen">
      {/* Sidebar: task list and creation form */}
      <aside className="w-1/4 border-r overflow-y-auto bg-gray-50 p-4">
        <h2 className="text-xl font-bold mb-4">Tasks</h2>
        <ul>
          {tasks.map((task) => (
            <li key={task.id} className="mb-2">
              <button
                onClick={() => setSelectedTaskId(task.id)}
                className={`w-full text-left p-2 rounded ${
                  selectedTaskId === task.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-semibold">#{task.id}: {task.goal}</div>
                <div className="text-sm text-gray-600">{task.status}</div>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <h3 className="font-semibold mb-2">New Task</h3>
          <input
            type="text"
            placeholder="Goal"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
          />
          <select
            value={typeInput}
            onChange={(e) => setTypeInput(e.target.value)}
            className="w-full mb-2 p-2 border rounded"
          >
            <option value="build">Build</option>
            <option value="plan">Plan</option>
          </select>
          <button
            onClick={handleCreateTask}
            className="w-full bg-blue-600 text-white p-2 rounded"
          >
            Create Task
          </button>
        </div>
      </aside>

      {/* Main area: task details and chat */}
      <main className="flex-1 p-4 overflow-y-auto">
        {selectedTask ? (
          <div>
            <h2 className="text-2xl font-bold mb-2">Task #{selectedTask.id}</h2>
            <p className="mb-4">{selectedTask.goal}</p>
            <div className="mb-4">
              <h3 className="font-semibold">Plan Steps</h3>
              {selectedTask.plan && selectedTask.plan.length > 0 ? (
                <ul className="list-disc ml-5">
                  {selectedTask.plan.map((step, idx) => (
                    <li key={idx} className="mb-2">
                      <span className={step.status === 'completed' ? 'line-through' : ''}>
                        {step.description}
                      </span>
                      {step.result && (
                        <div className="text-sm text-gray-600">
                          Result: {step.result}
                        </div>
                      )}
                      {step.logs && step.logs.length > 0 && (
                        <details className="text-sm mt-1">
                          <summary className="cursor-pointer text-blue-600">Logs</summary>
                          <ul className="ml-4 list-disc">
                            {step.logs.map((log, li) => (
                              <li key={li}>{log}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                      {step.error && (
                        <div className="text-red-600 text-sm">
                          Error: {step.error}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No plan generated yet.</p>
              )}
              <button
                onClick={() => handleRunStep(selectedTask.id)}
                disabled={loading || selectedTask.status === 'completed'}
                className="mt-3 bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
              >
                {selectedTask.status === 'completed'
                  ? 'Completed'
                  : loading
                  ? 'Running...'
                  : 'Run Next Step'}
              </button>
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Chat</h3>
              <div className="h-40 overflow-y-auto border p-2 mb-2 bg-white rounded">
                {messages.map((m, idx) => (
                  <div key={idx} className="mb-3">
                    <div className="font-semibold">You:</div>
                    <p className="mb-1">{m.user}</p>
                    <div className="font-semibold">Assistant:</div>
                    <p>{m.assistant}</p>
                  </div>
                ))}
              </div>
                <input
                  type="text"
                  placeholder="Say something..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="w-full mb-2 p-2 border rounded"
                />
                <button
                  onClick={handleSendChat}
                  className="w-full bg-purple-600 text-white p-2 rounded"
                >
                  Send
                </button>
            </div>
          </div>
        ) : (
          <p>Select a task from the left to view details.</p>
        )}
      </main>
    </div>
  );
};

export default App;
