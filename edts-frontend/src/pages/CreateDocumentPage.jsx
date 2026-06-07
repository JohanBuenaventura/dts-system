// src/pages/CreateDocumentPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const DOC_TYPES = [
  'Financial', 'Administrative', 'Academic', 'HR', 'Legal',
  'Procurement', 'Research', 'Correspondence', 'Other',
];

const CreateDocumentPage = () => {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', type: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/documents', form);
      navigate(`/documents/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create document.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <div className="text-sm text-gray-400 mb-6">
          <Link to="/documents" className="hover:text-blue-600">Documents</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">New Document</span>
        </div>

        <div className="bg-white rounded-xl shadow p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Create New Document</h2>
          <p className="text-sm text-gray-500 mb-6">
            Originating Department: <span className="font-medium text-blue-700">{user?.department}</span>
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Title <span className="text-red-500">*</span>
              </label>
              <input type="text" name="title" value={form.title}
                onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Budget Proposal 2024" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type <span className="text-red-500">*</span>
              </label>
              <select name="type" value={form.type} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Select Type --</option>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" value={form.description}
                onChange={handleChange} rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Optional details about this document..." />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2.5 rounded-lg transition disabled:opacity-60">
                {loading ? 'Creating...' : 'Create Document'}
              </button>
              <Link to="/documents"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-2.5 rounded-lg transition">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateDocumentPage;