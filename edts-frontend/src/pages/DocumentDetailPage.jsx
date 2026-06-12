// src/pages/DocumentDetailPage.jsx
import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { exportAuditTrailPDF, exportAuditTrailCSV } from '../utils/exportUtils';
import {
  ArrowLeft,
  ArrowRight,
  Truck,
  Inbox,
  CheckCircle2,
  Paperclip,
  Trash2,
  Download,
  Upload,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  ClipboardList,
  CheckCheck,
  Clock,
  MapPin,
  User,
  Calendar,
  AlignLeft,
  ChevronDown,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  'Registrar','Finance','HR','IT','Academic Affairs',
  'Student Affairs','Research','Procurement','Administration',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusConfig = (status) => {
  const map = {
    'Created':    { badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',    dot: 'bg-zinc-500'   },
    'In Transit': { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400'  },
    'Received':   { badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-400' },
    'Completed':  { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  };
  return map[status] ?? map['Created'];
};

const formatFileSize = (bytes) => {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileIcon = ({ type, className = 'w-4 h-4' }) => {
  if (type === 'application/pdf')                       return <FileText className={`${className} text-red-400`} />;
  if (type?.includes('word'))                           return <FileText className={`${className} text-blue-400`} />;
  if (type?.includes('excel') || type?.includes('sheet')) return <FileSpreadsheet className={`${className} text-emerald-400`} />;
  if (type?.startsWith('image/'))                       return <FileImage className={`${className} text-purple-400`} />;
  return <File className={`${className} text-zinc-400`} />;
};

// ── Detail Row ────────────────────────────────────────────────────────────────
const DetailRow = ({ icon: Icon, label, value, mono = false }) => (
  <div className="flex items-start gap-3 py-3 border-b border-zinc-800/60 last:border-0">
    <div className="w-7 h-7 rounded-lg bg-zinc-800/60 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="w-3.5 h-3.5 text-zinc-500" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm text-zinc-200 break-words ${mono ? 'font-mono text-indigo-400' : ''}`}>{value}</p>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const DocumentDetailPage = () => {
  const { id }       = useParams();
  const { user }     = useAuth();
  const fileInputRef = useRef(null);

  const [doc,           setDoc]           = useState(null);
  const [history,       setHistory]       = useState([]);
  const [attachments,   setAttachments]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [toDept,        setToDept]        = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [message,       setMessage]       = useState({ type: '', text: '' });

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

  // ── Actions ───────────────────────────────────────────────────────────────
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

  const handleFileSelect = (e) => setSelectedFiles(Array.from(e.target.files));

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

  const handleDownload = (attachmentId) => {
    window.open(`http://localhost:5000/api/documents/attachments/${attachmentId}`, '_blank');
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );

  if (!doc) return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <FileText className="w-10 h-10 text-zinc-700" />
        <p className="text-zinc-500 text-sm">Document not found.</p>
        <Link to="/documents" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
          ← Back to Documents
        </Link>
      </div>
    </div>
  );

  const canReceive  = doc.status === 'In Transit' && doc.current_location_dept === user?.department;
  const canForward  = doc.status !== 'Completed';
  const canComplete = doc.status === 'Received' || doc.status === 'Created';
  const { badge, dot } = statusConfig(doc.status);

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">

      {/* Ambient glows */}
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />

      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-zinc-600 mb-6">
          <Link
            to="/documents"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-indigo-400 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Documents
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="font-mono text-zinc-400">{doc.tracking_code}</span>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-sm font-medium border animate-in fade-in slide-in-from-top-1 duration-200
            ${message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${message.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Document Info Card */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/50 flex items-start justify-between gap-3">
                <h2 className="font-semibold text-zinc-100 text-sm leading-snug">{doc.title}</h2>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border uppercase tracking-wider whitespace-nowrap flex-shrink-0 ${badge}`}>
                  {doc.status}
                </span>
              </div>
              <div className="px-5 py-2">
                <DetailRow icon={FileText}  label="Tracking Code"    value={doc.tracking_code}            mono />
                <DetailRow icon={FileText}  label="Type"             value={doc.type} />
                <DetailRow icon={MapPin}    label="Current Location" value={doc.current_location_dept} />
                <DetailRow icon={User}      label="Created By"       value={doc.created_by_name} />
                <DetailRow icon={Calendar}  label="Created At"       value={new Date(doc.created_at).toLocaleString()} />
                {doc.description && (
                  <DetailRow icon={AlignLeft} label="Description"    value={doc.description} />
                )}
              </div>
            </div>

            {/* Routing Actions */}
            {doc.status !== 'Completed' ? (
              <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
                  <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-400" />
                    Routing Actions
                  </h3>
                </div>
                <div className="px-5 py-4 space-y-3">

                  {/* Receive */}
                  {canReceive && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">This document is addressed to your department.</p>
                      <button
                        onClick={handleReceive}
                        disabled={actionLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] border border-indigo-500"
                      >
                        <Inbox className="w-4 h-4" />
                        Receive Document
                      </button>
                    </div>
                  )}

                  {/* Forward */}
                  {canForward && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Forward to Department
                      </label>
                      <div className="relative mb-2">
                        <select
                          value={toDept}
                          onChange={e => setToDept(e.target.value)}
                          className="w-full bg-zinc-950/60 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200 appearance-none focus:outline-none focus:border-indigo-500/80 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 pr-8"
                        >
                          <option value="" className="bg-zinc-900">— Select Department —</option>
                          {DEPARTMENTS
                            .filter(d => d !== doc.current_location_dept)
                            .map(d => (
                              <option key={d} value={d} className="bg-zinc-900">{d}</option>
                            ))
                          }
                        </select>
                        <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <button
                        onClick={handleForward}
                        disabled={actionLoading || !toDept}
                        className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Forward Document
                      </button>
                    </div>
                  )}

                  {/* Complete */}
                  {canComplete && (
                    <button
                      onClick={handleComplete}
                      disabled={actionLoading}
                      className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark as Completed
                    </button>
                  )}

                </div>
              </div>
            ) : (
              /* Completed State */
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-emerald-400 font-semibold text-sm">Document Completed</p>
                <p className="text-zinc-600 text-xs mt-1">No further routing actions available.</p>
              </div>
            )}

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Audit Trail */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between">
                <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-indigo-400" />
                  Audit Trail
                  <span className="text-[10px] font-semibold bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                    {history.length} events
                  </span>
                </h3>
                {history.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportAuditTrailCSV(doc, history)}
                      className="text-xs px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition font-medium flex items-center gap-1.5"
                    >
                      <Download className="w-3 h-3" /> CSV
                    </button>
                    <button
                      onClick={() => exportAuditTrailPDF(doc, history)}
                      className="text-xs px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition font-medium flex items-center gap-1.5"
                    >
                      <FileText className="w-3 h-3" /> PDF
                    </button>
                  </div>
                )}
              </div>

              <div className="px-5 py-4">
                {history.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-600 text-sm">No history recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {history.map((event, i) => {
                      const { dot } = statusConfig(event.action ?? event.status);
                      return (
                        <div key={event.id ?? i} className="flex gap-4 group">
                          {/* Timeline line */}
                          <div className="flex flex-col items-center">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ring-2 ring-zinc-950 ${dot}`} />
                            {i < history.length - 1 && (
                              <div className="w-px flex-1 bg-zinc-800 my-1.5" />
                            )}
                          </div>
                          {/* Content */}
                          <div className="pb-4 min-w-0 flex-1">
                            <p className="text-sm text-zinc-200 font-medium leading-snug">
                              {event.action ?? event.status}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                              {event.from_department && (
                                <span className="text-xs text-zinc-600 font-mono">
                                  {event.from_department}
                                  <span className="mx-1.5 text-zinc-700">→</span>
                                  {event.to_department}
                                </span>
                              )}
                              {event.performed_by_name && (
                                <span className="text-xs text-zinc-600">by {event.performed_by_name}</span>
                              )}
                              <span className="text-xs text-zinc-700">
                                {new Date(event.created_at ?? event.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {event.remarks && (
                              <p className="text-xs text-zinc-500 mt-1 italic">{event.remarks}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-zinc-400" />
                <h3 className="font-semibold text-zinc-100 text-sm">Attachments</h3>
                <span className="text-[10px] font-semibold bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full ml-1">
                  {attachments.length} file{attachments.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="px-5 py-4 space-y-4">

                {/* Upload Zone */}
                <div className="border border-dashed border-zinc-700 hover:border-indigo-500/50 rounded-xl p-5 transition-colors group">
                  <div className="text-center mb-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700 flex items-center justify-center mx-auto mb-2 group-hover:border-indigo-500/30 transition-colors">
                      <Upload className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <p className="text-xs text-zinc-600">PDF, Word, Excel, Images — max 10MB each, up to 5 files</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileSelect}
                    className="w-full text-xs text-zinc-500
                      file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                      file:text-xs file:font-semibold
                      file:bg-indigo-500/10 file:text-indigo-400
                      hover:file:bg-indigo-500/20 file:transition-colors file:cursor-pointer"
                  />

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedFiles.map((file, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-xs text-zinc-400 bg-zinc-800/50 border border-zinc-700/50 px-3 py-2 rounded-lg">
                          <FileIcon type={file.type} className="w-3.5 h-3.5" />
                          <span className="flex-1 truncate text-zinc-300">{file.name}</span>
                          <span className="text-zinc-600 flex-shrink-0">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                      <button
                        onClick={handleUpload}
                        disabled={uploadLoading}
                        className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] border border-indigo-500"
                      >
                        {uploadLoading ? (
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {uploadLoading ? 'Uploading…' : `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`}
                      </button>
                    </div>
                  )}
                </div>

                {/* Attachment List */}
                {attachments.length === 0 ? (
                  <div className="text-center py-6">
                    <Paperclip className="w-7 h-7 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-600 text-sm">No attachments yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map(att => (
                      <div
                        key={att.id}
                        className="flex items-center gap-3 p-3 bg-zinc-800/30 border border-zinc-700/50 rounded-xl hover:border-zinc-600 transition-colors group"
                      >
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                          <FileIcon type={att.file_type} className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{att.file_name}</p>
                          <p className="text-[11px] text-zinc-600 mt-0.5">
                            {formatFileSize(att.file_size)}
                            <span className="mx-1.5 text-zinc-700">·</span>
                            {att.uploaded_by_name}
                            <span className="mx-1.5 text-zinc-700">·</span>
                            {new Date(att.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleDownload(att.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {(att.uploaded_by === user?.id || user?.role === 'Super Admin') && (
                            <button
                              onClick={() => handleDeleteAttachment(att.id, att.file_name)}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
};

export default DocumentDetailPage;