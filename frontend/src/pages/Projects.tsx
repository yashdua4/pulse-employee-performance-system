import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { 
  FolderKanban, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Calendar, 
  Users, 
  User, 
  X, 
  ArrowLeft,
  ChevronsRight
} from 'lucide-react';

export const Projects: React.FC = () => {
  const { user, apiFetch } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected project for Tasks Board
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  
  // Modal toggles
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  // New Project Form states
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projStatus, setProjStatus] = useState('NOT_STARTED');
  const [projPriority, setProjPriority] = useState('MEDIUM');
  const [projManagerId, setProjManagerId] = useState('');
  const [projMemberIds, setProjMemberIds] = useState<string[]>([]);
  const [projStartDate, setProjStartDate] = useState('');
  const [projEndDate, setProjEndDate] = useState('');

  // New Task Form states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/projects');
      setProjects(data);
      if (selectedProject) {
        // Refresh active project details to update task lists
        const freshProj = await apiFetch(`/projects/${selectedProject.id}`);
        setSelectedProject(freshProj);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiFetch('/employees');
      setEmployees(data.employees || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
      fetchEmployees();
    }
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName || !projManagerId) return;

    try {
      await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: projName,
          description: projDesc || undefined,
          status: projStatus,
          priority: projPriority,
          managerId: projManagerId,
          memberIds: projMemberIds,
          startDate: projStartDate || undefined,
          endDate: projEndDate || undefined,
        }),
      });

      setShowProjectModal(false);
      
      // Reset fields
      setProjName('');
      setProjDesc('');
      setProjStatus('NOT_STARTED');
      setProjPriority('MEDIUM');
      setProjManagerId('');
      setProjMemberIds([]);
      setProjStartDate('');
      setProjEndDate('');
      
      fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Error creating project');
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening board
    if (!window.confirm('Are you sure you want to delete this project and all its tasks?')) return;

    try {
      await apiFetch(`/projects/${id}`, { method: 'DELETE' });
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
      fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Error deleting project');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !selectedProject) return;

    try {
      await apiFetch(`/projects/${selectedProject.id}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc || undefined,
          dueDate: taskDueDate || undefined,
          assigneeId: taskAssigneeId || undefined,
        }),
      });

      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskDueDate('');
      setTaskAssigneeId('');

      // Refresh project to load new tasks
      const freshProj = await apiFetch(`/projects/${selectedProject.id}`);
      setSelectedProject(freshProj);
      fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Error creating task');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await apiFetch(`/projects/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      // Refresh current board
      const freshProj = await apiFetch(`/projects/${selectedProject.id}`);
      setSelectedProject(freshProj);
    } catch (err: any) {
      alert(err.message || 'Error updating task status');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await apiFetch(`/projects/tasks/${taskId}`, { method: 'DELETE' });
      const freshProj = await apiFetch(`/projects/${selectedProject.id}`);
      setSelectedProject(freshProj);
      fetchProjects();
    } catch (err: any) {
      alert(err.message || 'Error deleting task');
    }
  };

  const handleToggleMemberSelection = (id: string) => {
    if (projMemberIds.includes(id)) {
      setProjMemberIds(projMemberIds.filter(mid => mid !== id));
    } else {
      setProjMemberIds([...projMemberIds, id]);
    }
  };

  // Open task board view
  const handleSelectProject = async (proj: any) => {
    try {
      const fullProj = await apiFetch(`/projects/${proj.id}`);
      setSelectedProject(fullProj);
    } catch (err: any) {
      alert('Error fetching project tasks board');
    }
  };

  const getTasksByStatus = (status: string) => {
    if (!selectedProject || !selectedProject.tasks) return [];
    return selectedProject.tasks.filter((t: any) => t.status === status);
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 min-h-screen text-slate-400">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto">
      
      {/* 1. KANBAN BOARD VIEW (if project is selected) */}
      {selectedProject ? (
        <div className="space-y-6 animate-fade-in">
          {/* Back button and title */}
          <button 
            onClick={() => setSelectedProject(null)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Projects List</span>
          </button>

          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-100 tracking-tight">{selectedProject.name}</h1>
                <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded bg-violet-950 text-violet-400 border border-violet-850">
                  {selectedProject.status}
                </span>
                <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded border ${
                  selectedProject.priority === 'CRITICAL'
                    ? 'bg-rose-950 text-rose-400 border-rose-800'
                    : selectedProject.priority === 'HIGH'
                      ? 'bg-amber-950 text-amber-400 border-amber-800'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}>
                  {selectedProject.priority}
                </span>
              </div>
              <p className="text-slate-400 mt-2 max-w-2xl text-sm leading-relaxed">{selectedProject.description || 'No description provided.'}</p>
            </div>

            {/* Admin/Manager task creation buttons */}
            {(user?.role === 'ADMIN' || selectedProject.managerId === user?.employee?.id) && (
              <button
                onClick={() => setShowTaskModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-violet-500/10 cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>New Task</span>
              </button>
            )}
          </header>

          {/* Project Details Panel */}
          <div className="p-4 rounded-3xl bg-slate-800/20 border border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-slate-500" />
              <div>
                <span className="text-xs text-slate-500 block">Project Lead</span>
                <span className="font-semibold">{selectedProject.manager?.name || 'Unassigned'}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-slate-500" />
              <div>
                <span className="text-xs text-slate-500 block">Dates</span>
                <span>
                  {new Date(selectedProject.startDate).toLocaleDateString()} - {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : 'Continuous'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-500" />
              <div>
                <span className="text-xs text-slate-500 block">Members</span>
                <span>{selectedProject.members.length} contributors</span>
              </div>
            </div>
          </div>

          {/* Kanban Board Columns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
            
            {/* Column Configs */}
            {[
              { id: 'TO_DO', title: 'To Do', color: 'bg-slate-500/10 text-slate-400 border-slate-800' },
              { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-950' },
              { id: 'IN_REVIEW', title: 'In Review', color: 'bg-amber-500/10 text-amber-400 border-amber-950' },
              { id: 'DONE', title: 'Completed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-950' }
            ].map((col) => {
              const colTasks = getTasksByStatus(col.id);
              return (
                <div key={col.id} className="p-4 rounded-3xl bg-slate-950/45 border border-slate-850 flex flex-col min-h-[500px]">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-slate-300 text-sm">{col.title}</span>
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-800 text-slate-400">{colTasks.length}</span>
                  </div>

                  {/* Task list container */}
                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colTasks.map((task: any) => (
                      <div key={task.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3 relative group">
                        
                        {/* Task headers */}
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-semibold text-slate-200 text-sm leading-snug">{task.title}</h4>
                          
                          {/* Owner options */}
                          {(user?.role === 'ADMIN' || selectedProject.managerId === user?.employee?.id) && (
                            <button 
                              onClick={() => handleDeleteTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-450 transition-all cursor-pointer rounded"
                              title="Delete Task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-xs text-slate-450 line-clamp-2 leading-relaxed">{task.description}</p>
                        )}

                        <hr className="border-slate-850" />

                        {/* Task Assignee / Date */}
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="flex items-center gap-1.5 text-slate-400 bg-slate-950 px-2 py-1 rounded-lg">
                            <User className="h-3 w-3 text-violet-400" />
                            <span className="truncate max-w-[90px]">{task.assignee ? task.assignee.name : 'Unassigned'}</span>
                          </span>

                          {task.dueDate && (
                            <span className="text-slate-500">
                              Due: {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>

                        {/* Status Quick Selector dropdown */}
                        <div className="pt-2">
                          <select
                            value={task.status}
                            onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                            disabled={user?.role === 'EMPLOYEE' && task.assigneeId !== user?.employee?.id}
                            className="w-full bg-slate-950 border border-slate-850 rounded-lg p-1 text-[10px] text-slate-400 outline-none cursor-pointer hover:text-slate-200 disabled:opacity-50"
                          >
                            <option value="TO_DO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="DONE">Completed</option>
                          </select>
                        </div>

                      </div>
                    ))}
                    {colTasks.length === 0 && (
                      <div className="border border-dashed border-slate-850/60 rounded-2xl py-8 text-center text-xs text-slate-650">
                        No tasks
                      </div>
                    )}
                  </div>

                </div>
              );
            })}

          </div>

        </div>
      ) : (
        /* 2. PROJECTS GRID VIEW */
        <div className="space-y-6">
          <header className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black text-slate-100 tracking-tight">Projects board</h1>
              <p className="text-slate-400 mt-1">Select a project to manage task lists, timeline completions and leads.</p>
            </div>

            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
              <button
                onClick={() => setShowProjectModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-violet-500/10 cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                <span>New Project</span>
              </button>
            )}
          </header>

          {/* Project Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => handleSelectProject(proj)}
                className="p-6 rounded-3xl bg-slate-800/30 hover:bg-slate-800/40 border border-slate-850 hover:border-violet-600/50 cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-4 group relative"
              >
                
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-bold text-slate-100 group-hover:text-violet-400 transition-colors text-base leading-snug">{proj.name}</h3>
                    
                    {/* Delete option */}
                    {(user?.role === 'ADMIN' || proj.managerId === user?.employee?.id) && (
                      <button
                        onClick={(e) => handleDeleteProject(proj.id, e)}
                        className="p-1 hover:bg-rose-950/30 rounded border border-transparent hover:border-rose-900 text-slate-500 hover:text-rose-400 cursor-pointer transition-all animate-fade-in"
                        title="Delete Project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-450 mt-2 line-clamp-3 leading-relaxed">
                    {proj.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <hr className="border-slate-850" />
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Lead:</span>
                    <span className="font-semibold text-slate-350">{proj.manager?.name || 'Unassigned'}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Priority:</span>
                    <span className={`font-semibold text-[10px] uppercase px-2 py-0.5 rounded border ${
                      proj.priority === 'CRITICAL' 
                        ? 'bg-rose-950 text-rose-455 border-rose-900' 
                        : proj.priority === 'HIGH' 
                          ? 'bg-amber-950 text-amber-450 border-amber-900' 
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}>
                      {proj.priority}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900/60">
                      {proj.status}
                    </span>

                    <span className="text-xs text-violet-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      <span>Open Board</span>
                      <ChevronsRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>

              </div>
            ))}

            {projects.length === 0 && (
              <div className="col-span-full border-2 border-dashed border-slate-800 rounded-3xl py-16 text-center text-slate-500">
                <FolderKanban className="h-12 w-12 mx-auto text-slate-600 mb-4" />
                <h3 className="font-bold text-slate-450 mb-1">No Projects Scaffolding</h3>
                <p className="text-sm">No active projects found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE PROJECT */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowProjectModal(false)} className="absolute right-6 top-6 text-slate-500 hover:text-slate-300 cursor-pointer">
              <X className="h-6 w-6" />
            </button>

            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <FolderKanban className="h-5.5 w-5.5 text-violet-400" />
              <span>Create SaaS Project</span>
            </h2>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Project Name</label>
                <input
                  type="text"
                  required
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-100 text-sm outline-none"
                  placeholder="Core SaaS Integration"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-100 text-sm outline-none h-16 resize-none"
                  placeholder="Scope details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</label>
                  <select
                    value={projStatus}
                    onChange={(e) => setProjStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-350 text-sm outline-none cursor-pointer"
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority</label>
                  <select
                    value={projPriority}
                    onChange={(e) => setProjPriority(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-350 text-sm outline-none cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Project Lead / Manager</label>
                  <select
                    value={projManagerId}
                    onChange={(e) => setProjManagerId(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-350 text-sm outline-none cursor-pointer"
                  >
                    <option value="">Select Manager</option>
                    {employees
                      .filter((emp) => emp.user?.role === 'MANAGER' || emp.user?.role === 'ADMIN')
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    value={projStartDate}
                    onChange={(e) => setProjStartDate(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-350 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Members selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Assigned Project Members</label>
                <div className="max-h-24 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  {employees
                    .filter((emp) => emp.user?.role === 'EMPLOYEE')
                    .map((emp) => (
                      <label key={emp.id} className="flex items-center gap-3 text-xs text-slate-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={projMemberIds.includes(emp.id)}
                          onChange={() => handleToggleMemberSelection(emp.id)}
                          className="rounded text-violet-650 focus:ring-violet-500/20 bg-slate-900 border-slate-800"
                        />
                        <span>{emp.name} ({emp.designation})</span>
                      </label>
                    ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm transition-all shadow-xl shadow-violet-500/10 cursor-pointer mt-4"
              >
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE TASK */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl relative">
            <button onClick={() => setShowTaskModal(false)} className="absolute right-6 top-6 text-slate-500 hover:text-slate-300 cursor-pointer">
              <X className="h-6 w-6" />
            </button>

            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <CheckSquare className="h-5.5 w-5.5 text-violet-400" />
              <span>Add Project Task</span>
            </h2>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-100 text-sm outline-none"
                  placeholder="Task specifications..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-100 text-sm outline-none h-16 resize-none"
                  placeholder="Task specs/deliverables..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-300 text-sm outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assignee</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-350 text-sm outline-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {selectedProject.members.map((m: any) => (
                      <option key={m.employee.id} value={m.employee.id}>{m.employee.name}</option>
                    ))}
                    <option value={selectedProject.manager?.id}>{selectedProject.manager?.name} (Lead)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm transition-all shadow-xl shadow-violet-500/10 cursor-pointer mt-4"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
