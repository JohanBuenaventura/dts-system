// src/pages/DocumentDetailPage.jsx
import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { exportAuditTrailPDF, exportAuditTrailCSV } from '../utils/exportUtils';
import {
  ArrowLeft, ArrowRight, Truck, Inbox, CheckCircle2, Paperclip, Trash2, 
  Download, Upload, FileText, FileSpreadsheet, FileImage, File, 
  ClipboardList, CheckCheck, Clock, MapPin, User, Calendar, AlignLeft, ChevronDown
} from 'lucide-react';

const DEPARTMENTS = [
  'Registrar','Finance','HR','IT','Academic Affairs',
  'Student Affairs','Research','Procurement','Administration',
];

const statusConfig = (status) => {
  const map = {
    'Created':    { badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', dot: 'bg-zinc-500' },
    'In Transit': { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
    'Received':   { badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-400' },
    'Completed':  { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  };
  return map[status] ?? map['Created'];
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileIcon = ({ type, className = 'w-4 h-4' }) => {
  if (type === 'application/pdf') return <FileText className={`${className} text-rose-400`} />;
  if (type?.includes('word')) return <FileText className={`${className} text-blue-400`} />;
  if (type?.includes('excel') || type?.includes('sheet')) return <FileSpreadsheet className={`${className} text-emerald-400`} />;
  if (type?.startsWith('image/')) return <FileImage className={`${className} text-purple-400`} />;
  return <File className={`${className} text-zinc-400`} />;
};

const DetailRow = ({ icon: Icon, label, value, mono = false }) => (
  <div className="flex items-start gap-3 py-3 border-b border-zinc-900/60 last:border-0">
    <div className="w-7 h-7 rounded-lg bg-zinc-950/50 border border-zinc-900 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner">
      <Icon className="w-3.5 h-3.5 text-zinc-500" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-xs text-zinc-300 font-medium break-words leading-relaxed ${mono ? 'font-mono text-indigo-400 font-semibold' : ''}`}>{value}</p>
    </div>
  </div>
);

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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleForward = async () => {
    if (!toDept) return showMessage('error', 'Please select a destination department location path.');
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/forward`, { to_department: toDept });
      showMessage('success', `Ledger item forwarded along pipeline towards: ${toDept}.`);
      setToDept(''); fetchData();
    } catch (err) { showMessage('error', err.response?.data?.message || 'Pipeline forward execution error.'); }
    finally { setActionLoading(false); }
  };

  const handleReceive = async () => {
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/receive`);
      showMessage('success', 'Document successfully bound and checked in inside target department logs.');
      fetchData();
    } catch (err) { showMessage('error', err.response?.data?.message || 'Registry verify failure.'); }
    finally { setActionLoading(false); }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this ledger document entity as Completed? Operation will seal track pipelines permanently.')) return;
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/complete`);
      showMessage('success', 'Document tracing scope successfully verified and concluded.');
      fetchData();
    } catch (err) { showMessage('error', err.response?.data?.message || 'Conclusion execution blocked.'); }
    finally { setActionLoading(false); }
  };

  const handleFileSelect = (e) => setSelectedFiles(Array.from(e.target.files));

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return showMessage('error', 'Select target upload content binaries first.');
    setUploadLoading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('files', file));
      await api.post(`/documents/${id}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showMessage('success', `Successfully attached ${selectedFiles.length} item matrix arrays down to instance.`);
      setSelectedFiles([]); if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch (err) { showMessage('error', err.response?.data?.message || 'Attachment bind exception.'); }
    finally { setUploadLoading(false); }
  };

  const handleDeleteAttachment = async (attachmentId, fileName) => {
    if (!window.confirm(`Scrub attached asset file binary "${fileName}" entirely from ledger records?`)) return;
    try {
      await api.delete(`/documents/attachments/${attachmentId}`);
      showMessage('success', 'Attachment node removed safely.'); fetchData();
    } catch (err) { showMessage('error', err.response?.data?.message || 'Purge deletion block.'); }
  };

  const handleDownload = (attachmentId) => {
    window.open(`http://localhost:5000/api/documents/attachments/${attachmentId}`, '_blank');
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 font-sans relative overflow-hidden">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-zinc-400">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm font-medium tracking-wide">Compiling file ledger matrix records...</p>
      </div>
    </div>
  );

  if (!doc) return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <FileText className="w-10 h-10 text-zinc-800" />
        <p className="text-zinc-500 text-xs font-medium">Specified record parameter matches no indexed entities.</p>
        <Link to="/documents" className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 rounded-xl">← Back to Ledger</Link>
      </div>
    </div>
  );

  const canReceive = doc.status === 'In Transit' && doc.current_location_dept === user?.department;
  const canForward = doc.status !== 'Completed';
  const canComplete = doc.status === 'Received' || doc.status === 'Created';
  const { badge, dot } = statusConfig(doc.status);

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      
      <div className="pointer-events-none fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/5 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />

      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        {/* Dynamic Breadcrumbs */}
        <div className="mb-6 group">
          <Link to="/documents" className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-indigo-400 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
            Documents Ledger
            <span className="text-zinc-700 mx-2 select-none">/</span>
            <span className="font-mono text-zinc-400 group-hover:text-indigo-300 transition-colors">{doc.tracking_code}</span>
          </Link>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-xs font-medium border animate-in fade-in duration-200
            ${message.type === 'success' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400' : 'bg-rose-950/40 border-rose-900/50 text-rose-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${message.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── METADATA TRACK PANEL (LEFT) ── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
              <div className="px-5 py-4 border-b border-zinc-800/60 bg-zinc-900/40 flex items-start justify-between gap-4">
                <h2 className="font-bold text-zinc-200 text-sm tracking-tight leading-snug truncate" title={doc.title}>{doc.title}</h2>
                <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold border uppercase tracking-wider whitespace-nowrap flex-shrink-0 ${badge}`}>
                  {doc.status}
                </span>
              </div>
              <div className="px-5 py-2">
                <DetailRow icon={ClipboardList} label="Tracking Hash" value={doc.tracking_code} mono />
                <DetailRow icon={FileText} label="Classification" value={doc.type} />
                <DetailRow icon={MapPin} label="Current Location" value={doc.current_location_dept} />
                <DetailRow icon={User} label="Originator Agent" value={doc.created_by_name} />
                <DetailRow icon={Calendar} label="Logs Registration" value={new Date(doc.created_at).toLocaleString()} />
                {doc.description && <DetailRow icon={AlignLeft} label="Scope Context Remarks" value={doc.description} />}
              </div>
            </div>

            {/* Workflow Directives Section */}
            {doc.status !== 'Completed' ? (
              <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
                <div className="px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-900/40 flex items-center gap-2 text-zinc-400">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Pipeline Flow Controllers</span>
                </div>
                <div className="p-4 space-y-4">
                  {canReceive && (
                    <div className="bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-xl">
                      <p className="text-[11px] text-zinc-400 font-medium mb-2.5 leading-relaxed">Pipeline addressing indicates arrival at your terminal sector checkpoint.</p>
                      <button onClick={handleReceive} disabled={actionLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-semibold border border-indigo-500 shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]">
                        <Inbox className="w-3.5 h-3.5" /> Checked In Terminal
                      </button>
                    </div>
                  )}

                  {canForward && (
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Forward Target Node</label>
                      <div className="relative mb-2">
                        <select value={toDept} onChange={e => setToDept(e.target.value)} className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-xl px-3 py-2 text-xs text-zinc-300 font-medium placeholder-zinc-600 appearance-none focus:outline-none focus:border-indigo-500/50 pr-8">
                          <option value="" className="bg-zinc-950 text-zinc-500">— Select Destination Sector —</option>
                          {DEPARTMENTS.filter(d => d !== doc.current_location_dept).map(d => <option key={d} value={d} className="bg-zinc-950">{d}</option>)}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <button onClick={handleForward} disabled={actionLoading || !toDept} className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 py-2 rounded-xl text-xs font-semibold transition active:scale-[0.98] flex items-center justify-center gap-1.5 disabled:opacity-30">
                        <ArrowRight className="w-3.5 h-3.5" /> Forward Scope Trace
                      </button>
                    </div>
                  )}

                  {canComplete && (
                    <button onClick={handleComplete} disabled={actionLoading} className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-2 rounded-xl text-xs font-semibold transition active:scale-[0.98] flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Seal Complete Concluded
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 text-center backdrop-blur-md">
                <CheckCheck className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                <p className="text-emerald-400 font-bold text-xs uppercase tracking-wider">Trace Concluded</p>
                <p className="text-zinc-600 text-[10px] mt-1 font-medium leading-relaxed">Document immutable state sealed. Pipeline transformations terminated.</p>
              </div>
            )}
          </div>

          {/* ── DATA MATRICES & TRAIL (RIGHT) ── */}
          <div className="lg:col-span-2 space-y-5">
            
            {/* Audit Trail Row Timeline Container */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
              <div className="px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-900/40 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">Chrono Trail History</h3>
                  <span className="text-[10px] font-bold bg-zinc-950/60 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-mono">{history.length} cycles</span>
                </div>
                {history.length > 0 && (
                  <div className="flex items-center bg-zinc-950/40 border border-zinc-900 p-1 rounded-xl">
                    <button onClick={() => exportAuditTrailCSV(doc, history)} className="hover:bg-zinc-800 text-zinc-500 hover:text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1"><Download className="w-3 h-3" /> CSV</button>
                    <div className="w-[1px] h-3 bg-zinc-900 mx-1" />
                    <button onClick={() => exportAuditTrailPDF(doc, history)} className="hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</button>
                  </div>
                )}
              </div>

              <div className="p-5">
                {history.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="w-6 h-6 text-zinc-800 mx-auto mb-2" />
                    <p className="text-zinc-600 text-xs font-medium">No system log updates verified down to stack yet.</p>
                  </div>
                ) : (
                  <div className="relative pl-2 space-y-0">
                    {history.map((event, i) => {
                      const { dot: dotColor } = statusConfig(event.action ?? event.status);
                      return (
                        <div key={event.id ?? i} className="flex gap-4 group">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`w-2 h-2 rounded-full ring-4 ring-zinc-950 ${dotColor} mt-1.5`} />
                            {i < history.length - 1 && <div className="w-[1px] flex-1 bg-zinc-900 my-1.5" />}
                          </div>
                          <div className="pb-5 flex-1 min-w-0">
                            <p className="text-xs font-bold text-zinc-200 tracking-tight leading-snug">{event.action ?? event.status}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-zinc-500 font-medium">
                              {event.from_department && <span className="font-mono text-zinc-600 text-[10px] bg-zinc-950/40 px-1.5 py-0.5 rounded border border-zinc-900/60">{event.from_department} <span className="text-zinc-700 mx-0.5">→</span> {event.to_department}</span>}
                              {event.performed_by_name && <span>by <span className="text-zinc-400 font-semibold">{event.performed_by_name}</span></span>}
                              <span className="text-zinc-600 text-[10px] font-mono">{new Date(event.created_at ?? event.timestamp).toLocaleString()}</span>
                            </div>
                            {event.remarks && <p className="text-[11px] text-zinc-500 italic mt-1.5 pl-2 border-l border-zinc-800 bg-zinc-900/10 py-0.5 rounded-r">{event.remarks}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* File Binary Attachments Component Wrapper */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/10">
              <div className="px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-900/40 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-zinc-500" />
                <h3 className="font-semibold text-zinc-200 text-xs uppercase tracking-wider">Linked Document Binaries</h3>
                <span className="text-[10px] font-bold bg-zinc-950/60 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full font-mono ml-auto">{attachments.length} files</span>
              </div>

              <div className="p-5 space-y-4">
                <div className="border border-dashed border-zinc-800 hover:border-indigo-500/30 rounded-xl p-4 transition duration-200 group bg-zinc-950/10">
                  <div className="text-center mb-3">
                    <div className="w-8 h-8 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mx-auto mb-1.5 transition group-hover:border-indigo-500/20">
                      <Upload className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 transition" />
                    </div>
                    <p className="text-[10px] text-zinc-600 font-medium">Supported profiles: PDF, Word, Excel, Images — max 10MB per payload frame</p>
                  </div>
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif" onChange={handleFileSelect} className="w-full text-[10px] font-medium text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 file:transition file:cursor-pointer" />

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-1.5 border-t border-zinc-900 pt-3">
                      {selectedFiles.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-400 bg-zinc-950/30 border border-zinc-900 px-3 py-1.5 rounded-lg font-medium">
                          <FileIcon type={file.type} className="w-3.5 h-3.5" />
                          <span className="flex-1 truncate text-zinc-300">{file.name}</span>
                          <span className="text-zinc-600 font-mono text-[10px]">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                      <button onClick={handleUpload} disabled={uploadLoading} className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 border border-indigo-500 transition active:scale-[0.98]">
                        {uploadLoading ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {uploadLoading ? 'Uploading Matrix Layers...' : `Confirm Upload (${selectedFiles.length} item${selectedFiles.length > 1 ? 's' : ''})`}
                      </button>
                    </div>
                  )}
                </div>

                {/* Grid Lists */}
                {attachments.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-zinc-700 text-xs font-medium">No file fragments mapped to trace element container.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-3 p-2.5 bg-zinc-950/20 border border-zinc-900 rounded-xl hover:border-zinc-800 transition duration-200 group">
                        <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-900 flex items-center justify-center flex-shrink-0 shadow-inner">
                          <FileIcon type={att.file_type} className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-zinc-200 truncate group-hover:text-indigo-300 transition">{att.file_name}</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5 font-medium">
                            {formatFileSize(att.file_size)}
                            <span className="mx-1.5 text-zinc-800">·</span>
                            {att.uploaded_by_name}
                            <span className="mx-1.5 text-zinc-800">·</span>
                            {new Date(att.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => handleDownload(att.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-400 bg-transparent hover:bg-zinc-950 border border-transparent hover:border-zinc-900 transition" title="Fetch Binary"><Download className="w-3.5 h-3.5" /></button>
                          {(att.uploaded_by === user?.id || user?.role === 'Super Admin') && (
                            <button onClick={() => handleDeleteAttachment(att.id, att.file_name)} className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 bg-transparent hover:bg-zinc-950 border border-transparent hover:border-zinc-900 transition" title="Wipe Record"><Trash2 className="w-3.5 h-3.5" /></button>
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