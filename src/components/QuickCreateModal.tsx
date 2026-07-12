import React from 'react';
import { useNav } from '../context/NavContext';
import {
  X,
  FileSpreadsheet,
  FileCheck,
  Users2,
  PackageCheck,
  Zap,
} from 'lucide-react';

const actions = [
  {
    id: 'invoices' as const,
    title: 'New invoice',
    desc: 'Bill a client with line items & tax',
    icon: FileSpreadsheet,
    color: 'bg-blue-50 text-blue-600 border-blue-100',
  },
  {
    id: 'quotations' as const,
    title: 'New quotation',
    desc: 'Send a proposal and convert later',
    icon: FileCheck,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  },
  {
    id: 'clients' as const,
    title: 'New client',
    desc: 'Add billing contact details',
    icon: Users2,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  },
  {
    id: 'inventory' as const,
    title: 'New product / service',
    desc: 'Catalog pricing for quick line items',
    icon: PackageCheck,
    color: 'bg-amber-50 text-amber-600 border-amber-100',
  },
];

export const QuickCreateModal: React.FC = () => {
  const { openQuickCreate, setOpenQuickCreate, goTo } = useNav();
  if (!openQuickCreate) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => setOpenQuickCreate(false)}
      />
      <div className="relative w-full max-w-lg card-modern p-2 shadow-2xl animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Quick create</p>
              <p className="text-[11px] text-slate-400">Jump straight into a workflow</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpenQuickCreate(false)}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => goTo(a.id)}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 text-left transition-all cursor-pointer group"
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${a.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700">
                    {a.title}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{a.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
          Tip: press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">C</kbd> anytime for quick create
        </div>
      </div>
    </div>
  );
};
