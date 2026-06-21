// src/pages/DocumentDetailPage.jsx
import { useEffect, useState, useRef } from 'react';
import { useParams, Link }             from 'react-router-dom';
import api                             from '../api/axios';
import Navbar                          from '../components/Navbar';
import { useAuth }                     from '../context/AuthContext';
import { exportAuditTrailPDF, exportAuditTrailCSV } from '../utils/exportUtils';

const formatFileSize = (bytes) => {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (type) => {
  if (type === 'application/pdf')  return '📄';
  if (type?.includes('word'))      return '📝';
  if (type?.includes('sheet'))     return '📊';
  if (type?.startsWith('image/'))  return '🖼️';
  return '📎';
};

const statusBadge = (status) => ({
  'Created':    'bg-gray-100 text-gray-700',
  'In Transit': 'bg-yellow-100 text-yellow-800',
  'Received':   'bg-blue-100 text-blue-800',
  'Completed':  'bg-green-100 text-green-800',
}[status] || 'bg-gray-100 text-gray-600');

const urgencyBadge = (urgency) => ({
  'Normal':        'bg-gray-100 text-gray-600',
  'Urgent':        'bg-yellow-100 text-yellow-700',
  'Highly Urgent': 'bg-red-100 text-red-700',
}[urgency] || 'bg-gray-100 text-gray-600');

const dueBadge = (due_status, due_date) => {
  if (!due_date) return null;
  if (due_status === 'overdue')  return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠️ Overdue</span>;
  if (due_status === 'due_soon') return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">⏰ Due Soon</span>;
  return null;
};

const DocumentDetailPage = () => {
  const { id }       = useParams();
  const { user }     = useAuth();
  const fileInputRef = useRef(null);

  const [doc,         setDoc]         = useState(null);
  const [history,     setHistory]     = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [deptUsers,   setDeptUsers]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [message,     setMessage]     = useState({ type: '', text: '' });

  // Forward form state
  const [selectedDepts,  setSelectedDepts]  = useState([]);
  const [toUserId,       setToUserId]       = useState('');
  const [forwardRemarks, setForwardRemarks] = useState('');
  const [rejectRemarks,  setRejectRemarks]  = useState('');
  const [completeRemarks,setCompleteRemarks]= useState('');
  const [receiveRemarks, setReceiveRemarks] = useState('');
  const [showReject,     setShowReject]     = useState(false);

  const [actionLoading, setActionLoading]   = useState(false);
  const [uploadLoading, setUploadLoading]   = useState(false);
  const [selectedFiles, setSelectedFiles]   = useState([]);

  const isStaff      = user?.role === 'Staff';
  const isAdmin      = user?.role === 'Admin';
  const isSuperAdmin = user?.role === 'Super Admin';

  const fetchData = async () => {
    try {
      const [docRes, histRes, attachRes, deptRes] = await Promise.all([
        api.get(`/documents/${id}`),
        api.get(`/routing/${id}/history`),
        api.get(`/documents/${id}/attachments`),
        api.get('/documents/active-departments'), // UPDATED ENDPOINT
      ]);
      setDoc(docRes.data.data);
      setHistory(histRes.data.history);
      setAttachments(attachRes.data.data);
      setDepartments(deptRes.data.data); // Removed the local filter, backend handles it
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // Load users when a department is selected for specific-user forwarding
  useEffect(() => {
    if (selectedDepts.length === 1) {
      api.get('/routing/users/by-department', { params: { department: selectedDepts[0] } })
        .then(res => setDeptUsers(res.data.data))
        .catch(console.error);
    } else {
      setDeptUsers([]);
      setToUserId('');
    }
  }, [selectedDepts]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // ── Determine what actions this user can take
  const isInMyDept   = doc?.current_location_dept === user?.department;
  const canAct       = (isStaff || isSuperAdmin) && doc?.status !== 'Completed';
  const canReceive   = canAct && doc?.status === 'In Transit' && isInMyDept;
  const canForward   = canAct && doc?.status !== 'Completed';
  const canReject    = canAct && doc?.status === 'In Transit' && isInMyDept;
  const viewerOnly   = isAdmin; // Admin is always view-only

  // Cannot complete if you are the last forwarder and doc is still In Transit
  const lastForwarderId = history.filter(h => h.action_taken.startsWith('Forwarded')).slice(-1)[0]?.performed_by;
  const canComplete  = canAct &&
    (doc?.status === 'Received' || doc?.status === 'Created') &&
    !viewerOnly;

  // ── Forward
  const handleForward = async () => {
    if (selectedDepts.length === 0) return showMsg('error', 'Select at least one department.');
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/forward`, {
        departments: selectedDepts,
        to_user_id:  toUserId || null,
        remarks:     forwardRemarks || null,
      });
      showMsg('success', `Forwarded to ${selectedDepts.join(', ')}.`);
      setSelectedDepts([]); setToUserId(''); setForwardRemarks('');
      fetchData();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Forward failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Receive
  const handleReceive = async () => {
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/receive`, { remarks: receiveRemarks || null });
      showMsg('success', 'Document received.');
      setReceiveRemarks('');
      fetchData();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Receive failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Reject
  const handleReject = async () => {
    if (!rejectRemarks.trim()) return showMsg('error', 'Remarks are required to reject.');
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/reject`, { remarks: rejectRemarks });
      showMsg('success', 'Document rejected and returned.');
      setRejectRemarks(''); setShowReject(false);
      fetchData();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Reject failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Complete
  const handleComplete = async () => {
    if (!window.confirm('Mark as Completed? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/complete`, { remarks: completeRemarks || null });
      showMsg('success', 'Document completed.');
      setCompleteRemarks('');
      fetchData();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Complete failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── File upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return showMsg('error', 'Select files first.');
    setUploadLoading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('files', f));
      await api.post(`/documents/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showMsg('success', `${selectedFiles.length} file(s) uploaded.`);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"?`)) return;
    try {
      await api.delete(`/documents/attachments/${attachmentId}`);
      showMsg('success', 'Attachment deleted.');
      fetchData();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Delete failed.');
    }
  };

  // ── Dept checkbox toggle
  const toggleDept = (deptName) => {
    setSelectedDepts(prev =>
      prev.includes(deptName)
        ? prev.filter(d => d !== deptName)
        : [...prev, deptName]
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading document...</p>
      </div>
    </div>
  );

  if (!doc) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400">Document not found.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb */}
        <div className="text-sm text-gray-400 mb-6">
          <Link to="/documents" className="hover:text-blue-600">Documents</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600 font-mono">{doc.tracking_code}</span>
        </div>

        {/* Viewer Only Banner */}
        {viewerOnly && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-5 flex items-center gap-2">
            <span className="text-blue-500 text-lg">👁️</span>
            <p className="text-blue-700 text-sm font-medium">
              You are viewing this document in read-only mode. Admins cannot perform routing actions.
            </p>
          </div>
        )}

        {/* Message */}
        {message.text && (
          <div className={`px-4 py-3 rounded-lg mb-5 text-sm font-medium
            ${message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-600'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT */}
          <div className="lg:col-span-1 space-y-5">

            {/* Document Info */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-start justify-between mb-4 gap-2">
                <h2 className="text-lg font-bold text-gray-800 leading-tight">{doc.title}</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusBadge(doc.status)}`}>
                  {doc.status}
                </span>
              </div>

              {/* Urgency + Due badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {doc.urgency !== 'Normal' && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${urgencyBadge(doc.urgency)}`}>
                    🔥 {doc.urgency}
                  </span>
                )}
                {dueBadge(doc.due_status, doc.due_date)}
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Tracking Code</span>
                  <p className="font-mono text-blue-700 font-medium">{doc.tracking_code}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Document Kind</span>
                  <p className="text-gray-700">{doc.document_kind || doc.type}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Department Type</span>
                  <p className="text-gray-700">{doc.type}</p>
                </div>
                {doc.dest_department && (
                  <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wide">Destination</span>
                    <p className="text-gray-700">{doc.dest_department}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Current Location</span>
                  <p className="text-gray-700 font-medium">{doc.current_location_dept}</p>
                </div>
                {doc.due_date && (
                  <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wide">Due Date</span>
                    <p className={`font-medium ${doc.due_status === 'overdue' ? 'text-red-600' : doc.due_status === 'due_soon' ? 'text-yellow-600' : 'text-gray-700'}`}>
                      {new Date(doc.due_date).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Created By</span>
                  <p className="text-gray-700">{doc.created_by_name}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Created At</span>
                  <p className="text-gray-700">{new Date(doc.created_at).toLocaleString()}</p>
                </div>
                {doc.description && (
                  <div>
                    <span className="text-gray-400 text-xs uppercase tracking-wide">Description</span>
                    <p className="text-gray-600 mt-1">{doc.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recipients */}
            {doc.recipients?.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold text-gray-800 mb-3">📬 Recipients</h3>
                <div className="space-y-2">
                  {doc.recipients.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-700">{r.department}</p>
                        {r.user_name && <p className="text-xs text-gray-400">→ {r.user_name}</p>}
                        {r.remarks && <p className="text-xs text-gray-400 italic mt-0.5">"{r.remarks}"</p>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium
                        ${r.status === 'Received' ? 'bg-green-100 text-green-700'
                          : r.status === 'Rejected' ? 'bg-red-100 text-red-600'
                          : 'bg-yellow-100 text-yellow-700'}`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Routing Actions — Staff and Super Admin only */}
            {!viewerOnly && doc.status !== 'Completed' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Routing Actions</h3>

                {/* Receive */}
                {canReceive && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">This document is in your department.</p>
                    <textarea value={receiveRemarks}
                      onChange={e => setReceiveRemarks(e.target.value)}
                      rows={2} placeholder="Optional remarks..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={handleReceive} disabled={actionLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60">
                      📥 Receive Document
                    </button>
                  </div>
                )}

                {/* Forward — multi-department checkboxes */}
                {canForward && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Forward to Department(s)</p>

                    <div className="space-y-1 max-h-44 overflow-y-auto border border-gray-200 rounded-lg p-3 mb-3">
                      {departments
                        .filter(d => d.name !== doc.current_location_dept && d.name !== 'System Administrator')
                        .map(d => (
                          <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                            <input type="checkbox"
                              checked={selectedDepts.includes(d.name)}
                              onChange={() => toggleDept(d.name)}
                              className="rounded border-gray-300 text-blue-600" />
                            <span className="text-gray-700">{d.name}</span>
                          </label>
                        ))}
                    </div>

                    {/* Specific user (only when 1 dept selected) */}
                    {selectedDepts.length === 1 && deptUsers.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 mb-1">Forward to specific user (optional)</p>
                        <select value={toUserId} onChange={e => setToUserId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">— Any user in {selectedDepts[0]} —</option>
                          {deptUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <textarea value={forwardRemarks}
                      onChange={e => setForwardRemarks(e.target.value)}
                      rows={2} placeholder="Optional remarks..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />

                    <button onClick={handleForward}
                      disabled={actionLoading || selectedDepts.length === 0}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60">
                      🚚 Forward to {selectedDepts.length > 0 ? `${selectedDepts.length} Department(s)` : '...'}
                    </button>
                  </div>
                )}

                {/* Reject */}
                {canReject && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    {!showReject ? (
                      <button onClick={() => setShowReject(true)}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-lg text-sm font-medium transition border border-red-200">
                        ❌ Reject Document
                      </button>
                    ) : (
                      <div>
                        <p className="text-xs text-red-500 font-medium mb-1">Remarks are required to reject</p>
                        <textarea value={rejectRemarks}
                          onChange={e => setRejectRemarks(e.target.value)}
                          rows={3} placeholder="State reason for rejection..."
                          className="w-full border border-red-300 rounded-lg px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400" />
                        <div className="flex gap-2">
                          <button onClick={handleReject} disabled={actionLoading || !rejectRemarks.trim()}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-60">
                            Confirm Reject
                          </button>
                          <button onClick={() => { setShowReject(false); setRejectRemarks(''); }}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium transition">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Complete */}
                {canComplete && (
                  <div>
                    <textarea value={completeRemarks}
                      onChange={e => setCompleteRemarks(e.target.value)}
                      rows={2} placeholder="Optional completion remarks..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
                    <button onClick={handleComplete} disabled={actionLoading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60">
                      ✅ Mark as Completed
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Completed state */}
            {doc.status === 'Completed' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-green-700 font-semibold text-sm">Document Completed</p>
                <p className="text-green-500 text-xs mt-1">No further actions available.</p>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-2 space-y-6">

            {/* Audit Trail */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-800">
                  📋 Audit Trail
                  <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {history.length} events
                  </span>
                </h3>
                {history.length > 0 && (
                  <div className="flex gap-2">
                    <button onClick={() => exportAuditTrailCSV(doc, history)}
                      className="text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition font-medium">
                      📥 CSV
                    </button>
                    <button onClick={() => exportAuditTrailPDF(doc, history)}
                      className="text-xs px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition font-medium">
                      📄 PDF
                    </button>
                  </div>
                )}
              </div>

              {history.length === 0 ? (
                <p className="text-gray-400 text-sm">No history yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
                  <div className="space-y-6">
                    {history.map((log, index) => (
                      <div key={log.id} className="relative flex gap-4">
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0
                          ${index === history.length - 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 pb-2">
                          <p className="font-medium text-gray-800 text-sm">{log.action_taken}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            {log.from_department && (
                              <span className="text-xs text-gray-400">
                                From: <span className="text-gray-600">{log.from_department}</span>
                              </span>
                            )}
                            {log.to_department && (
                              <span className="text-xs text-gray-400">
                                To: <span className="text-gray-600">{log.to_department}</span>
                              </span>
                            )}
                            {log.to_user_name && (
                              <span className="text-xs text-blue-500">
                                → {log.to_user_name}
                              </span>
                            )}
                          </div>
                          {log.remarks && (
                            <div className="mt-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                              <p className="text-xs text-gray-500 italic">"{log.remarks}"</p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-gray-400">
                              By <span className="text-gray-600 font-medium">{log.performed_by}</span>
                            </span>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-400">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-800 mb-5">
                📎 Attachments
                <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {attachments.length} file{attachments.length !== 1 ? 's' : ''}
                </span>
              </h3>

              {/* Upload area — available to everyone */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 mb-5 hover:border-blue-300 transition">
                <div className="text-center mb-3">
                  <div className="text-3xl mb-1">📁</div>
                  <p className="text-sm text-gray-500">
                    PDF, Word, Excel, JPG, PNG — max 10MB each, up to 5 files per upload
                  </p>
                </div>
                <input ref={fileInputRef} type="file" multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                  onChange={e => setSelectedFiles(Array.from(e.target.files))}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />

                {selectedFiles.length > 0 && (
                  <div className="mt-3">
                    <div className="space-y-1 mb-3">
                      {selectedFiles.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                          <span>{fileIcon(file.type)}</span>
                          <span className="flex-1 truncate">{file.name}</span>
                          <span className="text-gray-400">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleUpload} disabled={uploadLoading}
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60">
                      {uploadLoading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
                    </button>
                  </div>
                )}
              </div>

              {/* Attachment list */}
              {attachments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No attachments yet.</p>
              ) : (
                <div className="space-y-3">
                  {attachments.map(att => (
                    <div key={att.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition">
                      <span className="text-2xl">{fileIcon(att.file_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{att.file_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatFileSize(att.file_size)} · {att.uploaded_by_name} · {new Date(att.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => window.open(`http://localhost:5000/api/documents/attachments/${att.id}`, '_blank')}
                          className="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition">
                          View
                        </button>
                        {(att.uploaded_by === user?.id || isSuperAdmin) && (
                          <button onClick={() => handleDeleteAttachment(att.id, att.file_name)}
                            className="text-xs px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition">
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailPage;