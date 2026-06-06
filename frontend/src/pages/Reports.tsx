import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { Download, Printer, Filter, Database } from 'lucide-react';

export const Reports: React.FC = () => {
  const apiFetch = useAuthStore((state) => state.apiFetch);
  const [reportType, setReportType] = useState('EMPLOYEE');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/analytics/reports?type=${reportType}`);
      setReportData(data.reportData || []);
    } catch (err: any) {
      setError(err.message || 'Error loading report metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  // Export functions
  const convertToCSV = (objArray: any[]) => {
    if (objArray.length === 0) return '';
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    let str = '';
    
    // Header row
    const headers = Object.keys(array[0]).filter(k => typeof array[0][k] !== 'object');
    str += headers.join(',') + '\r\n';

    for (let i = 0; i < array.length; i++) {
      let line = '';
      for (let index in headers) {
        const key = headers[index];
        let val = array[i][key] !== undefined ? array[i][key] : '';
        if (typeof val === 'string') {
          // Escape quotes
          val = `"${val.replace(/"/g, '""')}"`;
        }
        line += val + ',';
      }
      str += line.slice(0, -1) + '\r\n';
    }
    return str;
  };

  const handleExportCSV = () => {
    const csvContent = convertToCSV(reportData);
    if (!csvContent) {
      alert('No data to export');
      return;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pulse_${reportType.toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pulse_${reportType.toLowerCase()}_report.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 p-8 bg-slate-900 min-h-screen overflow-y-auto print:bg-white print:text-black">
      
      {/* Header (Hidden on print) */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center gap-2">
            <span>Corporate Analytics Reports</span>
          </h1>
          <p className="text-slate-400 mt-1">Generate raw audits, filter logs, and download CSV/JSON/PDF exports.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <Database className="h-4 w-4" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-lg shadow-violet-500/10"
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </header>

      {/* Select Report Type (Hidden on print) */}
      <div className="p-4 rounded-3xl bg-slate-800/40 border border-slate-850 mb-8 flex items-center gap-4 print:hidden">
        <Filter className="h-5 w-5 text-slate-500" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Report Module:</span>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-slate-300 text-sm focus:border-violet-500 outline-none cursor-pointer"
          >
            <option value="EMPLOYEE">Employees Census Report</option>
            <option value="ATTENDANCE">Attendance History Report</option>
            <option value="PERFORMANCE">Performance Review Report</option>
            <option value="PROJECT">Active Projects Report</option>
            <option value="DEPARTMENT">Departments census Report</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 text-rose-400 text-sm font-medium mb-6 print:hidden">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20 print:hidden">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        /* Printable Report Layout */
        <div className="bg-slate-800/20 border border-slate-850 rounded-3xl overflow-hidden p-6 print:border-none print:p-0 print:bg-transparent">
          
          {/* Printable Report Header */}
          <div className="hidden print:flex justify-between items-center mb-8 border-b-2 border-slate-300 pb-4">
            <div>
              <h1 className="text-2xl font-bold text-black uppercase tracking-wide">PULSE CORPORATE REPORT</h1>
              <p className="text-xs text-slate-600 mt-1">Module: {reportType} REPORT</p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p>Generated At: {new Date().toLocaleDateString()}</p>
              <p>Confidential Internal Use Only</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            
            {/* 1. EMPLOYEE REPORT TABLE */}
            {reportType === 'EMPLOYEE' && (
              <table className="w-full text-left border-collapse print:text-black">
                <thead>
                  <tr className="border-b border-slate-850 text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-950/20 print:border-b-2 print:border-slate-300 print:text-slate-800">
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Joining Date</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((emp) => (
                    <tr key={emp.id} className="border-b border-slate-850/40 text-xs text-slate-300 print:border-slate-200 print:text-black">
                      <td className="p-3 font-semibold text-slate-100 print:text-black">{emp.name}</td>
                      <td className="p-3">{emp.user?.email}</td>
                      <td className="p-3">{emp.department?.name || 'N/A'}</td>
                      <td className="p-3">{emp.designation || 'Staff'}</td>
                      <td className="p-3">{new Date(emp.dateOfJoining).toLocaleDateString()}</td>
                      <td className="p-3 text-center">
                        <span className="font-bold">{emp.employmentStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 2. ATTENDANCE REPORT TABLE */}
            {reportType === 'ATTENDANCE' && (
              <table className="w-full text-left border-collapse print:text-black">
                <thead>
                  <tr className="border-b border-slate-850 text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-950/20 print:border-b-2 print:border-slate-300 print:text-slate-800">
                    <th className="p-3">Date</th>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Clock In</th>
                    <th className="p-3">Clock Out</th>
                    <th className="p-3">Work Hours</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((att) => (
                    <tr key={att.id} className="border-b border-slate-850/40 text-xs text-slate-300 print:border-slate-200 print:text-black">
                      <td className="p-3 font-semibold text-slate-100 print:text-black">{new Date(att.date).toLocaleDateString()}</td>
                      <td className="p-3">{att.employee.name}</td>
                      <td className="p-3">{new Date(att.clockIn).toLocaleTimeString()}</td>
                      <td className="p-3">{att.clockOut ? new Date(att.clockOut).toLocaleTimeString() : '--'}</td>
                      <td className="p-3">{att.workHours || 0} Hrs</td>
                      <td className="p-3 text-center">
                        <span className="font-bold">{att.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 3. PERFORMANCE REPORT TABLE */}
            {reportType === 'PERFORMANCE' && (
              <table className="w-full text-left border-collapse print:text-black">
                <thead>
                  <tr className="border-b border-slate-850 text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-950/20 print:border-b-2 print:border-slate-300 print:text-slate-800">
                    <th className="p-3">Period</th>
                    <th className="p-3">Reviewee</th>
                    <th className="p-3">Evaluated By</th>
                    <th className="p-3 text-center">Skills Score</th>
                    <th className="p-3 text-center">Overall Rating</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((rev) => (
                    <tr key={rev.id} className="border-b border-slate-850/40 text-xs text-slate-300 print:border-slate-200 print:text-black">
                      <td className="p-3 font-semibold text-slate-100 print:text-black">{rev.period}</td>
                      <td className="p-3">{rev.reviewee.name}</td>
                      <td className="p-3">{rev.reviewer.name}</td>
                      <td className="p-3 text-center">
                        T:{rev.technicalSkills} | C:{rev.communication} | TW:{rev.teamwork} | P:{rev.problemSolving} | L:{rev.leadership}
                      </td>
                      <td className="p-3 text-center font-bold text-violet-400 print:text-black">{rev.overallRating} / 5</td>
                      <td className="p-3 text-center">
                        <span className="font-bold">{rev.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 4. PROJECT REPORT TABLE */}
            {reportType === 'PROJECT' && (
              <table className="w-full text-left border-collapse print:text-black">
                <thead>
                  <tr className="border-b border-slate-850 text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-950/20 print:border-b-2 print:border-slate-300 print:text-slate-800">
                    <th className="p-3">Project Name</th>
                    <th className="p-3">Lead Lead</th>
                    <th className="p-3">Dates</th>
                    <th className="p-3 text-center">Members</th>
                    <th className="p-3 text-center">Tasks</th>
                    <th className="p-3 text-center">Priority</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((proj) => (
                    <tr key={proj.id} className="border-b border-slate-850/40 text-xs text-slate-300 print:border-slate-200 print:text-black">
                      <td className="p-3 font-semibold text-slate-100 print:text-black">{proj.name}</td>
                      <td className="p-3">{proj.manager?.name || 'Unassigned'}</td>
                      <td className="p-3 text-xs">{new Date(proj.startDate).toLocaleDateString()} - {proj.endDate ? new Date(proj.endDate).toLocaleDateString() : 'Continuous'}</td>
                      <td className="p-3 text-center">{proj._count?.members || 0}</td>
                      <td className="p-3 text-center">{proj._count?.tasks || 0}</td>
                      <td className="p-3 text-center">
                        <span className="font-bold">{proj.priority}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-bold">{proj.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* 5. DEPARTMENT REPORT TABLE */}
            {reportType === 'DEPARTMENT' && (
              <table className="w-full text-left border-collapse print:text-black">
                <thead>
                  <tr className="border-b border-slate-850 text-xs text-slate-400 font-bold uppercase tracking-wider bg-slate-950/20 print:border-b-2 print:border-slate-300 print:text-slate-800">
                    <th className="p-3">Department Name</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-center">Total Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((dept) => (
                    <tr key={dept.id} className="border-b border-slate-850/40 text-xs text-slate-300 print:border-slate-200 print:text-black">
                      <td className="p-3 font-semibold text-slate-100 print:text-black">{dept.name}</td>
                      <td className="p-3 max-w-sm truncate">{dept.description || 'No description'}</td>
                      <td className="p-3 text-center font-bold">{dept._count?.employees || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          </div>

          {reportData.length === 0 && (
            <div className="py-20 text-center text-slate-500">
              No report logs generated for current selection.
            </div>
          )}

        </div>
      )}

    </div>
  );
};
