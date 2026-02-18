import React, { useEffect, useState } from 'react';

interface FiscalizationLog {
    id: string;
    uuid: string;
    invoiceNumber: string;
    businessSpace: string;
    paymentDevice: string;
    status: 'SUCCESS' | 'ERROR';
    requestXml: string;
    responseXml: string;
    jir?: string;
    zki?: string;
    errors?: string;
    createdAt: string;
}

const FiscalizationDashboard: React.FC = () => {
    const [logs, setLogs] = useState<FiscalizationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<FiscalizationLog | null>(null);

    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const res = await fetch('http://localhost:3009/api/fiscalization/logs');
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('http://localhost:3009/api/fiscalization/test/f1', {
                method: 'POST'
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setTestResult({ success: true, message: `Success! JIR: ${data.jir}` });
                fetchLogs(); // Refresh logs to show the new entry
            } else {
                setTestResult({ success: false, message: data.error || 'Test failed' });
            }
        } catch (error: any) {
            setTestResult({ success: false, message: error.message || 'Connection failed' });
        } finally {
            setTesting(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('hr-HR');
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Fiscalization Dashboard (F1/F2)</h1>
                <button
                    onClick={handleTestConnection}
                    disabled={testing}
                    className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-colors ${testing ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                >
                    {testing ? 'Testing...' : 'Test F1 Connection'}
                </button>
            </div>

            {testResult && (
                <div className={`mb-6 p-4 rounded-md ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                    <p className="font-medium">{testResult.success ? 'Connection Successful' : 'Test Failed'}</p>
                    <p className="text-sm mt-1">{testResult.message}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Total Requests</h3>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">{logs.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
                    <p className="mt-2 text-3xl font-semibold text-emerald-600">
                        {logs.length > 0
                            ? ((logs.filter(l => l.status === 'SUCCESS').length / logs.length) * 100).toFixed(1)
                            : 0}%
                    </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Errors</h3>
                    <p className="mt-2 text-3xl font-semibold text-red-600">
                        {logs.filter(l => l.status === 'ERROR').length}
                    </p>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-medium text-gray-900">Request Log</h2>
                    <button
                        onClick={fetchLogs}
                        className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JIR / Errors</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading logs...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No fiscalization requests found.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(log.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {log.invoiceNumber || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {log.status === 'SUCCESS' ? (
                                                <span className="font-mono text-xs">{log.jir}</span>
                                            ) : (
                                                <span className="text-red-500 truncate">{log.errors}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">
                                Request Details: {selectedLog.invoiceNumber}
                            </h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">UUID</p>
                                    <p className="text-sm font-mono">{selectedLog.uuid}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">ZKI</p>
                                    <p className="text-sm font-mono break-all">{selectedLog.zki || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">JIR</p>
                                    <p className="text-sm font-mono break-all">{selectedLog.jir || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Time</p>
                                    <p className="text-sm">{formatDate(selectedLog.createdAt)}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Request XML</h4>
                                    <pre className="bg-gray-50 p-4 rounded-md text-xs font-mono overflow-x-auto border border-gray-200">
                                        {selectedLog.requestXml}
                                    </pre>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Response XML</h4>
                                    <pre className="bg-gray-50 p-4 rounded-md text-xs font-mono overflow-x-auto border border-gray-200">
                                        {selectedLog.responseXml || 'No response'}
                                    </pre>
                                </div>
                                {selectedLog.errors && (
                                    <div>
                                        <h4 className="text-sm font-medium text-red-900 mb-2">Errors</h4>
                                        <div className="bg-red-50 p-4 rounded-md text-sm text-red-700 border border-red-200">
                                            {selectedLog.errors}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FiscalizationDashboard;
