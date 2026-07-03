import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { Client } from '../types';
import { Plus, Trash2, Mail, Phone, MapPin, Building, Search, UserCheck, AlertCircle, X, Check, UserPlus } from 'lucide-react';

export const ClientModule: React.FC = () => {
  const { clients, saveClient, removeClient, isSyncing } = useBusiness();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal('');

    if (!name || !email) {
      setErrorLocal('Name and Email fields are required.');
      return;
    }

    try {
      const clientPayload = {
        id: "cli_" + Date.now().toString(),
        name,
        email,
        phone,
        company,
        address
      };
      await saveClient(clientPayload);
      
      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setAddress('');
      setShowAddForm(false);
    } catch (err: any) {
      setErrorLocal(err.message || 'Saving client failed');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      
      {/* Header and Add client trigger row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Clients Register</h2>
          <p className="text-xs text-slate-500">Manage custom corporate accounts, contact details, and ledger profiles.</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-300 shadow-md cursor-pointer select-none active:scale-[0.98] ${
            showAddForm
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 shadow-rose-100/50'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-100 shadow-indigo-500/10'
          }`}
        >
          {showAddForm ? (
            <>
              <X className="w-4 h-4" />
              Close Add Form
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Add Customer Account
            </>
          )}
        </button>
      </div>

      {/* Slide down Add client Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-250 rounded-xl p-6 shadow-sm flex flex-col gap-4 max-w-2xl animate-slideDown">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              Register New Customer Credentials
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorLocal && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded p-3 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4" />
              <span>{errorLocal}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Contact Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 transition-all font-sans"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="billing@customer.com"
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 transition-all font-sans"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 0199"
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-indigo-505 transition-all font-sans"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Company Name</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Corporates"
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-indigo-505 transition-all font-sans"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono font-medium text-slate-500 uppercase">Billing Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Financial Way, Block B, Suite 10, New York, NY"
              rows={2}
              className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2.5 text-xs outline-none focus:border-indigo-505 transition-all font-sans resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 mt-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-550 transition-all cursor-pointer border border-transparent hover:border-slate-200 flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-100"
            >
              <Check className="w-3.5 h-3.5" />
              Register Customer Account
            </button>
          </div>
        </form>
      )}

      {/* Search Input Bar */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-400 group focus-within:border-blue-500 w-full sm:max-w-md transition-all">
        <Search className="w-4 h-4 group-focus-within:text-blue-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter clients by name, email or company..."
          className="text-xs w-full bg-transparent outline-none text-slate-700 font-sans"
        />
      </div>

      {/* Directory Grid of registered clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200">
            <div>
              <div className="flex justify-between items-start gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0 select-none text-xs">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                
                <button
                  onClick={() => removeClient(c.id)}
                  title="Remove Client"
                  className="p-1 rounded text-slate-305 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="font-bold text-sm text-slate-800 leading-snug">{c.name}</h3>
              {c.company && (
                <p className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                  <Building className="w-3.5 h-3.5" />
                  {c.company}
                </p>
              )}

              <div className="flex flex-col gap-1.5 mt-4 text-xs text-slate-550 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2" title="Client Email">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{c.email}</span>
                </div>
                {c.phone && (
                  <div className="flex items-center gap-2" title="Client Phone">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.address && (
                  <div className="flex items-start gap-2" title="Client Address">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-normal line-clamp-2">{c.address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 mt-4 text-[10px] text-slate-400 font-mono leading-none border-t border-slate-100 pt-3">
              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Registered on: {c.createdAt.slice(0, 10)}</span>
            </div>
          </div>
        ))}

        {filteredClients.length === 0 && (
          <div className="col-span-full border border-dashed border-slate-200 rounded-xl p-10 text-center flex flex-col items-center justify-center gap-2 bg-slate-50/50">
            <Mail className="w-8 h-8 text-slate-350" />
            <h4 className="text-sm font-bold text-slate-700">No Customers Found</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-normal">Register your clients here to easily generate quotations, balance sheets, and send automated email statements.</p>
          </div>
        )}
      </div>

    </div>
  );
};
