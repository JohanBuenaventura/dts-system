// src/pages/DocumentDetailPage.jsx
import { useEffect, useState, useRef } from 'react';
import { useParams, Link }             from 'react-router-dom';
import api                             from '../api/axios';
import Navbar                          from '../components/Navbar';
import { useAuth }                     from '../context/AuthContext';
import { exportAuditTrailPDF, exportAuditTrailCSV } from '../utils/exportUtils';
import {
  ArrowLeft, ArrowRight, Truck, Inbox, CheckCircle2, Paperclip, Trash2,
  Download, Upload, FileText, FileSpreadsheet, Image as FileImage, File,
  CheckCheck, Clock, MapPin, User, Calendar, AlignLeft, Hash,
  AlertTriangle, Flame, Eye, X, Plus, Send, History, Route,
} from 'lucide-react';

const formatFileSize = (bytes) => {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileIcon = ({ type, className = 'w-4 h-4' }) => {
  if (type === 'application/pdf') return <FileText className={`${className} text-rose-500`} />;
  if (type?.includes('word'))     return <FileText className={`${className} text-blue-500`} />;
  if (type?.includes('sheet'))    return <FileSpreadsheet className={`${className} text-emerald-500`} />;
  if (type?.startsWith('image/')) return <FileImage className={`${className} text-purple-500`} />;
  return <File className={`${className} text-gray-400`} />;
};

// Same status palette as DashboardPage's statusBadge / activityDot / progressColor
const statusBadge = (status) => {
  const map = {
    'Created':    'bg-gray-100 text-gray-700 border-gray-200',
    'In Transit': 'bg-amber-100 text-amber-700 border-amber-200',
    'Received':   'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Completed':  'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Rejected':   'bg-red-100 text-red-600 border-red-200',
  };
  return map[status] || 'bg-gray-100 text-gray-700 border-gray-200';
};

const urgencyBadge = (urgency) => ({
  'Normal':        null,
  'Urgent':        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3"/> Urgent</span>,
  'Highly Urgent': <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full"><Flame className="w-3 h-3"/> Highly Urgent</span>,
}[urgency] || null);

const dueBadge = (due_status, due_date) => {
  if (!due_date) return null;
  if (due_status === 'overdue')  return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3"/> Overdue</span>;
  if (due_status === 'due_soon') return <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3"/> Due Soon</span>;
  return null;
};

const actionDotColor = (action) => {
  if (!action) return 'bg-gray-400';
  if (action.includes('Created')) return 'bg-gray-400';
  if (action.includes('Forwarded')) return 'bg-amber-500';
  if (action.includes('Received')) return 'bg-indigo-500';
  if (action.includes('Completed')) return 'bg-emerald-500';
  if (action.includes('Rejected')) return 'bg-red-500';
  return 'bg-indigo-500';
};

const DetailRow = ({ icon: Icon, label, value, mono = false }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
    <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
      <Icon className="w-4 h-4 text-gray-500" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm text-gray-900 font-medium break-words leading-relaxed ${mono ? 'font-mono text-indigo-600 font-bold tracking-tight' : ''}`}>{value}</p>
    </div>
  </div>
);

const inputClass = "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder-gray-400 bg-white";

const DocumentDetailPage = () => {
  const { id }       = useParams();
  const { user }     = useAuth();
  const fileInputRef = useRef(null);

  const [doc,           setDoc]           = useState(null);
  const [history,       setHistory]       = useState([]);
  const [attachments,   setAttachments]   = useState([]);
  const [departments,   setDepartments]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [message,       setMessage]       = useState({ type: '', text: '' });

  const [activeTab, setActiveTab] = useState('action');

  // ── MATRIX ROUTING STATE (RESTORED ROW BUILDER) ──
  const [destinations, setDestinations] = useState([{ department: '', to_user_id: '' }]);
  const [usersByDept, setUsersByDept]   = useState({});

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
        api.get('/documents/active-departments'),
      ]);
      setDoc(docRes.data.data);
      setHistory(histRes.data.history);
      setAttachments(attachRes.data.data);
      setDepartments(deptRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // ── PERMISSIONS / VISIBILITY LOGIC (unchanged) ─────────────────────────
  const isCreator         = doc?.created_by === user?.id;
  const myRecipientRecord = doc?.recipients?.find(r => r.department === user?.department);
  const myRecipientStatus = myRecipientRecord ? myRecipientRecord.status : null;
  const isInMyDept        = doc?.current_location_dept === user?.department;

  const computedStatus = myRecipientStatus || doc?.status;
  const displayStatus  = computedStatus === 'Pending' ? 'In Transit' : computedStatus;

  const canAct       = (isStaff || isSuperAdmin || isCreator) && doc?.status !== 'Completed';
  const canReceive   = canAct && myRecipientStatus === 'Pending';
  const canReject    = canAct && (myRecipientStatus === 'Pending' || myRecipientStatus === 'Received');
  const viewerOnly   = isAdmin && !isCreator;

  const canComplete  = canAct && !viewerOnly && (
    myRecipientStatus === 'Received' ||
    (doc?.status === 'Created' && isInMyDept)
  );

  const canForward   = canAct && !viewerOnly && (
    myRecipientStatus === 'Received' ||
    (doc?.status === 'Created' && isInMyDept) ||
    isSuperAdmin
  );

  const hasAnyAction = !viewerOnly && doc?.status !== 'Completed' && (canReceive || canForward || canReject || canComplete);
  // ──────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'action', label: 'Take Action', icon: Send,    show: hasAnyAction, count: null },
    { id: 'trail',  label: 'Document Trail', icon: History, show: true, count: history.length },
    { id: 'files',  label: 'Attachments', icon: Paperclip, show: true, count: attachments.length },
  ];
  const visibleTabs = tabs.filter(t => t.show);

  useEffect(() => {
    if (doc && !visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'trail');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, activeTab, hasAnyAction]);

  // ── ROW BUILDER FUNCTIONS (unchanged) ──
  const addDestination = () => {
    setDestinations([...destinations, { department: '', to_user_id: '' }]);
  };

  const removeDestination = (index) => {
    setDestinations(destinations.filter((_, i) => i !== index));
  };

  const handleDeptChange = async (index, newDept) => {
    const newDests = [...destinations];
    newDests[index].department = newDept;
    newDests[index].to_user_id = '';
    setDestinations(newDests);

    if (newDept && !usersByDept[newDept]) {
      try {
        const res = await api.get('/routing/users/by-department', { params: { department: newDept } });
        setUsersByDept(prev => ({ ...prev, [newDept]: res.data.data }));
      } catch (err) {
        console.error('Failed to fetch department users:', err);
      }
    }
  };

  const handleUserChange = (index, userId) => {
    const newDests = [...destinations];
    newDests[index].to_user_id = userId;
    setDestinations(newDests);
  };

  const handleForward = async () => {
    const validDestinations = destinations.filter(d => d.department.trim() !== '');

    if (validDestinations.length === 0) return showMsg('error', 'Choose at least one department to send this to.');

    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/forward`, {
        destinations: validDestinations,
        remarks:      forwardRemarks || null,
      });
      showMsg('success', 'Document sent.');
      setDestinations([{ department: '', to_user_id: '' }]);
      setForwardRemarks('');
      fetchData();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Could not send the document. Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async () => {
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/receive`, { remarks: receiveRemarks || null });
      showMsg('success', 'Receipt confirmed.');
      setReceiveRemarks(''); fetchData();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Could not confirm receipt.'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectRemarks.trim()) return showMsg('error', 'Add a reason before sending this back.');
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/reject`, { remarks: rejectRemarks });
      showMsg('success', 'Document sent back.');
      setRejectRemarks(''); setShowReject(false); fetchData();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Could not send this back.'); }
    finally { setActionLoading(false); }
  };

  const handleComplete = async () => {
    if (!window.confirm('Mark this document as completed? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await api.post(`/routing/${id}/complete`, { remarks: completeRemarks || null });
      showMsg('success', 'Document marked as completed.');
      setCompleteRemarks(''); fetchData();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Could not complete the document.'); }
    finally { setActionLoading(false); }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return showMsg('error', 'Choose a file first.');
    setUploadLoading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach(f => formData.append('files', f));
      await api.post(`/documents/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showMsg('success', `${selectedFiles.length} file(s) attached.`);
      setSelectedFiles([]); if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Upload failed.'); }
    finally { setUploadLoading(false); }
  };

  const handleDeleteAttachment = async (attachmentId, fileName) => {
    if (!window.confirm(`Remove "${fileName}"?`)) return;
    try {
      await api.delete(`/documents/attachments/${attachmentId}`);
      showMsg('success', 'File removed.'); fetchData();
    } catch (err) { showMsg('error', err.response?.data?.message || 'Could not remove this file.'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 font-sans relative overflow-hidden">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-gray-500">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <p className="text-sm font-medium tracking-wide">Loading document…</p>
      </div>
    </div>
  );

  if (!doc) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-col items-center justify-center h-[50vh] gap-3">
        <FileText className="w-10 h-10 text-gray-300" />
        <p className="text-gray-500 text-sm font-medium">We couldn't find this document.</p>
        <Link to="/documents" className="text-indigo-600 hover:text-indigo-700 text-xs font-bold border border-indigo-200 bg-indigo-50 px-4 py-2 rounded-xl shadow-sm transition-colors mt-2">← Back to all documents</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-indigo-500/30 selection:text-indigo-900 relative overflow-x-hidden">

      <div className="pointer-events-none fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-100 blur-[120px] rounded-full" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-100/60 blur-[100px] rounded-full" />

      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">

        <div className="mb-6 group">
          <Link to="/documents" className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
            All documents
            <span className="text-gray-300 mx-2 select-none">/</span>
            <span className="font-mono text-gray-600 group-hover:text-indigo-600 transition-colors">{doc.tracking_code}</span>
          </Link>
        </div>

        {viewerOnly && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-3 mb-6 flex items-center gap-3 shadow-sm">
            <Eye className="w-5 h-5 text-indigo-500 flex-shrink-0" />
            <p className="text-indigo-700 text-sm font-semibold">
              You're viewing this document as an administrator. Routing actions are only available to staff and the document's creator.
            </p>
          </div>
        )}

        {message.text && (
          <div className={`px-5 py-3.5 rounded-xl mb-6 text-sm font-bold border flex items-center gap-2.5 shadow-sm
            ${message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-600'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* ── SPLIT SCREEN: dossier (left) / workspace tabs (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

          {/* ── LEFT: DOSSIER (sticky) ── */}
          <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-24">

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl shadow-gray-200/50">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-start justify-between gap-4">
                <h2 className="font-bold text-gray-900 text-sm tracking-tight leading-snug" title={doc.title}>{doc.title}</h2>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0 border ${statusBadge(displayStatus)}`}>
                  {displayStatus}
                </span>
              </div>
              <div className="px-5 py-3">

                {(doc.urgency !== 'Normal' || doc.due_date) && (
                  <div className="flex flex-wrap gap-2 mb-2 pt-1 pb-3 border-b border-gray-100">
                    {urgencyBadge(doc.urgency)}
                    {dueBadge(doc.due_status, doc.due_date)}
                  </div>
                )}

                <DetailRow icon={Hash} label="Tracking Code" value={doc.tracking_code} mono />
                <DetailRow icon={FileText} label="Document Type" value={doc.document_kind || doc.type} />
                <DetailRow icon={MapPin} label="Currently At" value={doc.current_location_dept} />
                {doc.dest_department && <DetailRow icon={Truck} label="Heading To" value={doc.dest_department} />}
                {doc.due_date && <DetailRow icon={Calendar} label="Due Date" value={new Date(doc.due_date).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })} />}
                <DetailRow icon={User} label="Filed By" value={doc.created_by_name} />
                <DetailRow icon={Clock} label="Date Filed" value={new Date(doc.created_at).toLocaleString()} />
                {doc.description && <DetailRow icon={AlignLeft} label="Notes" value={doc.description} />}
              </div>
            </div>

            {doc.recipients?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl shadow-gray-200/50">
                <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                  <Route className="w-4 h-4 text-gray-500" />
                  <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Routing Slip</h3>
                </div>
                <div className="p-4 space-y-3">
                  {doc.recipients.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{r.department}</p>
                        {r.user_name && <p className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1"><ArrowRight className="w-3 h-3"/> {r.user_name}</p>}
                        {r.remarks && <p className="text-[11px] text-gray-400 italic mt-1.5 border-l-2 border-gray-200 pl-2">"{r.remarks}"</p>}
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0 border ${statusBadge(r.status === 'Received' ? 'Received' : r.status === 'Completed' ? 'Completed' : r.status === 'Rejected' ? 'Rejected' : 'In Transit')}`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {doc.status === 'Completed' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center shadow-sm">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-emerald-100 mx-auto mb-3 shadow-sm">
                  <CheckCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-emerald-800 font-bold text-sm uppercase tracking-wider">Completed</p>
                <p className="text-emerald-600 text-xs mt-1.5 font-medium leading-relaxed">This document is closed and can no longer be routed or edited.</p>
              </div>
            )}
          </div>

          {/* ── RIGHT: WORKSPACE — folder tabs for Action / Trail / Files ── */}
          <div className="lg:col-span-3">

            <div className="flex items-end gap-1 px-1">
              {visibleTabs.map(tab => {
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold uppercase tracking-wider transition-all
                      ${active
                        ? 'bg-white text-gray-900 -mb-px z-10 border border-b-0 border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-50 hover:text-gray-600 border border-b-0 border-transparent translate-y-0.5'}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.count != null && (
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full ${active ? 'bg-gray-100 text-gray-500' : 'bg-white/60 text-gray-400'}`}>{tab.count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="bg-white border border-gray-200 rounded-b-xl rounded-tr-xl overflow-hidden shadow-xl shadow-gray-200/50 relative z-0">

              {/* ── TAKE ACTION ── */}
              {activeTab === 'action' && hasAnyAction && (
                <div className="p-6 space-y-6">

                  {canReceive && (
                    <div className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                      <p className="font-bold text-gray-900 text-sm mb-1">Confirm receipt</p>
                      <p className="text-xs text-gray-500 mb-3">Let the sender know this document has arrived at your desk.</p>
                      <textarea value={receiveRemarks}
                        onChange={e => setReceiveRemarks(e.target.value)}
                        rows={2} placeholder="Any notes about this delivery? (optional)"
                        className={`${inputClass} resize-none mb-3`} />
                      <button onClick={handleReceive} disabled={actionLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
                        <Inbox className="w-4 h-4" /> Confirm Receipt
                      </button>
                    </div>
                  )}

                  {canForward && (
                    <div className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                      <p className="font-bold text-gray-900 text-sm mb-1">Send this document</p>
                      <p className="text-xs text-gray-500 mb-3">Choose where it should go next. Add more than one department if it needs to go to several places.</p>

                      <div className="space-y-3 mb-3">
                        {destinations.map((dest, index) => (
                          <div key={index} className="flex gap-3 items-start bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-inner">
                            <div className="flex-1 space-y-3">

                              <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Department <span className="text-red-500">*</span></label>
                                <select
                                  value={dest.department}
                                  onChange={(e) => handleDeptChange(index, e.target.value)}
                                  className={`${inputClass} py-2`}
                                >
                                  <option value="">Choose a department</option>
                                  {departments
                                    .filter(d => d.name !== user?.department && d.name !== 'System Administrator')
                                    .map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Specific person (optional)</label>
                                <select
                                  value={dest.to_user_id}
                                  onChange={(e) => handleUserChange(index, e.target.value)}
                                  disabled={!dest.department}
                                  className={`${inputClass} py-2 disabled:bg-gray-100 disabled:text-gray-400`}
                                >
                                  <option value="">Anyone in this department</option>
                                  {(usersByDept[dest.department] || []).map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                                  ))}
                                </select>
                              </div>

                            </div>

                            {destinations.length > 1 && (
                              <button onClick={() => removeDestination(index)} className="p-2 mt-6 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove this destination">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button onClick={addDestination} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mb-4 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add another department
                      </button>

                      <textarea value={forwardRemarks}
                        onChange={e => setForwardRemarks(e.target.value)}
                        rows={2} placeholder="Add instructions for the next department (optional)"
                        className={`${inputClass} resize-none mb-3`} />

                      <button onClick={handleForward}
                        disabled={actionLoading || destinations.every(d => !d.department)}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-amber-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" />
                        Send Document {destinations.filter(d => d.department).length > 1 ? `to ${destinations.filter(d => d.department).length} departments` : ''}
                      </button>
                    </div>
                  )}

                  {canReject && (
                    <div className="pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                      {!showReject ? (
                        <button onClick={() => setShowReject(true)}
                          className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                          <X className="w-4 h-4" /> Send this back
                        </button>
                      ) : (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Tell them why you're sending it back</p>
                          <textarea value={rejectRemarks}
                            onChange={e => setRejectRemarks(e.target.value)}
                            rows={3} placeholder="Explain what needs to be fixed…"
                            className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm mb-3 resize-none focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-400 placeholder-red-300 bg-white" />
                          <div className="flex gap-2">
                            <button onClick={handleReject} disabled={actionLoading || !rejectRemarks.trim()}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 shadow-sm">
                              Confirm & Send Back
                            </button>
                            <button onClick={() => { setShowReject(false); setRejectRemarks(''); }}
                              className="flex-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-bold transition">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {canComplete && (
                    <div>
                      <p className="font-bold text-gray-900 text-sm mb-1">Mark as completed</p>
                      <p className="text-xs text-gray-500 mb-3">This closes the document permanently — no further routing will be possible.</p>
                      <textarea value={completeRemarks}
                        onChange={e => setCompleteRemarks(e.target.value)}
                        rows={2} placeholder="Any closing notes? (optional)"
                        className={`${inputClass} resize-none mb-3`} />
                      <button onClick={handleComplete} disabled={actionLoading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
                        <CheckCheck className="w-4 h-4" /> Mark as Completed
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── DOCUMENT TRAIL ── */}
              {activeTab === 'trail' && (
                <div>
                  {history.length > 0 && (
                    <div className="px-6 pt-5 flex justify-end gap-1">
                      <button onClick={() => exportAuditTrailCSV(doc, history)} className="hover:bg-gray-50 text-gray-600 hover:text-emerald-600 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1.5 border border-gray-200"><Download className="w-3.5 h-3.5" /> CSV</button>
                      <button onClick={() => exportAuditTrailPDF(doc, history)} className="hover:bg-gray-50 text-gray-600 hover:text-rose-600 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1.5 border border-gray-200"><FileText className="w-3.5 h-3.5" /> PDF</button>
                    </div>
                  )}
                  <div className="p-6">
                    {history.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-medium">No activity yet — this document hasn't moved.</p>
                      </div>
                    ) : (
                      <div className="relative pl-3 space-y-0">
                        <div className="absolute left-4 top-2 bottom-4 w-px bg-gray-200" />

                        {history.map((event, i) => {
                          const isLast = i === history.length - 1;
                          return (
                            <div key={event.id ?? i} className="relative flex gap-5 group">
                              <div className="flex flex-col items-center flex-shrink-0 relative z-10 pt-1.5">
                                <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-white ${actionDotColor(event.action_taken ?? event.status)}`} />
                              </div>

                              <div className={`flex-1 min-w-0 pb-6 ${isLast ? 'pb-2' : ''}`}>
                                <p className="text-sm font-bold text-gray-900 tracking-tight leading-snug">{event.action_taken ?? event.status}</p>

                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-xs text-gray-500 font-medium">
                                  {event.from_department && (
                                    <span className="bg-gray-50 px-2 py-1 rounded-md border border-gray-200 shadow-sm flex items-center gap-1">
                                      <span className="text-gray-400">From:</span> <span className="text-gray-700 font-bold">{event.from_department}</span>
                                    </span>
                                  )}
                                  {event.to_department && (
                                    <span className="bg-gray-50 px-2 py-1 rounded-md border border-gray-200 shadow-sm flex items-center gap-1">
                                      <span className="text-gray-400">To:</span> <span className="text-gray-700 font-bold">{event.to_department}</span>
                                    </span>
                                  )}
                                  {event.to_user_name && (
                                    <span className="text-indigo-600 font-bold flex items-center gap-1">
                                      <ArrowRight className="w-3.5 h-3.5"/> {event.to_user_name}
                                    </span>
                                  )}
                                </div>

                                {event.remarks && (
                                  <div className="mt-2.5 bg-gray-50 border-l-2 border-indigo-300 py-2 px-3 rounded-r-lg">
                                    <p className="text-xs text-gray-600 italic leading-relaxed">"{event.remarks}"</p>
                                  </div>
                                )}

                                <div className="flex items-center gap-2 mt-2.5 text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" /> {event.performed_by || event.performed_by_name}
                                  </span>
                                  <span className="text-gray-300">•</span>
                                  <span className="flex items-center gap-1 text-gray-500 font-mono">
                                    <Clock className="w-3 h-3 text-gray-400" /> {new Date(event.created_at ?? event.timestamp).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── ATTACHMENTS ── */}
              {activeTab === 'files' && (
                <div className="p-6 space-y-6">

                  <div className="border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl p-5 transition-colors duration-200 group bg-gray-50/50">
                    <div className="text-center mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-2.5 shadow-sm transition-transform group-hover:scale-105">
                        <Upload className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium">PDF, Word, Excel, or images — up to 10MB each</p>
                    </div>

                    <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif" onChange={e => setSelectedFiles(Array.from(e.target.files))}
                      className="w-full text-xs font-medium text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:transition-colors file:cursor-pointer file:shadow-sm" />

                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                        {selectedFiles.map((file, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl shadow-sm font-medium">
                            <FileIcon type={file.type} className="w-4 h-4" />
                            <span className="flex-1 truncate text-gray-900 font-bold">{file.name}</span>
                            <span className="text-gray-400 font-mono text-[10px]">{formatFileSize(file.size)}</span>
                          </div>
                        ))}
                        <button onClick={handleUpload} disabled={uploadLoading} className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50">
                          {uploadLoading ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploadLoading ? 'Uploading…' : `Attach ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`}
                        </button>
                      </div>
                    )}
                  </div>

                  {attachments.length === 0 ? (
                    <div className="text-center py-2">
                      <p className="text-gray-400 text-sm font-medium">No files attached yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attachments.map(att => (
                        <div key={att.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 group">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                            <FileIcon type={att.file_type} className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{att.file_name}</p>
                            <p className="text-[10px] text-gray-500 mt-1 font-medium flex flex-col gap-0.5">
                              <span className="font-mono text-gray-400">{formatFileSize(att.file_size)}</span>
                              <span>{att.uploaded_by_name} • {new Date(att.uploaded_at).toLocaleDateString()}</span>
                            </p>
                          </div>
                          <div className="flex flex-col gap-1.5 flex-shrink-0 border-l border-gray-100 pl-3">
                            <button onClick={() => window.open(`http://localhost:5000/api/documents/attachments/${att.id}`, '_blank')}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Download">
                              <Download className="w-4 h-4" />
                            </button>
                            {(att.uploaded_by === user?.id || isSuperAdmin) && (
                              <button onClick={() => handleDeleteAttachment(att.id, att.file_name)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Remove">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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