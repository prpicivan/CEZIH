
import { useState, useMemo } from 'react';
import { PROCEDURE_DATA } from '../data/mockProcedures';

interface ProcedurePickerProps {
    value: string;
    onChange: (code: string) => void;
    onSelect?: (procedure: any) => void;
}

export default function ProcedurePicker({ value, onChange, onSelect }: ProcedurePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Filter procedures based on search
    const filteredProcedures = useMemo(() => {
        if (!search) return PROCEDURE_DATA.slice(0, 10);
        const lowerFn = search.toLowerCase();
        return PROCEDURE_DATA.filter(p =>
            p.code.toLowerCase().includes(lowerFn) ||
            p.name.toLowerCase().includes(lowerFn)
        ).slice(0, 10);
    }, [search]);

    // Find the currently selected procedure object to display its name
    const selectedProcedure = PROCEDURE_DATA.find(p => p.code === value);

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">Procedure (Blue Book)</label>

            {/* Trigger Input */}
            <div
                className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm px-3 py-2 bg-white cursor-text flex justify-between items-center focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500"
                onClick={() => setIsOpen(true)}
            >
                <div className={value ? 'text-slate-900' : 'text-slate-400'}>
                    {value ? (
                        <span className="flex flex-col text-left">
                            <span className="text-sm font-semibold">{value}</span>
                            <span className="text-xs text-slate-600 truncate">{selectedProcedure?.name || 'Unknown Procedure'}</span>
                        </span>
                    ) : (
                        'Search procedure...'
                    )}
                </div>

                {value && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onChange(''); setSearch(''); }}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    <div className="p-2 border-b sticky top-0 bg-white">
                        <input
                            type="text"
                            className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Type code or name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {filteredProcedures.length === 0 ? (
                        <div className="cursor-default select-none relative py-2 px-4 text-slate-700">No results found.</div>
                    ) : (
                        filteredProcedures.map((proc) => (
                            <div
                                key={proc.code}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 border-b border-slate-50 hover:bg-blue-50 ${value === proc.code ? 'bg-blue-100 text-blue-900' : 'text-slate-900'}`}
                                onClick={() => {
                                    onChange(proc.code);
                                    if (onSelect) onSelect(proc);
                                    setIsOpen(false);
                                }}
                            >
                                <div className="flex flex-col text-left">
                                    <span className="font-bold text-xs text-blue-600">{proc.code}</span>
                                    <span className="text-sm">{proc.name}</span>
                                </div>
                            </div>
                        ))
                    )}

                    <div
                        className="p-2 text-xs text-center text-slate-500 hover:bg-slate-50 cursor-pointer sticky bottom-0 bg-white border-t"
                        onClick={() => setIsOpen(false)}
                    >
                        Close
                    </div>
                </div>
            )}

            {/* Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />
            )}
        </div>
    );
}
