// src/pages/DocumentDetailPage.jsx
import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { exportAuditTrailPDF, exportAuditTrailCSV } from '../utils/exportUtils';
const DEPARTMENTS = [
  'Registrar','Finance','HR','IT','Academic Affairs',
  'Student Affairs','Research','Procurement','Administration',
];

const statusBadge = (status) => {
  const map = {
    'Created':    'bg-gray-100 text-gray-700',
    'In Transit': 'bg-yellow-100 text-yellow-800',
    'Received':   'bg-blue-100 text-blue-800',
    'Completed':  'bg-green-100 text-green-800',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
};

const formatFileSize = (bytes) => {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (type) => {
  if (type === 'application/pdf')                    return '📄';
  if (type.includes('word'))                         return '📝';
  if (type.includes('excel') || type.includes('sheet')) return '📊';
  if (type.startsWith('image/'))                     return '🖼️';
  return '📎';
};

const DocumentDetailPage = () => {
  const { id }       = useParams();
  const { user }     = useAuth();
  const fileInputRef = useRef(null);

  const [doc,         setDoc]         = useState(null);
  const [history,     setHistory]     = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toDept,      setToDept]      = useState('');
  const [actionLoading,  setActionLoading]  = useState(false);
  const [uploadLoading,  setUploadLoading]  = useState(false);
  const [selectedFiles,  setSelectedFiles]  = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchData = async () => {
    try {
      const [docRes, histRes, attachRes] = await Promise.all([
        api.get(`/documents/${id}`),
        api.get(`/routing/${id}/history`),
        api.get(`/documents/${id}/attachments`),
      ]);
      setDoc(docRes.data.data);
      setHistory(histRes.data.history);
      setAttachments(attachRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  // ── Routing Actions
  const handleForward = async () => {
    if (!toDept) return showMessage('error', 'Please select a department.');
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/forward`, { to_department: toDept });
      showMessage('success', `Document forwarded to ${toDept}.`);
      setToDept('');
      fetchData();
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Forward failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async () => {
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/receive`);
      showMessage('success', 'Document received successfully.');
      fetchData();
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Receive failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this document as Completed? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/complete`);
      showMessage('success', 'Document marked as completed.');
      fetchData();
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Complete failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── File Attachment Actions
  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return showMessage('error', 'Please select files to upload.');
    setUploadLoading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('files', file));

      await api.post(`/documents/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showMessage('success', `${selectedFiles.length} file(s) uploaded successfully.`);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"?`)) return;
    try {
      await api.delete(`/documents/attachments/${attachmentId}`);
      showMessage('success', 'Attachment deleted.');
      fetchData();
    } catch (err) {
      showMessage('error', err.response?.data?.message || 'Delete failed.');
    }
  };

  const handleDownload = (attachmentId, fileName) => {
    window.open(`http://localhost:5000/api/documents/attachments/${attachmentId}`, '_blank');
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

  const canReceive  = doc.status === 'In Transit' && doc.current_location_dept === user.department;
  const canForward  = doc.status !== 'Completed';
  const canComplete = doc.status === 'Received' || doc.status === 'Created';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb */}
        <div className="text-sm text-gray-400 mb-6">
          <Link to="/documents" className="hover:text-blue-600">Documents</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600 font-mono">{doc.tracking_code}</span>
        </div>

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

          {/* LEFT — Info + Actions */}
          <div className="lg:col-span-1 space-y-5">

            {/* Document Info */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 leading-tight">{doc.title}</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ml-2 whitespace-nowrap ${statusBadge(doc.status)}`}>
                  {doc.status}
                </span>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Tracking Code</span>
                  <p className="font-mono text-blue-700 font-medium">{doc.tracking_code}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Type</span>
                  <p className="text-gray-700">{doc.type}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Current Location</span>
                  <p className="text-gray-700 font-medium">{doc.current_location_dept}</p>
                </div>
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

            {/* Routing Actions */}
            {doc.status !== 'Completed' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Routing Actions</h3>

                {canReceive && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">This document is addressed to your department.</p>
                    <button onClick={handleReceive} disabled={actionLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60">
                      📥 Receive Document
                    </button>
                  </div>
                )}

                {canForward && (
                  <div className="mb-4">
                    <label className="block text-xs text-gray-500 mb-1">Forward to Department</label>
                    <select value={toDept} onChange={e => setToDept(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">-- Select Department --</option>
                      {DEPARTMENTS.filter(d => d !== doc.current_location_dept).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <button onClick={handleForward} disabled={actionLoading || !toDept}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60">
                      🚚 Forward Document
                    </button>
                  </div>
                )}

                {canComplete && (
                  <button onClick={handleComplete} disabled={actionLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60">
                    ✅ Mark as Completed
                  </button>
                )}
              </div>
            )}

            {doc.status === 'Completed' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-green-700 font-semibold text-sm">Document Completed</p>
                <p className="text-green-500 text-xs mt-1">No further routing actions available.</p>
              </div>
            )}
          </div>

          {/* RIGHT — Audit Trail + Attachments */}
          <div className="lg:col-span-2 space-y-6">

            {/* Audit Trail */}
            <div className="flex items-center justify-between mb-6">
  <h3 className="font-semibold text-gray-800">
    📋 Audit Trail
    <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
      {history.length} events
    </span>
  </h3>
  {history.length > 0 && (
    <div className="flex gap-2">
      <button
        onClick={() => exportAuditTrailCSV(doc, history)}
        className="text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition font-medium">
        📥 CSV
      </button>
      <button
        onClick={() => exportAuditTrailPDF(doc, history)}
        className="text-xs px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition font-medium">
        📄 PDF
      </button>
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

              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 mb-5 hover:border-blue-300 transition">
                <div className="text-center mb-3">
                  <div className="text-3xl mb-1">📁</div>
                  <p className="text-sm text-gray-500">PDF, Word, Excel, JPG, PNG — max 10MB each, up to 5 files</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                  onChange={handleFileSelect}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />

                {selectedFiles.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-2">Selected files:</p>
                    <div className="space-y-1">
                      {selectedFiles.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                          <span>{fileIcon(file.type)}</span>
                          <span className="flex-1 truncate">{file.name}</span>
                          <span className="text-gray-400">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleUpload}
                      disabled={uploadLoading}
                      className="mt-3 w-full bg-blue-700 hover:bg-blue-800 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60">
                      {uploadLoading ? 'Uploading...' : `Upload ${selectedFiles.length} File(s)`}
                    </button>
                  </div>
                )}
              </div>

              {/* Attachment List */}
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
                          {formatFileSize(att.file_size)} · Uploaded by {att.uploaded_by_name} · {new Date(att.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleDownload(att.id, att.file_name)}
                          className="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition">
                          View
                        </button>
                        {(att.uploaded_by === user.id || user.role === 'Super Admin') && (
                          <button
                            onClick={() => handleDeleteAttachment(att.id, att.file_name)}
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