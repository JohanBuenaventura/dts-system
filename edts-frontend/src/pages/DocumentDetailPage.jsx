// src/pages/DocumentDetailPage.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

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

const DocumentDetailPage = () => {
  const { id }       = useParams();
  const { user }     = useAuth();
  const [doc,     setDoc]     = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toDept,  setToDept]  = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchData = async () => {
    try {
      const [docRes, histRes] = await Promise.all([
        api.get(`/documents/${id}`),
        api.get(`/routing/${id}/history`),
      ]);
      setDoc(docRes.data.data);
      setHistory(histRes.data.history);
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

  const canReceive = doc.status === 'In Transit' &&
                     doc.current_location_dept === user.department;
  const canForward = doc.status !== 'Completed';
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

        {/* Message Banner */}
        {message.text && (
          <div className={`px-4 py-3 rounded-lg mb-5 text-sm font-medium
            ${message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-600'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — Document Info + Actions */}
          <div className="lg:col-span-1 space-y-5">

            {/* Document Info Card */}
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

            {/* Actions Card */}
            {doc.status !== 'Completed' && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Routing Actions</h3>

                {/* Receive */}
                {canReceive && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">
                      This document is addressed to your department.
                    </p>
                    <button onClick={handleReceive} disabled={actionLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-60">
                      📥 Receive Document
                    </button>
                  </div>
                )}

                {/* Forward */}
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

                {/* Complete */}
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
                <p className="text-green-500 text-xs mt-1">No further actions available.</p>
              </div>
            )}
          </div>

          {/* RIGHT — Audit Trail */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-gray-800 mb-6">
                📋 Audit Trail
                <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {history.length} events
                </span>
              </h3>

              {history.length === 0 ? (
                <p className="text-gray-400 text-sm">No history available.</p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />

                  <div className="space-y-6">
                    {history.map((log, index) => (
                      <div key={log.id} className="relative flex gap-4">
                        {/* Dot */}
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0
                          ${index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {index + 1}
                        </div>

                        {/* Content */}
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
                          </div>
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
          </div>

        </div>
      </div>
    </div>
  );
};

export default DocumentDetailPage;