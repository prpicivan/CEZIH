
import { useState, useEffect, useMemo } from 'react';
import { searchMKB10 } from '../services/api';

interface DiagnosisPickerProps {
    value?: string;
    onChange?: (code: string) => void;
    onSelect?: (diagnosis: any) => void;
}

export default function DiagnosisPicker({ value, onChange, onSelect }: DiagnosisPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [diagnoses, setDiagnoses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchDiagnoses = async () => {
            setLoading(true);
            try {
                const data = await searchMKB10(search);
                setDiagnoses(data);
            } catch (err) {
                console.error("Failed to fetch MKB-10", err);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchDiagnoses, 300); // Debounce
        return () => clearTimeout(timeoutId);
    }, [search]);

    const selectedDiagnosis = diagnoses.find(d => d.code === value);

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis (MKB-10)</label>

            {/* Selected Value Display / Trigger */}
            <div
                className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm px-3 py-2 bg-white cursor-text flex justify-between items-center focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500"
                onClick={() => setIsOpen(true)}
            >
                <span className={value ? 'text-slate-900' : 'text-slate-400'}>
                    {value ? `${value} - ${selectedDiagnosis?.name || 'Unknown'}` : 'Search diagnosis...'}
                </span>
                {value && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if (onChange) onChange(''); setSearch(''); }}
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

                    {loading ? (
                        <div className="py-2 px-4 text-slate-400 text-xs italic">Searching MKB-10 database...</div>
                    ) : diagnoses.length === 0 ? (
                        <div className="cursor-default select-none relative py-2 px-4 text-slate-700">No results found.</div>
                    ) : (
                        diagnoses.map((diagnosis) => (
                            <div
                                key={diagnosis.code}
                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 ${value === diagnosis.code ? 'bg-blue-100 text-blue-900' : 'text-slate-900'}`}
                                onClick={() => {
                                    if (onChange) onChange(diagnosis.code);
                                    if (onSelect) onSelect(diagnosis);
                                    setIsOpen(false);
                                }}
                            >
                                <div className="flex items-center">
                                    <span className="font-bold w-16">{diagnosis.code}</span>
                                    <span className="truncate">{diagnosis.name}</span>
                                </div>
                            </div>
                        ))
                    )}

                    <div
                        className="border-t p-2 text-xs text-center text-slate-500 hover:bg-slate-50 cursor-pointer"
                        onClick={() => setIsOpen(false)}
                    >
                        Close
                    </div>
                </div>
            )}

            {/* Overlay to close on click outside */}
            {isOpen && (
                <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />
            )}
        </div>
    );
}
