import { useState } from 'react';
import { uploadApi } from '../api.js';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function UploadPage() {
  const { isAuthenticated } = useAuth();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl max-w-lg mx-auto mt-12 shadow-lg">
        <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-red-500 animate-bounce" />
        <h2 className="text-xl font-bold mb-1">Access Denied</h2>
        <p className="text-sm">You must be logged in as an official to access the spreadsheet import page.</p>
      </div>
    );
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await uploadApi.uploadFixtures(file);
      setResult({ type: 'success', data: res.data });
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await uploadApi.downloadTemplate();
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fixturegrid-fixtures-template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download template');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="k-card">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
          Upload Fixtures from Excel
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Upload a .xlsx file with columns: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">time</code>, 
          <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">round</code>, 
          <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">venue</code>, 
          <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">sport</code>, 
          <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">team_a</code>, 
          <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">team_b</code>, 
          <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">scheduled_at</code>
        </p>

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
          <FileSpreadsheet className="mx-auto mb-3 text-gray-400" size={40} />
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="file-input"
          />
          <label htmlFor="file-input" className="cursor-pointer">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              {file ? file.name : 'Click to select an Excel file'}
            </span>
          </label>
          <p className="text-xs text-gray-400 mt-2">Supported: .xlsx, .xls (max 5MB)</p>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="k-btn k-btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Upload size={14} />
            {loading ? 'Uploading...' : 'Upload Fixtures'}
          </button>
          <button
            onClick={downloadTemplate}
            className="k-btn flex items-center gap-2"
          >
            <Download size={14} />
            Download Template
          </button>
        </div>

        {result?.type === 'success' && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
            <CheckCircle size={16} className="text-green-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-700 dark:text-green-400">Upload successful!</p>
              <p className="text-green-600 dark:text-green-500">
                Imported: {result.data.imported} · Skipped: {result.data.skipped}
                {result.data.errors.length > 0 && ` · Errors: ${result.data.errors.length}`}
              </p>
              {result.data.errors.length > 0 && (
                <ul className="mt-2 text-xs text-red-500 space-y-1">
                  {result.data.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {result?.type === 'error' && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-600 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-400">
              <p className="font-medium">Upload failed</p>
              <p>{result.message}</p>
            </div>
          </div>
        )}
      </div>

      <div className="k-card">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Excel Format Guide</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-2 px-2">Column</th>
                <th className="text-left py-2 px-2">Required</th>
                <th className="text-left py-2 px-2">Example</th>
                <th className="text-left py-2 px-2">Notes</th>
              </tr>
            </thead>
            <tbody className="text-gray-500 dark:text-gray-400">
              <tr className="border-b border-gray-100 dark:border-gray-800/50">
                <td className="py-2 px-2 font-mono">time</td>
                <td className="py-2 px-2">No</td>
                <td className="py-2 px-2 font-mono">09:48-09:58</td>
                <td className="py-2 px-2">Display time range</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800/50">
                <td className="py-2 px-2 font-mono">round</td>
                <td className="py-2 px-2">No</td>
                <td className="py-2 px-2 font-mono">R1, SR5, TOW-G2</td>
                <td className="py-2 px-2">Round identifier</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800/50">
                <td className="py-2 px-2 font-mono">venue</td>
                <td className="py-2 px-2">Yes</td>
                <td className="py-2 px-2 font-mono">BB Court, Pitch A</td>
                <td className="py-2 px-2">Auto-creates if missing</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800/50">
                <td className="py-2 px-2 font-mono">sport</td>
                <td className="py-2 px-2">Yes</td>
                <td className="py-2 px-2 font-mono">Basketball, Soccer</td>
                <td className="py-2 px-2">Must exist in database</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800/50">
                <td className="py-2 px-2 font-mono">team_a</td>
                <td className="py-2 px-2">Yes</td>
                <td className="py-2 px-2 font-mono">ZAM, BAR, HAL</td>
                <td className="py-2 px-2">Team code</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800/50">
                <td className="py-2 px-2 font-mono">team_b</td>
                <td className="py-2 px-2">Yes</td>
                <td className="py-2 px-2 font-mono">TOW, All Teams</td>
                <td className="py-2 px-2">Use "All Teams" for track</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800/50">
                <td className="py-2 px-2 font-mono">scheduled_at</td>
                <td className="py-2 px-2">No</td>
                <td className="py-2 px-2 font-mono">2026-08-01T09:48:00</td>
                <td className="py-2 px-2">ISO datetime format</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
