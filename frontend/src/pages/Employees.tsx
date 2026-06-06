import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { 
  Search, 
  UserPlus, 
  Trash2, 
  Edit, 
  X, 
  Briefcase, 
  Mail, 
  UserCheck,
  Phone,
  Calendar,
  Building,
  FileSpreadsheet
} from 'lucide-react';

export const Employees: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const apiFetch = useAuthStore((state) => state.apiFetch);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filtering
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal forms
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('EMPLOYEE');
  const [formDeptId, setFormDeptId] = useState('');
  const [formDesig, setFormDesig] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [formManagerId, setFormManagerId] = useState('');

  const fetchEmployeesList = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('limit', '15');
      if (search) queryParams.append('search', search);
      if (roleFilter) queryParams.append('role', roleFilter);
      if (deptFilter) queryParams.append('departmentId', deptFilter);
      if (statusFilter) queryParams.append('status', statusFilter);

      const data = await apiFetch(`/employees?${queryParams.toString()}`);
      setEmployees(data.employees);
      setTotalPages(data.meta.pages);
    } catch (err: any) {
      setError(err.message || 'Error loading employee census directory');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiltersData = async () => {
    try {
      const depts = await apiFetch('/departments');
      setDepartments(depts);
      
      const mgrs = await apiFetch('/employees/managers');
      setManagers(mgrs);
    } catch (err) {
      console.error('Error fetching departments/managers:', err);
    }
  };

  useEffect(() => {
    fetchEmployeesList();
  }, [search, roleFilter, deptFilter, statusFilter, page]);

  useEffect(() => {
    fetchFiltersData();
  }, []);

  const handleOpenCreate = () => {
    setEditId(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('EMPLOYEE');
    setFormDeptId('');
    setFormDesig('');
    setFormContact('');
    setFormStatus('ACTIVE');
    setFormManagerId('');
    setShowModal(true);
  };

  const handleOpenEdit = (emp: any) => {
    setEditId(emp.id);
    setFormName(emp.name);
    setFormEmail(emp.user?.email || '');
    setFormPassword('');
    setFormRole(emp.user?.role || 'EMPLOYEE');
    setFormDeptId(emp.departmentId || '');
    setFormDesig(emp.designation || '');
    setFormContact(emp.contactNumber || '');
    setFormStatus(emp.employmentStatus);
    setFormManagerId(emp.managerId || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {
      name: formName,
      email: formEmail,
      role: formRole,
      departmentId: formDeptId || undefined,
      designation: formDesig || undefined,
      contactNumber: formContact || undefined,
      employmentStatus: formStatus,
      managerId: formManagerId || undefined,
    };

    try {
      if (editId) {
        await apiFetch(`/employees/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        if (!formPassword) {
          alert('Password is required for new accounts');
          return;
        }
        await apiFetch('/employees', {
          method: 'POST',
          body: JSON.stringify({ ...payload, password: formPassword }),
        });
      }

      setShowModal(false);
      fetchEmployeesList();
      fetchFiltersData(); // Refresh manager dropdown
    } catch (err: any) {
      alert(err.message || 'Error saving employee details');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this employee profile? Credentials will be deleted.')) return;

    try {
      await apiFetch(`/employees/${id}`, { method: 'DELETE' });
      fetchEmployeesList();
    } catch (err: any) {
      alert(err.message || 'Error deleting employee');
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        let parsedEmployees: any[] = [];

        if (file.name.endsWith('.json')) {
          parsedEmployees = JSON.parse(text);
        } else {
          // Robust manual CSV parsing
          const lines = text.split('\n');
          if (lines.length < 2) {
            alert('CSV file is empty or missing headers');
            return;
          }
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const emp: any = {};
            headers.forEach((header, idx) => {
              emp[header] = values[idx] || '';
            });
            parsedEmployees.push(emp);
          }
        }

        if (parsedEmployees.length === 0) {
          alert('No employee records found in file');
          return;
        }

        const res = await apiFetch('/employees/bulk-import', {
          method: 'POST',
          body: JSON.stringify({ employees: parsedEmployees }),
        });

        alert(`Bulk Import completed!\nSuccess: ${res.results.success}\nFailed: ${res.results.failed}\nErrors:\n${res.results.errors.join('\n')}`);
        fetchEmployeesList();
      } catch (err: any) {
        alert('Failed to parse bulk onboarding file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (loading && employees.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 min-h-screen text-slate-400">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto">
      
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">Staff Census Directory</h1>
          <p className="text-slate-400 mt-1">Onboard staff, assign managers, configure departments, and manage credentials.</p>
        </div>
        
        {user?.role === 'ADMIN' && (
          <div className="flex gap-3">
            <input
              id="bulk-import-input"
              type="file"
              accept=".csv,.json"
              onChange={handleBulkImport}
              className="hidden"
            />
            <button
              onClick={() => document.getElementById('bulk-import-input')?.click()}
              className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 hover:border-slate-600 rounded-2xl font-semibold text-sm transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4.5 w-4.5 text-violet-400" />
              <span>Bulk Import</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm transition-all shadow-lg shadow-violet-500/10 cursor-pointer"
            >
              <UserPlus className="h-4.5 w-4.5" />
              <span>Add Employee</span>
            </button>
          </div>
        )}
      </header>

      {/* Advanced Filters */}
      <div className="p-4 rounded-3xl bg-slate-800/40 border border-slate-850 mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, designation..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-800/80 rounded-2xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-100 text-xs outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Department select */}
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-xs outline-none cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Role select */}
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-xs outline-none cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="EMPLOYEE">Employees</option>
              <option value="MANAGER">Managers</option>
              <option value="ADMIN">Admins</option>
            </select>

            {/* Status select */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-xs outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="TERMINATED">TERMINATED</option>
            </select>
          </div>
        </div>

        {/* Pagination buttons */}
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-4 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl disabled:opacity-30 cursor-pointer"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-4 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl disabled:opacity-30 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-400 text-sm font-medium mb-6">
          {error}
        </div>
      )}

      {/* Grid table */}
      <div className="bg-slate-800/20 border border-slate-850 rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-950/40">
                <th className="p-4">Name</th>
                <th className="p-4">Department / Designation</th>
                <th className="p-4">Role</th>
                <th className="p-4">Contact & Joining</th>
                <th className="p-4">Manager</th>
                <th className="p-4 text-center">Status</th>
                {user?.role === 'ADMIN' && <th className="p-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-800/50 hover:bg-slate-800/10 text-sm text-slate-300 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-violet-400 border border-slate-700/80">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-100 block">{emp.name}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-600" />
                          <span>{emp.user?.email}</span>
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <span className="font-semibold text-slate-200 block flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-slate-500" />
                        <span>{emp.department?.name || 'N/A'}</span>
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                        <span>{emp.designation || 'Staff'}</span>
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] px-2 py-0.5 font-bold uppercase rounded border bg-slate-850 text-slate-400 border-slate-700">
                      {emp.user?.role}
                    </span>
                  </td>
                  <td className="p-4 text-xs">
                    <div>
                      <span className="text-slate-300 block flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                        <span>{emp.contactNumber || 'No Contact'}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>Joined: {new Date(emp.dateOfJoining).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-xs">
                    {emp.manager ? (
                      <div>
                        <span className="font-semibold text-slate-300 block">{emp.manager.name}</span>
                        <span className="text-[10px] text-slate-500 block">{emp.manager.designation}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 italic">No Manager</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <span className={`inline-block text-[9px] px-2 py-0.5 font-bold uppercase rounded border ${
                        emp.employmentStatus === 'ACTIVE'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-900'
                          : emp.employmentStatus === 'INACTIVE'
                            ? 'bg-slate-850 text-slate-400 border-slate-700'
                            : 'bg-rose-950 text-rose-450 border-rose-900'
                      }`}>
                        {emp.employmentStatus}
                      </span>
                    </div>
                  </td>
                  {user?.role === 'ADMIN' && (
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 rounded-lg border border-slate-700 hover:border-violet-500 bg-slate-900/60 hover:bg-violet-950/20 text-slate-400 hover:text-violet-400 transition-all cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="p-1.5 rounded-lg border border-slate-700 hover:border-rose-500 bg-slate-900/60 hover:bg-rose-950/20 text-slate-400 hover:text-rose-450 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute right-6 top-6 text-slate-500 hover:text-slate-300 cursor-pointer">
              <X className="h-6 w-6" />
            </button>

            <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <UserCheck className="h-5.5 w-5.5 text-violet-400" />
              <span>{editId ? 'Edit Employee Profile' : 'Onboard Employee'}</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-100 text-sm outline-none"
                    placeholder="Jessica Alba"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-100 text-sm outline-none"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {!editId && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-100 text-sm outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Number</label>
                  <input
                    type="text"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-100 text-sm outline-none"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-350 text-sm outline-none cursor-pointer"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</label>
                  <select
                    value={formDeptId}
                    onChange={(e) => setFormDeptId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-350 text-sm outline-none cursor-pointer"
                  >
                    <option value="">No Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Designation</label>
                  <input
                    type="text"
                    value={formDesig}
                    onChange={(e) => setFormDesig(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-100 text-sm outline-none"
                    placeholder="e.g. Lead Architect"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Manager</label>
                  <select
                    value={formManagerId}
                    onChange={(e) => setFormManagerId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-350 text-sm outline-none cursor-pointer"
                  >
                    <option value="">No Manager</option>
                    {managers
                      .filter((m) => m.id !== editId)
                      .map((mgr) => (
                        <option key={mgr.id} value={mgr.id}>
                          {mgr.name} ({mgr.designation})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Employment Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:border-violet-500 text-slate-350 text-sm outline-none cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="TERMINATED">TERMINATED</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold text-sm transition-all shadow-xl shadow-violet-500/10 cursor-pointer mt-4"
              >
                {editId ? 'Update Profile' : 'Onboard Employee'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
