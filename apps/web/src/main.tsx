import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import GPPortal from './pages/GPPortal'
import CezihDashboard from './pages/CezihDashboard'
import AppointmentsPage from './pages/AppointmentsPage'
import ClinicalFindingForm from './pages/ClinicalFindingForm'
import InvoicePrintView from './pages/InvoicePrintView'
import RegistryHub from './pages/RegistryHub'
import InsuranceCheck from './pages/InsuranceCheck'
import CalendarPage from './pages/CalendarPage' // Import Calendar
import FiscalizationDashboard from './pages/FiscalizationDashboard' // Import Fiscalization Dashboard
import './index.css'

function App() {
    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors border-b-2 ${isActive
            ? 'text-emerald-600 border-emerald-600'
            : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-200'
        }`;

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-slate-50">
                <nav className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16">
                            <div className="flex space-x-8">
                                <NavLink to="/" className={navLinkClass}>
                                    Dashboard
                                </NavLink>
                                <NavLink to="/calendar" className={navLinkClass}>
                                    Calendar
                                </NavLink>
                                <NavLink to="/gp-portal" className={navLinkClass}>
                                    GP Portal
                                </NavLink>
                                <NavLink to="/appointments" className={navLinkClass}>
                                    Appointments
                                </NavLink>
                                <NavLink to="/insurance-check" className={navLinkClass}>
                                    Provjera Osiguranja
                                </NavLink>
                                <NavLink to="/fiscalization" className={navLinkClass}>
                                    Fiskalizacija
                                </NavLink>
                                <NavLink to="/admin/registries" className={navLinkClass}>
                                    Šifrarnici
                                </NavLink>
                            </div>
                        </div>
                    </div>
                </nav>

                <main>
                    <Routes>
                        <Route path="/" element={<CezihDashboard />} />
                        <Route path="/calendar" element={<CalendarPage />} />
                        <Route path="/gp-portal" element={<GPPortal />} />
                        <Route path="/appointments" element={<AppointmentsPage />} />
                        <Route path="/insurance-check" element={<InsuranceCheck />} />
                        <Route path="/fiscalization" element={<FiscalizationDashboard />} />
                        <Route path="/findings/new" element={<ClinicalFindingForm />} />
                        <Route path="/invoices/:id/print" element={<InvoicePrintView />} />
                        <Route path="/admin/registries" element={<RegistryHub />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    )
}

function HomePage() {
    return (
        <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">CEZIH Healthcare System</h1>
                    <p className="text-gray-600">Welcome to the unified CEZIH healthcare management system</p>
                </div>
            </div>
        </div>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
