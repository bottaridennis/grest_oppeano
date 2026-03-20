/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  linkWithPopup,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  getDoc,
  addDoc,
  Timestamp,
  orderBy,
  getDocFromServer,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db, testConnection } from './firebase';
import { UserProfile, Registration, GrestEvent, UserRole, Attendance, Survey, SurveyResponse, ScheduleItem, Announcement, LegalContent, Notification, NotificationRead } from './types';
import { COMMON_ALLERGIES } from './constants';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Menu,
  LayoutDashboard, 
  UserCircle, 
  Calendar, 
  PlusCircle, 
  LogOut, 
  LogIn,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Info,
  MapPin,
  Users,
  Vote,
  Check,
  X,
  ListTodo,
  Timer,
  Link as LinkIcon,
  Search,
  UserPlus,
  Trash2,
  Plus,
  Heart,
  ShieldCheck,
  Home,
  Settings,
  FileText,
  Megaphone,
  BarChart3,
  Edit2,
  CreditCard,
  ChevronDown,
  MoreVertical,
  Bell,
  TrendingUp,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function DeleteButton({ onDelete, className = "" }: { onDelete: () => void, className?: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div className="relative inline-block">
      <button 
        onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }} 
        className={`p-4 text-app-muted hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all duration-300 border border-transparent hover:border-rose-100 ${className}`}
      >
        <Trash2 className="w-5 h-5" />
      </button>
      <AnimatePresence>
        {showConfirm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute right-0 bottom-full mb-4 z-[100] bg-white p-6 rounded-[2rem] shadow-2xl border border-app-border min-w-[240px]"
          >
            <p className="text-sm font-bold text-app-text mb-4 font-serif italic">Sei sicuro di voler eliminare?</p>
            <div className="flex gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }} 
                className="flex-1 px-4 py-2.5 text-[10px] font-bold text-app-muted uppercase tracking-widest hover:bg-app-bg rounded-xl transition-colors border border-app-border"
              >
                Annulla
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); setShowConfirm(false); }} 
                className="flex-1 px-4 py-2.5 text-[10px] font-bold bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-200 hover:bg-rose-600 transition-all uppercase tracking-widest"
              >
                Elimina
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const AdvancedStatistics: React.FC<{
  registrations: Registration[];
  users: UserProfile[];
  attendance: Attendance[];
  surveys: Survey[];
  responses: SurveyResponse[];
}> = ({ registrations, users, attendance, surveys, responses }) => {
  // 1. Registrations by Status
  const statusData = [
    { name: 'Confermate', value: registrations.filter(r => r.status === 'confirmed').length },
    { name: 'In Sospeso', value: registrations.filter(r => r.status === 'pending').length },
    { name: 'Annullate', value: registrations.filter(r => r.status === 'cancelled').length },
  ];

  // 2. Attendance Trend (Last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const attendanceTrend = last7Days.map(date => ({
    date: new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
    presenti: attendance.filter(a => a.date === date && a.present).length,
  }));

  // 3. User Roles Distribution
  const roleData = [
    { name: 'Genitori', value: users.filter(u => u.role === 'parent').length },
    { name: 'Animatori', value: users.filter(u => u.role === 'animator').length },
    { name: 'Admin', value: users.filter(u => u.role === 'admin').length },
  ];

  // 4. Survey Participation
  const surveyStats = surveys.map(s => {
    const resp = responses.filter(r => r.surveyId === s.id && r.participating);
    return {
      name: s.title.length > 15 ? s.title.substring(0, 15) + '...' : s.title,
      partecipanti: resp.length,
      obiettivo: s.minParticipants || 0
    };
  });

  const COLORS = ['#f27d26', '#10b981', '#f43f5e', '#6366f1'];

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
        {/* Attendance Trend */}
        <div className="bg-app-card p-10 rounded-[3.5rem] border border-app-border shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h4 className="text-2xl font-bold text-app-text font-serif italic">Andamento Presenze</h4>
            <TrendingUp className="w-6 h-6 text-app-accent/20" />
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend}>
                <defs>
                  <linearGradient id="colorPresenti" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f27d26" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f27d26" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} strokeOpacity={0.5} />
                <XAxis dataKey="date" stroke="#78716c" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#78716c" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E4E3E0', borderRadius: '20px', color: '#141414', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#F27D26', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="presenti" stroke="#F27D26" strokeWidth={4} fillOpacity={1} fill="url(#colorPresenti)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Registration Status */}
        <div className="bg-app-card p-10 rounded-[3.5rem] border border-app-border shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h4 className="text-2xl font-bold text-app-text font-serif italic">Stato Iscrizioni</h4>
            <PieChart className="w-6 h-6 text-app-accent/20" />
          </div>
          <div className="h-[350px] w-full flex flex-col md:flex-row items-center">
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4 md:pl-8 mt-8 md:mt-0 w-full md:w-auto">
              {statusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between md:justify-start gap-4 p-3 bg-app-bg/50 rounded-2xl border border-app-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-app-muted">{entry.name}</span>
                  </div>
                  <span className="text-lg font-bold text-app-text font-serif italic ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Survey Participation */}
        <div className="bg-app-card p-10 rounded-[3.5rem] border border-app-border shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h4 className="text-2xl font-bold text-app-text font-serif italic">Partecipazione Sondaggi</h4>
            <BarChart3 className="w-6 h-6 text-app-accent/20" />
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={surveyStats} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} strokeOpacity={0.5} />
                <XAxis type="number" stroke="#78716c" fontSize={10} hide />
                <YAxis dataKey="name" type="category" stroke="#78716c" fontSize={10} width={120} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="partecipanti" fill="#f27d26" radius={[0, 12, 12, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Roles */}
        <div className="bg-app-card p-10 rounded-[3.5rem] border border-app-border shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h4 className="text-2xl font-bold text-app-text font-serif italic">Distribuzione Ruoli</h4>
            <UserCircle className="w-6 h-6 text-app-accent/20" />
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleData} margin={{ top: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} strokeOpacity={0.5} />
                <XAxis dataKey="name" stroke="#78716c" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#78716c" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#141414" radius={[12, 12, 0, 0]} barSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminNotificationManager: React.FC<{
  onSend: (data: any) => void;
  onDelete: (id: string) => void;
  notifications: Notification[];
}> = ({ onSend, onDelete, notifications }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'urgent',
    targetGroup: 'all' as 'all' | 'parents' | 'animators'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(formData);
    setFormData({ title: '', message: '', type: 'info', targetGroup: 'all' });
    setIsAdding(false);
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h3 className="text-3xl font-bold text-warm-text font-serif italic">Notifiche Push</h3>
          <p className="text-sm text-warm-muted font-sans mt-1">Invia avvisi istantanei ai dispositivi degli utenti.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-all shadow-xl ${isAdding ? 'bg-warm-bg text-warm-muted border border-warm-border' : 'bg-warm-accent text-white shadow-warm-accent/20 hover:scale-[1.02]'}`}
        >
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          <span className="font-serif italic text-lg">{isAdding ? 'Annulla' : 'Nuova Notifica'}</span>
        </button>
      </div>

      {isAdding && (
        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white p-10 rounded-[3rem] border border-warm-border shadow-sm space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="micro-label ml-2">Titolo</label>
              <input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="modern-input" placeholder="Titolo della notifica" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="micro-label ml-2">Tipo</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className="modern-input appearance-none cursor-pointer">
                  <option value="info">Info</option>
                  <option value="warning">Avviso</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="micro-label ml-2">Destinatari</label>
                <select value={formData.targetGroup} onChange={e => setFormData({ ...formData, targetGroup: e.target.value as any })} className="modern-input appearance-none cursor-pointer">
                  <option value="all">Tutti</option>
                  <option value="parents">Genitori</option>
                  <option value="animators">Animatori</option>
                </select>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <label className="micro-label ml-2">Messaggio</label>
            <textarea required rows={4} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} className="modern-input resize-none" placeholder="Scrivi qui il messaggio..." />
          </div>
          <button type="submit" className="w-full py-6 bg-warm-accent text-white rounded-full font-bold hover:bg-warm-accent/90 transition-all shadow-xl shadow-warm-accent/20 font-serif text-xl italic">
            Invia a tutti i dispositivi
          </button>
        </motion.form>
      )}

      <div className="grid gap-6">
        {notifications.map(notif => (
          <div key={notif.id} className="p-8 rounded-[3rem] border border-warm-border bg-white flex items-center justify-between group hover:shadow-xl transition-all shadow-sm">
            <div className="flex items-center gap-8">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${
                notif.type === 'urgent' ? 'bg-rose-50 text-rose-500 border border-rose-100' : 
                notif.type === 'warning' ? 'bg-amber-50 text-amber-500 border border-amber-100' : 
                'bg-emerald-50 text-emerald-500 border border-emerald-100'
              }`}>
                <Bell className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h4 className="font-bold text-warm-text text-xl font-serif italic">{notif.title}</h4>
                  <span className="px-3 py-1 bg-warm-bg text-[10px] font-bold uppercase tracking-widest rounded-lg border border-warm-border text-warm-muted">{notif.targetGroup}</span>
                </div>
                <p className="text-warm-muted text-base font-light leading-relaxed">{notif.message}</p>
                <p className="micro-label mt-3 opacity-40">{new Date(notif.createdAt.toDate()).toLocaleString('it-IT')}</p>
              </div>
            </div>
            <DeleteButton onDelete={() => onDelete(notif.id!)} />
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="py-24 text-center bg-white rounded-[3rem] border border-warm-border">
            <Bell className="w-16 h-16 text-warm-accent/10 mx-auto mb-6" />
            <p className="text-warm-muted italic font-serif text-xl">Nessuna notifica inviata.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      try {
        const parsed = JSON.parse(event.error.message);
        setErrorMessage(parsed.error || 'Si è verificato un errore imprevisto.');
      } catch {
        setErrorMessage(event.error.message || 'Si è verificato un errore imprevisto.');
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg p-6">
        <div className="bg-app-card p-12 md:p-16 rounded-[4rem] shadow-2xl max-w-lg w-full text-center border border-app-border">
          <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-rose-100">
            <XCircle className="w-12 h-12 text-rose-500" />
          </div>
          <h2 className="text-4xl font-bold text-app-text mb-4 font-serif italic">Ops! Qualcosa è andato storto</h2>
          <p className="text-app-muted mb-10 leading-relaxed text-lg font-light">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-6 bg-app-accent text-white rounded-full font-bold hover:bg-app-accent/90 transition-all shadow-xl shadow-app-accent/20 font-serif text-xl italic"
          >
            Ricarica l'applicazione
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const AdminDashboard: React.FC<{
  registrations: Registration[];
  users: UserProfile[];
  surveys: Survey[];
  responses: SurveyResponse[];
}> = ({ registrations, users, surveys, responses }) => {
  const stats = [
    { label: 'Iscrizioni Confermate', value: registrations.filter(r => r.status === 'confirmed').length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'In Sospeso', value: registrations.filter(r => r.status === 'pending').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Utenti Registrati', value: users.length, icon: UserCircle, color: 'text-warm-accent', bg: 'bg-warm-accent/10' },
    { label: 'Sondaggi Attivi', value: surveys.filter(s => s.active).length, icon: Vote, color: 'text-warm-accent', bg: 'bg-warm-accent/10' },
  ];

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-warm-card p-8 rounded-[3rem] border border-warm-border hover:shadow-2xl hover:shadow-warm-accent/5 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-warm-accent/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-warm-accent/10 transition-all duration-500" />
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-8 group-hover:bg-warm-accent group-hover:text-white transition-all duration-500 border border-current/10`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <p className="micro-label mb-2 opacity-60">{stat.label}</p>
            <p className="text-4xl font-bold text-warm-text font-serif italic">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3.5rem] border border-warm-border shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h4 className="text-2xl font-bold text-warm-text font-serif italic">Ultime Iscrizioni</h4>
            <Users className="w-6 h-6 text-warm-accent/20" />
          </div>
          <div className="space-y-3">
            {registrations.slice(0, 5).map(reg => (
              <div key={reg.id} className="p-5 flex items-center justify-between rounded-3xl bg-warm-bg/50 border border-warm-border/50 hover:border-warm-accent/20 transition-all group">
                <div className="flex items-center gap-5 min-w-0">
                  <div className="w-12 h-12 bg-warm-accent/10 text-warm-accent rounded-2xl flex items-center justify-center font-bold flex-shrink-0 font-serif italic text-lg">
                    {reg.childName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-warm-text truncate font-serif italic text-lg">{reg.childName} {reg.childSurname}</p>
                    <p className="text-[10px] text-warm-muted uppercase tracking-widest mt-1">
                      {new Date(reg.createdAt.toDate()).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                  reg.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {reg.status}
                </span>
              </div>
            ))}
            {registrations.length === 0 && (
              <p className="text-center py-12 text-warm-muted italic font-serif">Nessuna iscrizione recente.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border border-warm-border shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <h4 className="text-2xl font-bold text-warm-text font-serif italic">Stato Sondaggi</h4>
            <Vote className="w-6 h-6 text-warm-accent/20" />
          </div>
          <div className="space-y-6">
            {surveys.slice(0, 3).map(survey => {
              const surveyResponses = responses.filter(r => r.surveyId === survey.id);
              const total = surveyResponses.length;
              const participating = surveyResponses.filter(r => r.participating).length;
              const percentage = total > 0 ? Math.round((participating / total) * 100) : 0;
              
              return (
                <div key={survey.id} className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-warm-text font-serif italic text-lg truncate">{survey.title}</p>
                      <p className="text-[10px] text-warm-muted uppercase tracking-widest mt-1">{total} risposte totali</p>
                    </div>
                    <p className="text-2xl font-bold text-warm-accent font-serif italic ml-4">{percentage}% <span className="text-[10px] text-warm-muted uppercase tracking-widest font-sans not-italic">Sì</span></p>
                  </div>
                  <div className="h-3 bg-warm-bg rounded-full overflow-hidden border border-warm-border">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-warm-accent shadow-[0_0_10px_rgba(var(--color-warm-accent-rgb),0.3)]"
                    />
                  </div>
                </div>
              );
            })}
            {surveys.length === 0 && (
              <p className="text-center py-12 text-warm-muted italic font-serif">Nessun sondaggio recente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnnouncementManager: React.FC<{
  announcements: Announcement[];
  onAdd: (data: any) => void;
  onDelete: (id: string) => void;
}> = ({ announcements, onAdd, onDelete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', type: 'info' as 'info' | 'warning' | 'urgent' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setFormData({ title: '', content: '', type: 'info' });
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 md:space-y-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h3 className="text-3xl font-bold text-warm-text font-serif italic">Gestione Annunci</h3>
          <p className="text-sm text-warm-muted font-sans mt-1">Pubblica comunicazioni visibili a tutti i genitori in home page.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold transition-all shadow-xl ${isAdding ? 'bg-warm-bg text-warm-muted border border-warm-border' : 'bg-warm-accent text-white shadow-warm-accent/20 hover:scale-[1.02]'}`}
        >
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          <span className="font-serif italic text-lg">{isAdding ? 'Annulla' : 'Nuovo Annuncio'}</span>
        </button>
      </div>

      {isAdding && (
        <motion.form 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          onSubmit={handleSubmit}
          className="bg-white p-10 rounded-[3rem] border border-warm-border shadow-sm space-y-8"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="micro-label ml-2">Titolo</label>
              <input 
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="modern-input"
                placeholder="Titolo dell'annuncio..."
              />
            </div>
            <div className="space-y-3">
              <label className="micro-label ml-2">Tipo</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="modern-input cursor-pointer"
              >
                <option value="info">Info</option>
                <option value="warning">Avviso</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="micro-label ml-2">Contenuto</label>
            <textarea 
              required
              rows={4}
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              className="modern-input resize-none"
              placeholder="Scrivi qui il contenuto dell'annuncio..."
            />
          </div>
          <button type="submit" className="w-full py-6 bg-warm-accent text-white rounded-full font-bold hover:bg-warm-accent/90 transition-all shadow-xl shadow-warm-accent/20 font-serif text-xl italic">
            Pubblica Annuncio
          </button>
        </motion.form>
      )}

      <div className="grid gap-6">
        {announcements.map(ann => (
          <div key={ann.id} className="p-8 rounded-[3rem] border border-warm-border bg-white flex flex-col sm:flex-row justify-between items-start gap-6 group hover:shadow-xl transition-all shadow-sm">
            <div className="flex gap-6">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center border flex-shrink-0 ${
                ann.type === 'urgent' ? 'bg-rose-50 text-rose-500 border-rose-100' :
                ann.type === 'warning' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                'bg-emerald-50 text-emerald-500 border-emerald-100'
              }`}>
                <Megaphone className="w-8 h-8" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-4 mb-2">
                  <h4 className="font-bold text-xl text-warm-text font-serif italic">{ann.title}</h4>
                  <span className="px-3 py-1 bg-warm-bg text-[10px] font-bold uppercase tracking-widest rounded-lg border border-warm-border text-warm-muted">{new Date(ann.createdAt.toDate()).toLocaleDateString('it-IT')}</span>
                </div>
                <p className="text-warm-muted text-base font-light leading-relaxed">{ann.content}</p>
              </div>
            </div>
            <div className="w-full sm:w-auto flex justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-warm-border/50">
              <DeleteButton onDelete={() => onDelete(ann.id!)} />
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="py-24 text-center bg-white rounded-[3rem] border border-warm-border">
            <Megaphone className="w-16 h-16 text-warm-accent/10 mx-auto mb-6" />
            <p className="text-warm-muted italic font-serif text-xl">Nessun annuncio pubblicato.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ManualUserForm: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'parent' as UserRole,
    tempPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Call backend to create auth user
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.tempPassword,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione dell\'utente');
      }

      const { uid } = await response.json();

      await setDoc(doc(db, 'users', uid), {
        uid,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        mustChangePassword: true,
        createdAt: Timestamp.now()
      });

      onComplete();
      setFormData({ firstName: '', lastName: '', email: '', phone: '', role: 'parent', tempPassword: '' });
      alert('Utente creato con successo. Comunica la password temporanea all\'interessato.');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'users');
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="micro-label ml-2">Nome</label>
          <input 
            required
            value={formData.firstName}
            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
            className="modern-input"
            placeholder="Nome..."
          />
        </div>
        <div className="space-y-3">
          <label className="micro-label ml-2">Cognome</label>
          <input 
            required
            value={formData.lastName}
            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
            className="modern-input"
            placeholder="Cognome..."
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="micro-label ml-2">Email</label>
          <input 
            type="email"
            required
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="modern-input"
            placeholder="email@esempio.com"
          />
        </div>
        <div className="space-y-3">
          <label className="micro-label ml-2">Password Temporanea</label>
          <input 
            required
            type="password"
            value={formData.tempPassword}
            onChange={e => setFormData({ ...formData, tempPassword: e.target.value })}
            className="modern-input"
            placeholder="Password..."
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="micro-label ml-2">Telefono</label>
          <input 
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="modern-input"
            placeholder="333 1234567"
          />
        </div>
        <div className="space-y-3">
          <label className="micro-label ml-2">Ruolo</label>
          <select 
            value={formData.role}
            onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
            className="modern-input cursor-pointer"
          >
            <option value="parent">Genitore</option>
            <option value="animator">Animatore</option>
            <option value="admin">Amministratore</option>
          </select>
        </div>
      </div>
      <button 
        type="submit" 
        disabled={loading}
        className="w-full py-6 bg-warm-accent text-white rounded-full font-bold hover:bg-warm-accent/90 transition-all shadow-xl shadow-warm-accent/20 font-serif text-xl italic disabled:opacity-50"
      >
        {loading ? 'Creazione in corso...' : 'Crea Utente'}
      </button>
    </form>
  );
};

const LegalPage: React.FC<{ type: 'privacy' | 'cookies' | 'terms', content?: string }> = ({ type, content }) => {
  const titles = {
    privacy: 'Informativa sulla Privacy',
    cookies: 'Cookie Policy',
    terms: 'Termini e Condizioni'
  };

  return (
    <div className="max-w-4xl mx-auto py-20 px-6">
      <h2 className="text-4xl md:text-6xl font-bold text-warm-text mb-12 md:mb-16 font-serif italic leading-tight tracking-tight">{titles[type]}</h2>
      <div className="bg-white p-8 md:p-16 rounded-[3.5rem] md:rounded-[4.5rem] border border-warm-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-warm-accent/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        <div className="prose prose-stone max-w-none text-warm-text/80 font-sans leading-relaxed whitespace-pre-wrap text-base md:text-lg font-light">
          {content || `Contenuto per ${titles[type]} non ancora disponibile. Contattare l'amministratore.`}
        </div>
      </div>
    </div>
  );
};

const LegalEditor: React.FC<{ content: LegalContent[], onSave: (type: string, text: string) => void }> = ({ content, onSave }) => {
  const [activeType, setActiveType] = useState<'privacy' | 'cookies' | 'terms'>('privacy');
  const [text, setText] = useState('');

  useEffect(() => {
    const existing = content.find(c => c.type === activeType);
    setText(existing?.content || '');
  }, [activeType, content]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-4">
        {(['privacy', 'cookies', 'terms'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`flex-1 sm:flex-none px-8 py-4 rounded-full font-bold text-[10px] uppercase tracking-[0.2em] transition-all border shadow-sm ${
              activeType === t ? 'bg-warm-accent text-white border-warm-accent shadow-warm-accent/20' : 'bg-white text-warm-muted border-warm-border hover:bg-warm-accent/5'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-6">
        <div className="bg-white p-2 rounded-[2.5rem] border border-warm-border shadow-inner">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={15}
            className="w-full bg-transparent p-8 focus:outline-none text-warm-text font-sans leading-relaxed resize-none h-[500px] text-lg font-light"
            placeholder={`Inserisci qui il testo per ${activeType}...`}
          />
        </div>
        <button
          onClick={() => onSave(activeType, text)}
          className="w-full py-6 bg-warm-accent text-white rounded-full font-bold hover:bg-warm-accent/90 transition-all font-serif text-xl italic shadow-xl shadow-warm-accent/20"
        >
          Salva Modifiche Legali
        </button>
      </div>
    </div>
  );
};

const ChangePasswordModal: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Le password non coincidono');
      return;
    }
    setLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          mustChangePassword: false
        });
        onComplete();
        alert('Password aggiornata con successo!');
      }
    } catch (error: any) {
      alert('Errore nell\'aggiornamento della password: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-stone-900/80 p-4 backdrop-blur-md overflow-y-auto flex justify-center items-start sm:items-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl max-w-md w-full border border-warm-border my-auto"
      >
        <h2 className="text-3xl font-bold text-warm-text mb-4 font-serif italic">Cambia Password</h2>
        <p className="text-warm-muted mb-8 font-sans">Al primo accesso è obbligatorio cambiare la password temporanea fornita dall'amministratore.</p>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="micro-label ml-2">Nuova Password</label>
            <input 
              required
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="modern-input"
            />
          </div>
          <div className="space-y-3">
            <label className="micro-label ml-2">Conferma Password</label>
            <input 
              required
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="modern-input"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-6 bg-warm-accent text-white rounded-full font-bold hover:bg-warm-accent/90 transition-all shadow-xl shadow-warm-accent/20 font-serif text-xl italic disabled:opacity-50"
          >
            {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const CookieConsent: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] w-[90%] max-w-2xl bg-white/90 backdrop-blur-xl border border-warm-border p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center gap-6"
    >
      <div className="flex-1 text-center md:text-left">
        <h4 className="font-bold text-warm-text mb-2 font-serif italic">Cookie & Privacy</h4>
        <p className="text-xs text-warm-muted leading-relaxed font-sans">
          Utilizziamo cookie tecnici per migliorare la tua esperienza. Continuando a navigare accetti la nostra informativa sulla privacy e l'uso dei cookie.
        </p>
      </div>
      <div className="flex gap-4">
        <button onClick={accept} className="px-10 py-4 bg-warm-accent text-white rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-warm-accent/90 transition-all shadow-lg shadow-warm-accent/20">
          Accetta
        </button>
      </div>
    </motion.div>
  );
};

const EditUserModal: React.FC<{ user: UserProfile, onClose: () => void }> = ({ user, onClose }) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
    role: user.role
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), formData);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-stone-900/80 p-4 backdrop-blur-md overflow-y-auto flex justify-center items-start sm:items-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl max-w-md w-full border border-warm-border my-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-warm-text font-serif italic">Modifica Utente</h2>
          <button onClick={onClose} className="p-2 hover:bg-warm-bg rounded-full transition-all"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="micro-label ml-2">Nome</label>
            <input required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="modern-input" />
          </div>
          <div className="space-y-3">
            <label className="micro-label ml-2">Cognome</label>
            <input required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="modern-input" />
          </div>
          <div className="space-y-3">
            <label className="micro-label ml-2">Telefono</label>
            <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="modern-input" />
          </div>
          {auth.currentUser?.uid !== user.uid && (
            <div className="space-y-3">
              <label className="micro-label ml-2">Ruolo</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="modern-input cursor-pointer">
                <option value="parent">Genitore</option>
                <option value="animator">Animatore</option>
                <option value="admin">Amministratore</option>
              </select>
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full py-6 bg-warm-accent text-white rounded-full font-bold hover:bg-warm-accent/90 transition-all shadow-xl shadow-warm-accent/20 font-serif text-xl italic disabled:opacity-50">
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const EditRegistrationModal: React.FC<{ registration: Registration, onClose: () => void }> = ({ registration, onClose }) => {
  const [formData, setFormData] = useState({
    childName: registration.childName,
    childSurname: registration.childSurname,
    birthDate: registration.birthDate,
    allergies: registration.allergies || [],
    medicalNotes: registration.medicalNotes || ''
  });
  const [loading, setLoading] = useState(false);

  const toggleAllergy = (allergy: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter(a => a !== allergy)
        : [...prev.allergies, allergy]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'registrations', registration.id), formData);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${registration.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-stone-900/80 p-4 backdrop-blur-md overflow-y-auto flex justify-center items-start sm:items-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl max-w-md w-full border border-warm-border my-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-warm-text font-serif italic">Modifica Bambino</h2>
          <button onClick={onClose} className="p-2 hover:bg-warm-bg rounded-full transition-all"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="micro-label ml-2">Nome Bambino</label>
            <input required value={formData.childName} onChange={e => setFormData({ ...formData, childName: e.target.value })} className="modern-input" />
          </div>
          <div className="space-y-3">
            <label className="micro-label ml-2">Cognome Bambino</label>
            <input required value={formData.childSurname} onChange={e => setFormData({ ...formData, childSurname: e.target.value })} className="modern-input" />
          </div>
          <div className="space-y-3">
            <label className="micro-label ml-2">Data di Nascita</label>
            <input required type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} className="modern-input" />
          </div>
          <div className="space-y-3">
            <label className="micro-label ml-2">Allergie Comuni</label>
            <div className="flex flex-wrap gap-3">
              {COMMON_ALLERGIES.map(allergy => (
                <button
                  key={allergy}
                  type="button"
                  onClick={() => toggleAllergy(allergy)}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    formData.allergies.includes(allergy) 
                      ? 'bg-warm-accent text-white border-warm-accent shadow-lg shadow-warm-accent/20' 
                      : 'bg-warm-bg text-warm-muted border-warm-border hover:bg-warm-accent/5'
                  }`}
                >
                  {allergy}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="micro-label ml-2">Note Mediche / Altre Allergie</label>
            <textarea 
              value={formData.medicalNotes} 
              onChange={e => setFormData({ ...formData, medicalNotes: e.target.value })} 
              className="modern-input resize-none"
              rows={3}
              placeholder="Inserisci eventuali note mediche..."
            />
          </div>
          <button type="submit" disabled={loading} className="w-full py-6 bg-warm-accent text-white rounded-full font-bold hover:bg-warm-accent/90 transition-all shadow-xl shadow-warm-accent/20 font-serif text-xl italic disabled:opacity-50">
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const ProfileView: React.FC<{ user: User, profile: UserProfile, registrations: Registration[], onEditRegistration: (reg: Registration) => void }> = ({ user, profile, registrations, onEditRegistration }) => {
  const [formData, setFormData] = useState({
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    phone: profile.phone || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), formData);
      alert('Profilo aggiornato con successo!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const myChildren = registrations.filter(r => r.parentUid === user.uid);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 md:gap-20">
      <div className="lg:col-span-1 space-y-8 md:space-y-12">
        <div>
          <h3 className="text-3xl font-bold text-warm-text font-serif italic">Il Mio Profilo</h3>
          <p className="text-sm text-warm-muted font-sans mt-1">Gestisci le tue informazioni personali.</p>
        </div>
        <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-warm-border shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-3">
              <label className="micro-label ml-2">Nome</label>
              <input required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="modern-input" />
            </div>
            <div className="space-y-3">
              <label className="micro-label ml-2">Cognome</label>
              <input required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="modern-input" />
            </div>
            <div className="space-y-3">
              <label className="micro-label ml-2">Telefono</label>
              <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="modern-input" />
            </div>
            <div className="space-y-3">
              <label className="micro-label ml-2">Email</label>
              <input disabled value={user.email || ''} className="modern-input opacity-50 cursor-not-allowed" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-6 bg-warm-accent text-white rounded-full font-bold hover:bg-warm-accent/90 transition-all shadow-xl shadow-warm-accent/20 font-serif text-xl italic disabled:opacity-50">
              {loading ? 'Aggiornamento...' : 'Salva Profilo'}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-8 md:space-y-12">
        <div>
          <h3 className="text-3xl font-bold text-warm-text font-serif italic">I Miei Bambini</h3>
          <p className="text-sm text-warm-muted font-sans mt-1">Visualizza e modifica le iscrizioni dei tuoi figli.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {myChildren.map(child => (
            <div key={child.id} className="bg-white p-8 md:p-10 rounded-[3rem] border border-warm-border shadow-sm group hover:shadow-xl transition-all duration-500 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-warm-accent/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-warm-accent/10 transition-all duration-500" />
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="w-16 h-16 bg-warm-bg rounded-2xl flex items-center justify-center text-warm-accent border border-warm-border group-hover:bg-warm-accent group-hover:text-white transition-all duration-500">
                  <Heart className="w-8 h-8" />
                </div>
                <button onClick={() => onEditRegistration(child)} className="p-4 text-warm-muted hover:text-warm-accent hover:bg-warm-bg rounded-2xl transition-all border border-transparent hover:border-warm-border">
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
              <h4 className="text-2xl font-bold text-warm-text font-serif italic mb-4 truncate relative z-10">{child.childName} {child.childSurname}</h4>
              <div className="space-y-4 relative z-10">
                <p className="text-sm text-warm-muted font-sans flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-warm-accent/40" />
                  Nato il: <span className="text-warm-text font-medium">{new Date(child.birthDate).toLocaleDateString('it-IT')}</span>
                </p>
                <p className="text-sm text-warm-muted font-sans flex items-center gap-3">
                  <ShieldCheck className={`w-5 h-5 ${child.status === 'confirmed' ? 'text-emerald-500' : 'text-amber-500'}`} />
                  Stato: <span className={`font-bold uppercase tracking-widest ${child.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'}`}>{child.status}</span>
                </p>
              </div>
              {(child.allergies && child.allergies.length > 0) && (
                <div className="mt-8 flex flex-wrap gap-2 relative z-10">
                  {child.allergies.map(a => (
                    <span key={a} className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                      {a}
                    </span>
                  ))}
                </div>
              )}
              {child.medicalNotes && (
                <div className="mt-8 p-6 bg-warm-bg/50 rounded-2xl border border-warm-border/50 relative z-10">
                  <p className="text-[10px] font-bold text-warm-muted uppercase tracking-widest mb-2">Note Mediche</p>
                  <p className="text-sm text-warm-text/70 font-sans italic leading-relaxed break-words">{child.medicalNotes}</p>
                </div>
              )}
            </div>
          ))}
          {myChildren.length === 0 && (
            <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-warm-border shadow-sm">
              <Heart className="w-16 h-16 text-warm-accent/10 mx-auto mb-6" />
              <p className="text-warm-muted italic font-serif text-xl">Non hai ancora iscritto nessun bambino.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [notificationReads, setNotificationReads] = useState<NotificationRead[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'register' | 'admin' | 'legal' | 'notifications' | 'statistics'>('home');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'registrations' | 'attendance' | 'surveys' | 'schedule' | 'events' | 'users' | 'announcements' | 'legal' | 'statistics' | 'notifications'>('dashboard');
  const [userSearch, setUserSearch] = useState('');
  const [events, setEvents] = useState<GrestEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [allSurveyResponses, setAllSurveyResponses] = useState<SurveyResponse[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [legalContent, setLegalContent] = useState<LegalContent[]>([]);
  const [showLegal, setShowLegal] = useState<UserProfile | null>(null); // Reusing for something else? No, let's use a string
  const [legalTab, setLegalTab] = useState<'privacy' | 'cookies' | 'terms'>('privacy');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  interface AdminTabInfo {
    id: 'dashboard' | 'registrations' | 'attendance' | 'surveys' | 'announcements' | 'schedule' | 'events' | 'users' | 'legal' | 'statistics' | 'notifications';
    label: string;
    icon: React.ReactNode;
  }

  const adminTabs: AdminTabInfo[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'statistics', label: 'Statistiche', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifiche', icon: <Bell className="w-4 h-4" /> },
    { id: 'registrations', label: 'Iscrizioni', icon: <Users className="w-4 h-4" /> },
    { id: 'attendance', label: 'Presenze', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'surveys', label: 'Sondaggi', icon: <Vote className="w-4 h-4" /> },
    { id: 'announcements', label: 'Annunci', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'schedule', label: 'Orari', icon: <Timer className="w-4 h-4" /> },
    { id: 'events', label: 'Eventi', icon: <Calendar className="w-4 h-4" /> },
    { id: 'users', label: 'Utenti', icon: <UserCircle className="w-4 h-4" /> },
    { id: 'legal', label: 'Legale', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  useEffect(() => {
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      console.log("Auth state changed. User:", currentUser?.email, "UID:", currentUser?.uid);
      if (currentUser) {
        const profileRef = doc(db, 'users', currentUser.uid);
        try {
          console.log("Fetching profile for UID:", currentUser.uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            console.log("Profile found:", profileSnap.data());
            setProfile(profileSnap.data() as UserProfile);
          } else {
            console.log("Profile not found. Creating new profile...");
            const role: UserRole = currentUser.email === 'dennisbottari@gmail.com' ? 'admin' : 'parent';
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || '',
              role,
              createdAt: Timestamp.now()
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
            console.log("New profile created:", newProfile);
          }
        } catch (error) {
          console.error("Error fetching/creating profile:", error);
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GrestEvent));
      setEvents(eventData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setRegistrations([]);
      return;
    }
    const q = query(collection(db, 'registrations'), where('parentUid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const regData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
      setRegistrations(regData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'registrations');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      setAllRegistrations([]);
      return;
    }
    const q = query(collection(db, 'registrations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const regData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
      setAllRegistrations(regData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'registrations');
    });
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    const today = new Date().toISOString().split('T')[0];
    const q = query(collection(db, 'attendance'), where('date', '==', today));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const attData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
      setAttendance(attData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    });
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    const q = query(collection(db, 'surveys'), where('active', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const surveyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Survey));
      setSurveys(surveyData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'surveys');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'surveyResponses'), where('parentUid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const respData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SurveyResponse));
      setSurveyResponses(respData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'surveyResponses');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    const q = query(collection(db, 'surveyResponses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const respData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SurveyResponse));
      setAllSurveyResponses(respData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'surveyResponses');
    });
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    const q = query(collection(db, 'schedule'), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleItem));
      setSchedule(scheduleData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'schedule');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      setAnnouncements(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'announcements');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      setAllUsers(userData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (!user) {
      setAllNotifications([]);
      return;
    }
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as Notification));
      // Filter client-side based on targetGroup and profile role
      const filtered = data.filter(n => {
        if (profile?.role === 'admin') return true;
        if (n.targetGroup === 'all') return true;
        if (n.targetGroup === 'parents' && profile?.role === 'parent') return true;
        if (n.targetGroup === 'animators' && profile?.role === 'animator') return true;
        return false;
      });
      setAllNotifications(filtered);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
    return () => unsubscribe();
  }, [user, profile]);

  useEffect(() => {
    if (!user) {
      setNotificationReads([]);
      return;
    }
    const q = query(collection(db, 'notificationReads'), where('userUid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationRead));
      setNotificationReads(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notificationReads');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'legalContent'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LegalContent));
      setLegalContent(data);
      
      // Seed legal content if empty
      if (data.length === 0 && profile?.role === 'admin') {
        const seed = [
          { type: 'privacy', content: 'Informativa Privacy (GDPR)\n\nIl Grest Oppeano tratta i dati personali nel rispetto del Regolamento UE 2016/679. I dati sono raccolti esclusivamente per finalità organizzative, assicurative e di sicurezza legate alle attività estive. Non cediamo i tuoi dati a terzi.' },
          { type: 'cookies', content: 'Cookie Policy\n\nQuesto sito utilizza solo cookie tecnici necessari al funzionamento (autenticazione e sessione). Non utilizziamo cookie di profilazione o tracciamento di terze parti.' },
          { type: 'terms', content: 'Termini e Condizioni\n\nL\'iscrizione al Grest comporta l\'accettazione del regolamento interno. I genitori sono responsabili della veridicità dei dati forniti, in particolare riguardo a allergie e note mediche.' }
        ];
        seed.forEach(async (item) => {
          try {
            await addDoc(collection(db, 'legalContent'), { ...item, updatedAt: Timestamp.now() });
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'legalContent');
          }
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'legalContent');
    });
    return () => unsubscribe();
  }, [profile]);

  const linkRegistrationToParent = async (registrationId: string, parentUid: string) => {
    try {
      await updateDoc(doc(db, 'registrations', registrationId), { parentUid });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${registrationId}`);
    }
  };

  const deleteEntity = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  const updateEntity = async (collectionName: string, id: string, data: any) => {
    try {
      await updateDoc(doc(db, collectionName, id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error', error);
    }
  };

  const loginWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      alert('Errore di accesso: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const registerWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      alert('Errore di registrazione: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const linkGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      if (auth.currentUser) {
        await linkWithPopup(auth.currentUser, provider);
        alert('Account Google collegato con successo!');
      }
    } catch (error: any) {
      alert('Errore nel collegamento: ' + error.message);
    }
  };

  const logout = () => signOut(auth);

  const updateRegistrationStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'registrations', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${id}`);
    }
  };

  const addAnnouncement = async (data: any) => {
    try {
      await addDoc(collection(db, 'announcements'), { ...data, createdAt: Timestamp.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'announcements');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `announcements/${id}`);
    }
  };

  const toggleGrestPayment = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'registrations', id), { paidGrestFee: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${id}`);
    }
  };

  const toggleTripPayment = async (responseId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'surveyResponses', responseId), { paidTripFee: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `surveyResponses/${responseId}`);
    }
  };

  const toggleAttendance = async (registrationId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = attendance.find(a => a.registrationId === registrationId);
    
    try {
      if (existing) {
        await updateDoc(doc(db, 'attendance', existing.id!), { present: !existing.present });
      } else {
        await addDoc(collection(db, 'attendance'), {
          registrationId,
          date: today,
          present: true,
          recordedAt: Timestamp.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    }
  };

  async function submitSurveyResponse(surveyId: string, registrationId: string, participating: boolean) {
    if (!user) return;
    const existing = surveyResponses.find(r => r.surveyId === surveyId && r.registrationId === registrationId);
    try {
      if (existing) {
        await updateDoc(doc(db, 'surveyResponses', existing.id!), { participating, respondedAt: Timestamp.now() });
      } else {
        await addDoc(collection(db, 'surveyResponses'), {
          surveyId,
          parentUid: user.uid,
          registrationId,
          participating,
          respondedAt: Timestamp.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'surveyResponses');
    }
  }

  const updateProfile = async (firstName: string, lastName: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { firstName, lastName });
      setProfile(prev => prev ? { ...prev, firstName, lastName } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;
    const existing = notificationReads.find(r => r.notificationId === notificationId);
    if (existing) return;
    try {
      await addDoc(collection(db, 'notificationReads'), {
        notificationId,
        userUid: user.uid,
        readAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notificationReads');
    }
  };

  const sendNotification = async (data: Omit<Notification, 'id' | 'createdAt' | 'senderUid'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        ...data,
        senderUid: user.uid,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'notifications');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-bg">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-warm-accent border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const needsProfileCompletion = user && profile && (!profile.firstName || !profile.lastName);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-warm-bg text-warm-text font-sans selection:bg-warm-accent/10">
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-app-border">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setActiveTab('home')}>
                <div className="w-10 h-10 bg-app-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-app-accent/20 group-hover:rotate-6 transition-all duration-300">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-app-text tracking-tight font-serif leading-none">Grest <span className="text-app-accent">Oppeano</span></h1>
                  <p className="text-[9px] font-bold text-app-muted uppercase tracking-[0.2em] mt-1 hidden xs:block">Comunità in Cammino</p>
                </div>
              </div>

              <nav className="hidden md:flex items-center gap-1 bg-app-bg p-1 rounded-full border border-app-border">
                <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home className="w-4 h-4" />} label="Home" />
                <NavButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={
                  <div className="relative">
                    <Bell className="w-4 h-4" />
                    {allNotifications.length > notificationReads.length && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                } label="Notifiche" />
                <NavButton active={activeTab === 'register'} onClick={() => setActiveTab('register')} icon={<UserPlus className="w-4 h-4" />} label="Iscriviti" />
                {user && (
                  <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserCircle className="w-4 h-4" />} label="Profilo" />
                )}
                {profile?.role === 'admin' && (
                  <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Settings className="w-4 h-4" />} label="Admin" />
                )}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3 bg-white pl-4 pr-1.5 py-1.5 rounded-full border border-app-border shadow-sm">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-app-text leading-none">{profile?.firstName || user.displayName}</p>
                    <p className="text-[9px] text-app-muted uppercase tracking-widest mt-1">{profile?.role}</p>
                  </div>
                  <div className="flex gap-1">
                    {user.providerData.every(p => p.providerId !== 'google.com') && (
                      <button onClick={linkGoogle} title="Collega account Google" className="p-2 hover:bg-app-bg text-app-muted hover:text-app-accent rounded-full transition-all">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                      </button>
                    )}
                    <button onClick={logout} className="p-2 hover:bg-rose-50 text-app-muted hover:text-rose-500 rounded-full transition-all">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setActiveTab('register')} className="flex items-center gap-2 px-6 py-2.5 bg-app-accent text-white rounded-full font-bold hover:bg-app-accent/90 transition-all shadow-lg shadow-app-accent/20">
                  <UserCircle className="w-4 h-4" />
                  Accedi
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-12 md:py-20 pb-32">
          <AnimatePresence mode="wait">
            {needsProfileCompletion && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="fixed inset-0 z-[100] bg-app-text/40 p-4 backdrop-blur-md overflow-y-auto flex justify-center items-start sm:items-center"
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-md w-full my-auto border border-white/20"
                >
                  <div className="w-16 h-16 bg-app-accent/10 text-app-accent rounded-2xl flex items-center justify-center mb-8 mx-auto">
                    <UserCircle className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3 text-center text-app-text font-serif">Completa il tuo profilo</h2>
                  <p className="text-app-muted mb-8 text-center text-sm">Inserisci il tuo nome e cognome per iniziare la tua avventura al Grest.</p>
                  <ProfileForm onComplete={updateProfile} />
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-32">
                <section className="relative min-h-[75vh] py-24 md:py-40 flex items-center justify-center overflow-hidden rounded-[4rem] bg-warm-text shadow-2xl shadow-warm-text/20">
                  <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-warm-accent/20 rounded-full -mr-60 -mt-60 blur-[180px] animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-emerald-500/10 rounded-full -ml-40 -mb-40 blur-[150px]" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                  </div>
                  
                  <div className="relative z-10 text-center px-6 max-w-5xl">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 mb-12"
                    >
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <span className="text-white text-[11px] uppercase font-bold tracking-[0.4em]">Estate 2026 • Oppeano</span>
                    </motion.div>
                    
                    <motion.h1 
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-7xl md:text-[10rem] font-bold text-white mb-10 font-serif leading-[0.85] tracking-tighter"
                    >
                      Comunità <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-warm-accent via-amber-200 to-warm-accent italic">in Cammino</span>
                    </motion.h1>
                    
                    <motion.p
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-white/80 text-xl md:text-3xl mb-16 max-w-3xl mx-auto leading-relaxed font-light font-serif italic"
                    >
                      Un'esperienza di crescita, gioco e amicizia nel cuore della nostra parrocchia.
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col sm:flex-row items-center justify-center gap-6"
                    >
                      <button 
                        onClick={() => setActiveTab('register')}
                        className="w-full sm:w-auto px-12 py-6 bg-warm-accent text-white rounded-full font-bold text-xl hover:bg-warm-accent/90 transition-all shadow-2xl shadow-warm-accent/40 hover:scale-105 flex items-center justify-center gap-4 font-serif italic"
                      >
                        Iscriviti ora
                        <ArrowUpRight className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={() => {
                          const el = document.getElementById('events');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="w-full sm:w-auto px-12 py-6 bg-white/5 text-white border border-white/10 rounded-full font-bold text-xl hover:bg-white/10 transition-all backdrop-blur-md font-serif italic"
                      >
                        Scopri di più
                      </button>
                    </motion.div>
                  </div>
                </section>

                {/* Parent Quick Actions */}
                {user && profile?.role === 'parent' && (
                  <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <button 
                      onClick={() => setActiveTab('register')}
                      className="p-8 bg-warm-card rounded-[2.5rem] border border-warm-border shadow-sm hover:shadow-md transition-all flex items-center gap-5 group"
                    >
                      <div className="w-14 h-14 bg-warm-accent/10 text-warm-accent rounded-2xl flex items-center justify-center group-hover:bg-warm-accent group-hover:text-white transition-all duration-500">
                        <Plus className="w-7 h-7" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-warm-text text-lg font-serif">Nuova Iscrizione</p>
                        <p className="text-xs text-warm-muted">Iscrivi un altro bambino al Grest.</p>
                      </div>
                    </button>
                    <div className="p-8 bg-warm-card rounded-[2.5rem] border border-warm-border shadow-sm flex items-center gap-5">
                      <div className="w-14 h-14 bg-warm-secondary/10 text-warm-secondary rounded-2xl flex items-center justify-center">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-warm-text text-lg font-serif">{registrations.length} Iscrizioni</p>
                        <p className="text-xs text-warm-muted">Gestisci le tue iscrizioni attive.</p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Announcements Section */}
                {announcements.length > 0 && (
                  <section className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-3xl font-bold text-warm-text tracking-tight font-serif italic">Comunicazioni Importanti</h3>
                      <Megaphone className="w-6 h-6 text-warm-accent/30" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {announcements.slice(0, 3).map(ann => (
                        <motion.div 
                          key={ann.id}
                          whileHover={{ y: -8 }}
                          className={`p-8 rounded-[2.5rem] border shadow-sm relative overflow-hidden transition-all duration-500 ${
                            ann.type === 'urgent' ? 'bg-red-50/50 border-red-100' : 
                            ann.type === 'warning' ? 'bg-orange-50/50 border-orange-100' : 
                            'bg-white border-warm-border'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              ann.type === 'urgent' ? 'bg-red-500 animate-pulse' : 
                              ann.type === 'warning' ? 'bg-orange-500' : 
                              'bg-warm-accent'
                            }`} />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-warm-muted">
                              {ann.type === 'urgent' ? 'Urgente' : ann.type === 'warning' ? 'Avviso' : 'Info'}
                            </span>
                          </div>
                          <h4 className="font-bold text-warm-text text-xl mb-3 font-serif leading-tight">{ann.title}</h4>
                          <p className="text-warm-muted text-sm leading-relaxed font-light">{ann.content}</p>
                          <div className="mt-6 pt-6 border-t border-warm-border/50 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em]">
                              {new Date(ann.createdAt.toDate()).toLocaleDateString('it-IT')}
                            </span>
                            <ArrowUpRight className="w-5 h-5 text-warm-accent/20" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  <div className="lg:col-span-2 space-y-12">
                    {/* Surveys Section */}
                    <section className="space-y-8">
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-3xl font-bold text-warm-text tracking-tight font-serif italic">Sondaggi e Gite</h3>
                        <div className="flex items-center gap-3 text-warm-muted bg-warm-card px-4 py-2 rounded-full border border-warm-border shadow-sm">
                          <Vote className="w-5 h-5 text-warm-accent" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{surveys.length} Attivi</span>
                        </div>
                      </div>
                      <div className="grid gap-8">
                        {surveys.map(survey => (
                          <div key={survey.id} className="bg-warm-card p-10 rounded-[3rem] border border-warm-border shadow-sm hover:shadow-xl hover:shadow-warm-accent/5 transition-all duration-500 group">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-10">
                              <div>
                                <div className="flex items-center gap-4 mb-3">
                                  <h4 className="font-bold text-2xl text-warm-text font-serif">{survey.title}</h4>
                                  {survey.cost && <span className="px-4 py-1.5 bg-warm-accent/10 text-warm-accent rounded-full text-[10px] font-bold border border-warm-accent/20">€{survey.cost}</span>}
                                </div>
                                <p className="text-warm-muted text-base leading-relaxed max-w-lg font-light">{survey.description}</p>
                              </div>
                              
                              {(survey.departureTime || survey.returnTime) && (
                                <div className="flex gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-warm-muted bg-warm-bg p-5 rounded-[1.5rem] border border-warm-border">
                                  {survey.departureTime && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-warm-accent" /> {survey.departureTime}</div>}
                                  {survey.returnTime && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-warm-accent" /> {survey.returnTime}</div>}
                                </div>
                              )}
                            </div>

                            <div className="space-y-6">
                              <p className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.3em] mb-6 border-b border-warm-border pb-2 inline-block">Seleziona chi partecipa</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {registrations.filter(r => r.status === 'confirmed').map(reg => {
                                  const response = surveyResponses.find(sr => sr.surveyId === survey.id && sr.registrationId === reg.id);
                                  return (
                                    <div key={reg.id} className="flex flex-col sm:flex-row items-center justify-between p-6 bg-warm-bg/50 rounded-[2rem] border border-warm-border hover:border-warm-accent/30 transition-all duration-300 gap-4">
                                      <span className="text-lg font-bold text-warm-text font-serif italic">{reg.childName}</span>
                                      <div className="flex gap-3 w-full sm:w-auto">
                                        <button 
                                          onClick={() => submitSurveyResponse(survey.id, reg.id, true)} 
                                          className={`flex-1 sm:flex-none px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${response?.participating === true ? 'bg-warm-accent text-white shadow-lg shadow-warm-accent/20' : 'bg-warm-card border border-warm-border text-warm-muted hover:bg-warm-accent/5'}`}
                                        >
                                          Sì
                                        </button>
                                        <button 
                                          onClick={() => submitSurveyResponse(survey.id, reg.id, false)} 
                                          className={`flex-1 sm:flex-none px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${response?.participating === false ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-warm-card border border-warm-border text-warm-muted hover:bg-red-50'}`}
                                        >
                                          No
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                                {registrations.filter(r => r.status === 'confirmed').length === 0 && (
                                  <div className="col-span-full py-6 text-center bg-warm-bg/50 rounded-[2rem] border border-dashed border-warm-border">
                                    <p className="text-sm text-warm-muted italic font-light">Iscrizioni confermate necessarie per rispondere.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {surveys.length === 0 && (
                          <div className="py-24 text-center bg-warm-card rounded-[3rem] border border-warm-border shadow-sm">
                            <Vote className="w-16 h-16 text-warm-accent/10 mx-auto mb-6" />
                            <p className="text-warm-muted font-medium font-serif text-xl">Nessun sondaggio attivo al momento.</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <aside className="space-y-12">
                    {/* Events Section */}
                    <section className="space-y-8">
                      <h3 className="text-3xl font-bold text-warm-text tracking-tight font-serif italic">Eventi</h3>
                      <div className="space-y-6">
                        {events.map(event => (
                          <div key={event.id} className="bg-warm-card p-8 rounded-[2.5rem] border border-warm-border shadow-sm hover:shadow-md transition-all duration-500">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 bg-warm-accent/10 rounded-2xl flex items-center justify-center text-warm-accent">
                                <Calendar className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-bold text-warm-text text-lg leading-tight font-serif">{event.title}</h4>
                                <p className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em]">{new Date(event.date).toLocaleDateString('it-IT')}</p>
                              </div>
                            </div>
                            <p className="text-sm text-warm-muted leading-relaxed mb-4 font-light">{event.description}</p>
                            {event.location && (
                              <div className="flex items-center gap-2 text-[10px] font-bold text-warm-accent uppercase tracking-[0.2em] bg-warm-bg px-4 py-2 rounded-full border border-warm-border w-fit">
                                <MapPin className="w-4 h-4" /> {event.location}
                              </div>
                            )}
                          </div>
                        ))}
                        {events.length === 0 && <p className="text-sm text-warm-muted italic font-light px-2">Nessun evento in programma.</p>}
                      </div>
                    </section>

                    {/* Schedule Section */}
                    <section className="space-y-8">
                      <h3 className="text-3xl font-bold text-warm-text tracking-tight font-serif italic">Programma</h3>
                      <div className="bg-warm-card rounded-[3rem] border border-warm-border shadow-sm overflow-hidden">
                        <div className="p-8 bg-warm-bg border-b border-warm-border flex items-center justify-between">
                          <p className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.3em]">Oggi • {new Date().toLocaleDateString('it-IT', { weekday: 'long' })}</p>
                          <Timer className="w-5 h-5 text-warm-accent/30" />
                        </div>
                        <div className="divide-y divide-warm-border/50">
                          {schedule.filter(item => {
                            const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
                            return item.day === days[new Date().getDay()];
                          }).length > 0 ? (
                            schedule.filter(item => {
                              const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
                              return item.day === days[new Date().getDay()];
                            }).sort((a, b) => a.time.localeCompare(b.time)).map(item => (
                              <div key={item.id} className="p-8 flex gap-6 hover:bg-warm-bg/50 transition-colors duration-300">
                                <span className="font-mono font-bold text-warm-accent text-sm bg-warm-accent/10 px-3 py-1.5 rounded-xl h-fit border border-warm-accent/10">{item.time}</span>
                                <div>
                                  <p className="font-bold text-warm-text text-base font-serif">{item.activity}</p>
                                  {item.description && <p className="text-xs text-warm-muted mt-1 font-light leading-relaxed">{item.description}</p>}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-16 text-center">
                              <Clock className="w-10 h-10 text-warm-accent/10 mx-auto mb-4" />
                              <p className="text-sm text-warm-muted font-light italic">Nessuna attività prevista per oggi.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  </aside>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-4xl font-bold text-warm-text font-serif italic">Le Mie Notifiche</h2>
                  <Bell className="w-8 h-8 text-warm-accent/20" />
                </div>
                <div className="grid gap-6">
                  {allNotifications.map(notif => {
                    const isRead = notificationReads.some(r => r.notificationId === notif.id);
                    return (
                      <motion.div 
                        key={notif.id}
                        onViewportEnter={() => !isRead && markNotificationAsRead(notif.id)}
                        className={`p-8 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden ${
                          isRead ? 'bg-warm-card border-warm-border opacity-80' : 'bg-white border-warm-accent/30 shadow-xl shadow-warm-accent/5'
                        }`}
                      >
                        {!isRead && <div className="absolute top-0 left-0 w-1.5 h-full bg-warm-accent" />}
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            notif.type === 'urgent' ? 'bg-red-500 animate-pulse' : 
                            notif.type === 'warning' ? 'bg-orange-500' : 
                            'bg-warm-accent'
                          }`} />
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-warm-muted">
                            {notif.type === 'urgent' ? 'Urgente' : notif.type === 'warning' ? 'Avviso' : 'Info'}
                          </span>
                        </div>
                        <h4 className="font-bold text-warm-text text-xl mb-3 font-serif leading-tight">{notif.title}</h4>
                        <p className="text-warm-muted text-base leading-relaxed font-light">{notif.message}</p>
                        <div className="mt-6 pt-6 border-t border-warm-border/50 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em]">
                            {new Date(notif.createdAt.toDate()).toLocaleDateString('it-IT')}
                          </span>
                          {isRead ? <CheckCircle className="w-5 h-5 text-emerald-500/30" /> : <Sparkles className="w-5 h-5 text-warm-accent animate-pulse" />}
                        </div>
                      </motion.div>
                    );
                  })}
                  {allNotifications.length === 0 && (
                    <div className="py-32 text-center bg-warm-card rounded-[3rem] border border-warm-border">
                      <Bell className="w-16 h-16 text-warm-accent/10 mx-auto mb-6" />
                      <p className="text-warm-muted font-medium font-serif text-xl">Nessuna notifica per te.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'register' && (
              <motion.div key="register" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl mx-auto">
                <div className="bg-white p-8 md:p-16 rounded-[3.5rem] border border-warm-border shadow-2xl shadow-warm-accent/5">
                  <div className="flex items-center gap-6 mb-12">
                    <div className="w-16 h-16 bg-warm-accent text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-warm-accent/30">
                      <UserPlus className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-bold text-warm-text font-serif">Nuova Iscrizione</h2>
                      <p className="text-warm-muted font-light">Compila il modulo per iscrivere tuo figlio al Grest.</p>
                    </div>
                  </div>
                  
                  {!user ? (
                    <div className="max-w-md mx-auto py-12">
                      <div className="bg-warm-card p-10 rounded-[3rem] border border-warm-border shadow-sm">
                        <div className="flex gap-4 mb-8">
                          <button 
                            onClick={() => setAuthMode('login')}
                            className={`flex-1 py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-app-accent text-white shadow-lg shadow-app-accent/20' : 'text-app-muted hover:bg-app-bg'}`}
                          >
                            Accedi
                          </button>
                          <button 
                            onClick={() => setAuthMode('register')}
                            className={`flex-1 py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all ${authMode === 'register' ? 'bg-app-accent text-white shadow-lg shadow-app-accent/20' : 'text-app-muted hover:bg-app-bg'}`}
                          >
                            Registrati
                          </button>
                        </div>

                        <form onSubmit={authMode === 'login' ? loginWithEmail : registerWithEmail} className="space-y-4">
                          <div className="space-y-2">
                            <label className="micro-label ml-2">Email</label>
                            <input 
                              type="email"
                              required
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              className="modern-input"
                              placeholder="email@esempio.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="micro-label ml-2">Password</label>
                            <input 
                              type="password"
                              required
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              className="modern-input"
                              placeholder="••••••••"
                            />
                          </div>
                          <button 
                            disabled={authLoading}
                            className="w-full py-5 bg-app-accent text-white rounded-full font-bold hover:bg-app-accent/90 transition-all shadow-xl shadow-app-accent/20 font-serif italic"
                          >
                            {authLoading ? 'Caricamento...' : (authMode === 'login' ? 'Entra' : 'Crea Account')}
                          </button>
                        </form>

                        <div className="relative my-8">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-app-border"></div></div>
                          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold"><span className="bg-app-card px-4 text-app-muted">Oppure</span></div>
                        </div>

                        <button onClick={login} className="w-full py-5 bg-white border border-app-border text-app-text rounded-full font-bold flex items-center justify-center gap-3 hover:bg-app-bg transition-all shadow-sm">
                          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                          Continua con Google
                        </button>
                      </div>
                    </div>
                  ) : (
                    <RegistrationForm user={user} existingRegistrations={registrations} onComplete={() => setActiveTab('home')} />
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'profile' && user && profile && (
              <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                <ProfileView 
                  user={user} 
                  profile={profile} 
                  registrations={registrations} 
                  onEditRegistration={setEditingRegistration}
                />
              </motion.div>
            )}

            {activeTab === 'admin' && profile?.role === 'admin' && (
              <motion.div key="admin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6 md:space-y-10">
                <div className="flex flex-col gap-8 py-4 md:py-8">
                  <div className="max-w-xl">
                    <h2 className="text-3xl md:text-6xl font-bold text-warm-text font-serif italic mb-2 md:mb-4 leading-none">Gestione <br/><span className="text-warm-accent">Creativa</span></h2>
                    <p className="text-warm-muted font-sans tracking-wide text-sm md:text-lg font-light">Un unico spazio per coordinare l'energia del Grest Oppeano.</p>
                  </div>
                  
                  {/* Mobile Admin Menu Button - Hidden on md and up */}
                  <div className="md:hidden relative">
                    <div className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] mb-3 ml-2">Sezione Attiva</div>
                    <button 
                      onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                      className="flex items-center justify-between w-full px-6 py-4 bg-white border border-warm-border rounded-2xl font-bold shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 text-warm-text">
                        <span className="text-warm-accent">
                          {adminTabs.find(t => t.id === adminTab)?.icon}
                        </span>
                        <span className="font-serif italic text-lg">
                          {adminTabs.find(t => t.id === adminTab)?.label}
                        </span>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-warm-muted transition-transform duration-300 ${isAdminMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {isAdminMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: '100%' }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: '100%' }}
                          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                          className="fixed inset-0 z-[70] bg-white flex flex-col p-8 md:hidden"
                        >
                          <div className="flex items-center justify-between mb-10">
                            <div>
                              <h3 className="text-3xl font-serif italic font-bold text-warm-text">Menu Admin</h3>
                              <p className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] mt-1">Seleziona una sezione</p>
                            </div>
                            <button 
                              onClick={() => setIsAdminMenuOpen(false)} 
                              className="w-12 h-12 bg-warm-bg flex items-center justify-center rounded-2xl hover:bg-warm-accent/5 transition-colors"
                            >
                              <X className="w-6 h-6 text-warm-muted" />
                            </button>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-12">
                            {adminTabs.map(tab => (
                              <AdminMenuButton 
                                key={tab.id}
                                active={adminTab === tab.id} 
                                onClick={() => { setAdminTab(tab.id); setIsAdminMenuOpen(false); }} 
                                icon={React.cloneElement(tab.icon as React.ReactElement, { className: "w-6 h-6" })} 
                                label={tab.label} 
                              />
                            ))}
                          </div>

                          <div className="pt-6 border-t border-warm-border">
                            <button 
                              onClick={() => setIsAdminMenuOpen(false)}
                              className="w-full py-4 bg-warm-accent text-white rounded-2xl font-bold shadow-lg shadow-warm-accent/20"
                            >
                              Chiudi Menu
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Desktop Admin Tabs - Visible on md and up */}
                  <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
                    {adminTabs.map(tab => (
                      <AdminTab 
                        key={tab.id}
                        active={adminTab === tab.id} 
                        onClick={() => setAdminTab(tab.id)} 
                        icon={React.cloneElement(tab.icon as React.ReactElement, { className: "w-5 h-5" })} 
                        label={tab.label} 
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-warm-card rounded-[3rem] border border-warm-border shadow-sm overflow-hidden min-h-[600px]">
                  {adminTab === 'dashboard' && (
                    <div className="p-4 md:p-12">
                      <AdminDashboard 
                        registrations={allRegistrations} 
                        users={allUsers} 
                        surveys={surveys} 
                        responses={allSurveyResponses} 
                      />
                    </div>
                  )}

                  {adminTab === 'statistics' && (
                    <div className="p-4 md:p-12">
                      <AdvancedStatistics 
                        registrations={allRegistrations}
                        users={allUsers}
                        attendance={attendance}
                        surveys={surveys}
                        responses={allSurveyResponses}
                      />
                    </div>
                  )}

                  {adminTab === 'notifications' && (
                    <div className="p-4 md:p-12">
                      <AdminNotificationManager 
                        onSend={sendNotification}
                        onDelete={(id) => deleteEntity('notifications', id)}
                        notifications={allNotifications}
                      />
                    </div>
                  )}

                  {adminTab === 'announcements' && (
                    <div className="p-4 md:p-12">
                      <AnnouncementManager 
                        announcements={announcements} 
                        onAdd={addAnnouncement} 
                        onDelete={deleteAnnouncement} 
                      />
                    </div>
                  )}
                  {adminTab === 'registrations' && (
                    <div className="p-4 md:p-12 space-y-8 md:space-y-12">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="text-xl md:text-2xl font-bold text-app-text font-serif italic">Gestione Iscrizioni</h3>
                        <div className="flex gap-2 md:gap-3">
                          <div className="px-3 py-1.5 md:px-4 md:py-2 bg-amber-50 text-amber-600 rounded-2xl text-[8px] md:text-[10px] font-bold border border-amber-100 flex items-center gap-1.5 md:gap-2 uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-amber-500 rounded-full animate-pulse" />
                            {allRegistrations.filter(r => r.status === 'pending').length} In sospeso
                          </div>
                          <div className="px-3 py-1.5 md:px-4 md:py-2 bg-emerald-50 text-emerald-600 rounded-2xl text-[8px] md:text-[10px] font-bold border border-emerald-100 flex items-center gap-1.5 md:gap-2 uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full" />
                            {allRegistrations.filter(r => r.status === 'confirmed').length} Confermate
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-4 md:gap-6">
                        {allRegistrations.map(reg => (
                          <div key={reg.id} className="p-4 md:p-8 bg-app-card border border-app-border rounded-[1.5rem] md:rounded-[2.5rem] hover:shadow-xl hover:shadow-app-accent/5 transition-all group overflow-hidden">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-8">
                              <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                                <div className="w-14 h-14 md:w-16 md:h-16 bg-app-bg rounded-2xl flex items-center justify-center text-app-accent font-bold text-xl md:text-2xl group-hover:bg-app-accent group-hover:text-white transition-all duration-500 border border-app-border shrink-0 mx-auto sm:mx-0">
                                  {reg.childName[0]}{reg.childSurname[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-xl md:text-2xl text-app-text text-center sm:text-left truncate">{reg.childName} {reg.childSurname}</p>
                                  <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 md:gap-2 mt-3 md:mt-4">
                                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-app-muted flex items-center gap-1.5 md:gap-2 bg-app-bg px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl border border-app-border">
                                      <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-app-accent/40" /> {new Date(reg.birthDate).toLocaleDateString('it-IT')}
                                    </span>
                                    <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl border flex items-center gap-1.5 md:gap-2 ${
                                      reg.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                      reg.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                      'bg-red-50 text-red-600 border-red-100'
                                    }`}>
                                      <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${
                                        reg.status === 'confirmed' ? 'bg-emerald-500' : 
                                        reg.status === 'pending' ? 'bg-amber-500' : 
                                        'bg-red-500'
                                      }`} />
                                      {reg.status}
                                    </span>
                                    <button 
                                      onClick={() => toggleGrestPayment(reg.id, !!reg.paidGrestFee)}
                                      className={`text-[9px] md:text-[10px] font-bold px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl flex items-center gap-1.5 md:gap-2 transition-all border ${
                                        reg.paidGrestFee ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' : 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100'
                                      }`}
                                    >
                                      <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                      {reg.paidGrestFee ? 'Quota Pagata' : 'Quota Non Pagata'}
                                    </button>
                                  </div>
                                  {(reg.allergies && reg.allergies.length > 0) && (
                                    <div className="flex flex-wrap justify-center sm:justify-start gap-1 mt-3 md:mt-4">
                                      {reg.allergies.map(a => (
                                        <span key={a} className="px-2 py-0.5 md:px-2.5 md:py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[8px] md:text-[9px] font-bold uppercase tracking-tight">
                                          {a}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {reg.medicalNotes && (
                                    <div className="mt-3 md:mt-4 p-2.5 md:p-3 bg-app-bg/50 rounded-xl border border-app-border/50">
                                      <p className="text-[9px] md:text-[10px] text-app-muted italic font-sans break-words">
                                        <Info className="w-3 md:w-3.5 h-3 md:h-3.5 inline mr-1 md:mr-1.5 opacity-50" /> {reg.medicalNotes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 md:gap-3 pt-4 md:pt-6 lg:pt-0 border-t lg:border-t-0 border-app-border/50">
                                <button onClick={() => setEditingRegistration(reg)} className="p-3 md:p-4 bg-app-bg text-app-muted rounded-2xl hover:bg-app-accent hover:text-white transition-all shadow-sm border border-app-border" title="Modifica">
                                  <Edit2 className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                                {reg.status === 'pending' && (
                                  <button onClick={() => updateRegistrationStatus(reg.id, 'confirmed')} className="p-3 md:p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-emerald-100" title="Conferma">
                                    <Check className="w-5 h-5 md:w-6 md:h-6" />
                                  </button>
                                )}
                                <LinkParentButton registration={reg} users={allUsers} onLink={linkRegistrationToParent} />
                                <DeleteButton onDelete={() => deleteEntity('registrations', reg.id)} className="bg-red-50 p-3 md:p-4" />
                              </div>
                            </div>
                          </div>
                        ))}
                        {allRegistrations.length === 0 && (
                          <div className="py-20 md:py-32 text-center bg-app-bg rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-app-border">
                            <Users className="w-12 h-12 md:w-16 md:h-16 text-app-muted/30 mx-auto mb-4" />
                            <p className="text-app-muted italic font-serif">Nessuna iscrizione registrata.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {adminTab === 'attendance' && (
                    <div className="p-4 md:p-12 space-y-8 md:space-y-12">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-xl md:text-2xl font-bold text-app-text font-serif italic">Presenze di Oggi</h3>
                        <div className="flex items-center gap-2 px-4 py-2 bg-app-bg border border-app-border rounded-2xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-app-muted">
                          <Calendar className="w-4 h-4 text-app-accent/40" />
                          {new Date().toLocaleDateString('it-IT')}
                        </div>
                      </div>
                      <div className="grid gap-3 md:gap-4">
                        {allRegistrations.filter(r => r.status === 'confirmed').map(reg => {
                          const isPresent = attendance.find(a => a.registrationId === reg.id)?.present;
                          return (
                            <div key={reg.id} className="p-4 md:p-5 bg-app-card border border-app-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 hover:shadow-lg hover:shadow-app-accent/5 transition-all group">
                              <p className="font-bold text-app-text text-base md:text-lg font-serif italic">{reg.childName} {reg.childSurname}</p>
                              <button 
                                onClick={() => toggleAttendance(reg.id)} 
                                className={`w-full sm:w-auto px-8 py-3 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg ${isPresent ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-app-bg text-app-muted border border-app-border hover:bg-app-accent/5'}`}
                              >
                                {isPresent ? 'Presente' : 'Assente'}
                              </button>
                            </div>
                          );
                        })}
                        {allRegistrations.filter(r => r.status === 'confirmed').length === 0 && (
                          <div className="py-20 text-center bg-app-bg rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-app-border">
                            <p className="text-app-muted italic font-serif">Nessun partecipante confermato.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {adminTab === 'surveys' && (
                    <div className="p-4 md:p-12 space-y-8 md:space-y-12">
                      <div className="space-y-6 md:space-y-10">
                        <h3 className="text-xl md:text-2xl font-bold text-app-text font-serif italic">Risultati Sondaggi</h3>
                        <div className="grid gap-6 md:gap-8">
                          {surveys.map(survey => {
                            const responses = allSurveyResponses.filter(r => r.surveyId === survey.id);
                            const participants = responses.filter(r => r.participating);
                            return (
                              <div key={survey.id} className="bg-app-card p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-app-border shadow-sm group">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                      <h4 className="font-bold text-xl md:text-2xl text-app-text truncate">{survey.title}</h4>
                                      <button 
                                        onClick={() => updateEntity('surveys', survey.id, { active: !survey.active })}
                                        className={`text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full transition-all ${survey.active ? 'bg-emerald-100 text-emerald-700' : 'bg-app-bg text-app-muted border border-app-border'}`}
                                      >
                                        {survey.active ? 'Attivo' : 'Archiviato'}
                                      </button>
                                    </div>
                                    <p className="text-app-text/70 leading-relaxed font-sans text-sm md:text-base">{survey.description}</p>
                                    {survey.minParticipants && (
                                      <div className="mt-6 flex items-center gap-4">
                                        <div className="w-32 md:w-48 h-2.5 bg-app-bg rounded-full overflow-hidden border border-app-border">
                                          <div 
                                            className={`h-full transition-all duration-700 ${participants.length >= survey.minParticipants ? 'bg-emerald-500' : 'bg-app-accent'}`}
                                            style={{ width: `${Math.min(100, (participants.length / survey.minParticipants) * 100)}%` }}
                                          />
                                        </div>
                                        <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${participants.length >= survey.minParticipants ? 'text-emerald-600' : 'text-app-accent'}`}>
                                          {participants.length}/{survey.minParticipants}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-row md:flex-col items-center md:items-end gap-4 w-full md:w-auto justify-between md:justify-start border-t md:border-t-0 pt-4 md:pt-0 border-app-border/50">
                                    <div className="md:text-right">
                                      <p className="text-3xl md:text-5xl font-bold text-app-text font-serif italic">{participants.length}</p>
                                      <p className="text-[9px] md:text-[10px] uppercase font-bold text-app-muted tracking-[0.2em]">Adesioni</p>
                                    </div>
                                    <DeleteButton onDelete={() => deleteEntity('surveys', survey.id)} />
                                  </div>
                                </div>
                                <div className="space-y-4 pt-6 md:pt-8 border-t border-app-border">
                                  <p className="text-[9px] md:text-[10px] font-bold text-app-muted uppercase tracking-[0.2em]">Dettaglio Partecipanti</p>
                                  {participants.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {participants.map(p => {
                                        const reg = allRegistrations.find(r => r.id === p.registrationId);
                                        return (
                                          <div key={p.id} className="flex flex-col sm:flex-row items-center justify-between p-3 md:p-4 bg-app-bg rounded-2xl border border-app-border group/item hover:border-app-accent/30 transition-all gap-3">
                                            <span className="text-xs font-bold text-app-text truncate max-w-full">
                                              {reg ? `${reg.childName} ${reg.childSurname}` : 'Sconosciuto'}
                                            </span>
                                            <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                                              <button 
                                                onClick={() => toggleTripPayment(p.id!, !!p.paidTripFee)}
                                                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[8px] md:text-[9px] font-bold uppercase tracking-widest transition-all border ${p.paidTripFee ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}
                                              >
                                                {p.paidTripFee ? 'Pagato' : 'No'}
                                              </button>
                                              <DeleteButton onDelete={() => deleteEntity('surveyResponses', p.id!)} className="p-2 border-none bg-transparent hover:bg-red-50" />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-app-muted italic font-serif py-2">Nessuna partecipazione registrata.</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="pt-8 md:pt-12 border-t border-app-border">
                        <h3 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 text-app-text font-serif italic">Crea Nuovo Sondaggio</h3>
                        <div className="bg-app-bg p-5 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border border-app-border">
                          <SurveyForm />
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'schedule' && (
                    <div className="p-4 md:p-12 space-y-8 md:space-y-12">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="text-xl md:text-2xl font-bold text-app-text font-serif italic">Gestione Orari</h3>
                        <div className="px-4 py-2 bg-app-bg border border-app-border rounded-2xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-app-muted">
                          {schedule.length} Attività
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                        <div className="space-y-4 md:space-y-6">
                          <p className="text-[9px] md:text-[10px] font-bold text-app-muted uppercase tracking-[0.2em] mb-4">Programma Attuale</p>
                          <div className="grid gap-3 md:gap-4">
                            {schedule.map(item => (
                              <div key={item.id} className="p-4 md:p-6 bg-app-card border border-app-border rounded-[1.5rem] md:rounded-[2.5rem] hover:shadow-xl hover:shadow-app-accent/5 transition-all group flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6">
                                <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 text-center sm:text-left w-full">
                                  <div className="w-20 h-14 md:w-24 md:h-16 bg-app-bg rounded-2xl flex items-center justify-center text-app-accent font-bold text-lg md:text-xl border border-app-border group-hover:bg-app-accent group-hover:text-white transition-all duration-500 shrink-0">
                                    {item.time}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-app-text text-base md:text-xl font-serif italic truncate">{item.activity}</p>
                                    <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-2">
                                      <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-app-muted bg-app-bg px-2 py-1 rounded-xl border border-app-border">{item.day}</span>
                                      {item.description && <p className="text-[10px] md:text-xs text-app-muted italic font-serif truncate max-w-[150px] md:max-w-[200px]">— {item.description}</p>}
                                    </div>
                                  </div>
                                </div>
                                <DeleteButton onDelete={() => deleteEntity('schedule', item.id)} className="p-2 sm:p-4" />
                              </div>
                            ))}
                            {schedule.length === 0 && (
                              <div className="py-20 text-center bg-app-bg rounded-[2rem] border-2 border-dashed border-app-border">
                                <p className="text-app-muted italic font-serif">Nessuna attività in programma.</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-4 md:space-y-6">
                          <p className="text-[9px] md:text-[10px] font-bold text-app-muted uppercase tracking-[0.2em] mb-4">Aggiungi Attività</p>
                          <div className="bg-app-bg p-5 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border border-app-border">
                            <ScheduleForm />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'events' && (
                    <div className="p-4 md:p-12 space-y-8 md:space-y-12">
                      <div className="space-y-6 md:space-y-10">
                        <h3 className="text-xl md:text-2xl font-bold text-app-text font-serif italic">Eventi in Programma</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                          <div className="grid gap-4 md:gap-6">
                            {events.map(event => (
                              <div key={event.id} className="p-4 md:p-6 bg-app-card border border-app-border rounded-[1.5rem] md:rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-app-accent/5 transition-all group flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4 mb-2">
                                    <h4 className="font-bold text-lg md:text-xl text-app-text truncate">{event.title}</h4>
                                    <span className="px-2.5 py-1 bg-app-bg border border-app-border text-app-muted rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 md:gap-2 w-fit">
                                      <Calendar className="w-3 md:w-3.5 h-3 md:h-3.5 text-app-accent/40" />
                                      {new Date(event.date).toLocaleDateString('it-IT')}
                                    </span>
                                  </div>
                                  <p className="text-app-text/60 text-xs md:text-sm leading-relaxed font-sans line-clamp-2">{event.description}</p>
                                  {event.location && (
                                    <div className="flex items-center gap-1.5 md:gap-2 mt-3 md:mt-4 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-app-muted">
                                      <MapPin className="w-3.5 md:w-4 h-3.5 md:h-4 text-app-accent/40" />
                                      {event.location}
                                    </div>
                                  )}
                                </div>
                                <DeleteButton onDelete={() => deleteEntity('events', event.id)} className="p-2" />
                              </div>
                            ))}
                            {events.length === 0 && (
                              <div className="py-20 text-center bg-app-bg rounded-[2rem] border-2 border-dashed border-app-border">
                                <p className="text-app-muted italic font-serif">Nessun evento in programma.</p>
                              </div>
                            )}
                          </div>
                          <div className="bg-app-bg p-5 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border border-app-border">
                            <EventForm />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'users' && (
                    <div className="p-4 md:p-12 space-y-8 md:space-y-12">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6">
                        <h3 className="text-xl md:text-2xl font-bold text-app-text font-serif italic">Gestione Utenti</h3>
                        <div className="relative flex-1 max-w-md">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-app-accent/40" />
                          <input 
                            type="text" 
                            placeholder="Cerca utenti..." 
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full pl-10 md:pl-12 pr-4 md:pr-6 py-2.5 md:py-3.5 bg-app-bg border border-app-border rounded-2xl md:rounded-[1.5rem] text-sm outline-none focus:ring-4 focus:ring-app-accent/5 focus:border-app-accent transition-all font-sans"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                        <div className="lg:col-span-2 space-y-6 md:space-y-8">
                          <p className="text-[9px] md:text-[10px] font-bold text-app-muted uppercase tracking-[0.2em]">Lista Utenti</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {allUsers.filter(u => 
                              (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) || 
                              (u.firstName + ' ' + u.lastName).toLowerCase().includes(userSearch.toLowerCase()) ||
                              (u.displayName || '').toLowerCase().includes(userSearch.toLowerCase())
                            ).map(u => (
                              <div key={u.uid} className="p-4 md:p-8 bg-app-card border border-app-border rounded-[1.5rem] md:rounded-[2.5rem] hover:shadow-xl hover:shadow-app-accent/5 transition-all group overflow-hidden">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 md:gap-6 mb-6 md:mb-8">
                                  <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 text-center sm:text-left">
                                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 shrink-0 ${
                                      u.isManual ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-app-bg text-app-accent border-app-border group-hover:bg-app-accent group-hover:text-white'
                                    }`}>
                                      <UserCircle className="w-10 h-10" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-xl text-app-text truncate">{u.firstName ? `${u.firstName} ${u.lastName}` : u.displayName || 'Utente senza nome'}</p>
                                      <p className="text-xs text-app-muted font-sans break-all">{u.email || (u.phone ? `Tel: ${u.phone}` : 'Nessun contatto')}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button onClick={() => setEditingUser(u)} className="p-4 text-stone-300 hover:text-app-accent hover:bg-app-accent/5 rounded-2xl transition-all group border border-transparent hover:border-app-accent/10">
                                      <Edit2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                    </button>
                                    <DeleteButton onDelete={() => deleteEntity('users', u.uid)} className="p-4" />
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-app-border/50">
                                  <div className="sm:mr-auto text-center sm:text-left">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-app-muted mb-1">Ruolo Attuale</p>
                                    <div className="flex items-center justify-center sm:justify-start gap-2">
                                      <span className="px-3 py-1 bg-app-accent/10 text-app-accent rounded-lg text-[10px] font-bold uppercase tracking-widest border border-app-accent/20">{u.role}</span>
                                      {u.isManual && <span className="text-[8px] font-bold text-amber-600 uppercase tracking-tighter bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Manuale</span>}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap justify-center gap-2">
                                    {(['parent', 'animator', 'admin'] as UserRole[]).map(r => (
                                      <button 
                                        key={r}
                                        onClick={() => updateEntity('users', u.uid, { role: r })}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border ${
                                          u.role === r ? 'bg-app-accent text-white border-app-accent shadow-md shadow-app-accent/20' : 'bg-app-bg text-app-muted border-app-border hover:bg-app-accent/5'
                                        }`}
                                      >
                                        {r}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-8">
                          <p className="text-[10px] font-bold text-app-muted uppercase tracking-[0.2em]">Crea Utente Manuale</p>
                          <div className="bg-app-bg p-8 rounded-[3rem] border border-app-border">
                            <ManualUserForm onComplete={() => {}} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'legal' && (
                    <div className="p-6 md:p-12 space-y-12">
                      <div className="space-y-10">
                        <h3 className="text-2xl font-bold text-app-text font-serif italic">Gestione Pagine Legali</h3>
                        <div className="bg-app-bg p-6 md:p-10 rounded-[3rem] border border-app-border">
                          <LegalEditor 
                            content={legalContent} 
                            onSave={async (type, content) => {
                              const existing = legalContent.find(c => c.type === type);
                              if (existing) {
                                await updateDoc(doc(db, 'legalContent', existing.id), { content, updatedAt: Timestamp.now() });
                              } else {
                                await addDoc(collection(db, 'legalContent'), { type, content, updatedAt: Timestamp.now() });
                              }
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {activeTab === 'legal' && legalTab && (
              <motion.div key="legal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LegalPage 
                  type={legalTab} 
                  content={legalContent.find(c => c.type === legalTab)?.content} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {profile?.mustChangePassword && (
          <ChangePasswordModal onComplete={() => setProfile(prev => prev ? { ...prev, mustChangePassword: false } : null)} />
        )}

        {editingUser && (
          <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
        )}

        {editingRegistration && (
          <EditRegistrationModal registration={editingRegistration} onClose={() => setEditingRegistration(null)} />
        )}
        
        <CookieConsent />

        <footer className="bg-warm-card border-t border-warm-border py-20 px-6 mt-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warm-accent rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-warm-accent/20">C</div>
                <h3 className="text-2xl font-bold text-warm-text font-serif italic">Comunità in Cammino</h3>
              </div>
              <p className="text-warm-muted text-sm leading-relaxed font-sans">Un'esperienza di crescita e condivisione per i ragazzi della nostra parrocchia.</p>
            </div>
            <div className="space-y-6">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-warm-muted">Link Legali</h4>
              <div className="flex flex-col gap-4">
                <button onClick={() => { setActiveTab('legal'); setLegalTab('privacy'); window.scrollTo(0,0); }} className="text-sm text-warm-text/70 hover:text-warm-accent transition-colors text-left font-sans">Privacy Policy</button>
                <button onClick={() => { setActiveTab('legal'); setLegalTab('cookies'); window.scrollTo(0,0); }} className="text-sm text-warm-text/70 hover:text-warm-accent transition-colors text-left font-sans">Cookie Policy</button>
                <button onClick={() => { setActiveTab('legal'); setLegalTab('terms'); window.scrollTo(0,0); }} className="text-sm text-warm-text/70 hover:text-warm-accent transition-colors text-left font-sans">Termini e Condizioni</button>
              </div>
            </div>
            <div className="space-y-6">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-warm-muted">Contatti</h4>
              <p className="text-sm text-warm-text/70 font-sans">Parrocchia di Oppeano<br/>Via Roma, 1<br/>37050 Oppeano (VR)</p>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-warm-border flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-bold text-warm-muted uppercase tracking-widest">© 2026 Comunità in Cammino. Tutti i diritti riservati.</p>
            <div className="flex items-center gap-2 text-[10px] font-bold text-warm-muted uppercase tracking-widest">
              Made with <Heart className="w-3 h-3 text-red-400 fill-red-400" /> for the community
            </div>
          </div>
        </footer>

        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-[95%] max-w-md">
          <div className="bg-warm-card/90 backdrop-blur-2xl border border-warm-border p-2 rounded-[2rem] shadow-2xl flex items-center justify-around gap-1">
            <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home className="w-5 h-5" />} label="Home" />
            <NavButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={
              <div className="relative">
                <Bell className="w-5 h-5" />
                {allNotifications.length > notificationReads.length && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                )}
              </div>
            } label="Notifiche" />
            <NavButton active={activeTab === 'register'} onClick={() => setActiveTab('register')} icon={<UserPlus className="w-5 h-5" />} label="Iscriviti" />
            {user && <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserCircle className="w-5 h-5" />} label="Profilo" />}
            {profile?.role === 'admin' && <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Settings className="w-5 h-5" />} label="Admin" />}
          </div>
        </nav>
      </div>
    </ErrorBoundary>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center gap-1.5 px-4 py-3 rounded-2xl transition-all duration-500 relative group flex-1 ${
        active 
          ? 'text-warm-accent bg-warm-accent/5' 
          : 'text-warm-muted hover:text-warm-accent hover:bg-warm-accent/5'
      }`}
    >
      <span className={`transition-transform duration-500 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] whitespace-nowrap">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute -bottom-1 w-1.5 h-1.5 bg-warm-accent rounded-full shadow-lg shadow-warm-accent/50"
        />
      )}
    </button>
  );
}

function AdminTab({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, key?: React.Key }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-500 border font-sans text-[10px] font-bold uppercase tracking-[0.2em] whitespace-nowrap w-full justify-center ${
        active 
          ? 'bg-warm-accent text-white border-warm-accent shadow-xl shadow-warm-accent/20 scale-[1.02]' 
          : 'bg-white text-warm-muted border-warm-border hover:border-warm-accent/20 hover:bg-warm-accent/5'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-warm-accent'}`}>{icon}</span>
      <span className="font-serif italic text-sm lowercase tracking-normal">{label}</span>
    </button>
  );
}

function AdminMenuButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, key?: React.Key }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-sans text-xs font-bold uppercase tracking-widest w-full text-left ${
        active 
          ? 'bg-warm-accent/10 text-warm-accent' 
          : 'text-warm-muted hover:bg-warm-bg'
      }`}
    >
      <span className={`${active ? 'text-warm-accent' : 'text-warm-accent/60'}`}>{icon}</span>
      <span>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 bg-warm-accent rounded-full" />}
    </button>
  );
}

function ProfileForm({ onComplete }: { onComplete: (firstName: string, lastName: string) => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="micro-label ml-2">Nome</label>
          <input 
            required 
            type="text" 
            value={firstName} 
            onChange={e => setFirstName(e.target.value)} 
            className="modern-input" 
            placeholder="Il tuo nome" 
          />
        </div>
        <div className="space-y-3">
          <label className="micro-label ml-2">Cognome</label>
          <input 
            required 
            type="text" 
            value={lastName} 
            onChange={e => setLastName(e.target.value)} 
            className="modern-input" 
            placeholder="Il tuo cognome" 
          />
        </div>
      </div>
      <button 
        onClick={() => firstName && lastName && onComplete(firstName, lastName)} 
        className="w-full py-8 bg-warm-accent text-white rounded-full font-bold text-xl hover:bg-warm-accent/90 transition-all shadow-2xl shadow-warm-accent/30 flex items-center justify-center gap-4 font-serif italic"
      >
        <CheckCircle className="w-7 h-7" />
        Salva Profilo
      </button>
    </div>
  );
}

function RegistrationForm({ user, existingRegistrations, onComplete }: { user: User, existingRegistrations: Registration[], onComplete: () => void }) {
  const [formData, setFormData] = useState({ 
    childName: '', 
    childSurname: '', 
    birthDate: '', 
    allergies: [] as string[],
    medicalNotes: '' 
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleAllergy = (allergy: string) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter(a => a !== allergy)
        : [...prev.allergies, allergy]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Duplicate check
    const isDuplicate = existingRegistrations.some(r => 
      r.childName.toLowerCase().trim() === formData.childName.toLowerCase().trim() &&
      r.childSurname.toLowerCase().trim() === formData.childSurname.toLowerCase().trim() &&
      r.birthDate === formData.birthDate
    );

    if (isDuplicate) {
      setError("Questo bambino è già stato iscritto.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'registrations'), { ...formData, parentUid: user.uid, status: 'pending', createdAt: Timestamp.now() });
      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'registrations');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-10 md:space-y-12">
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-rose-50 border border-rose-100 text-rose-600 rounded-[2rem] text-sm font-medium flex items-center gap-4">
          <XCircle className="w-6 h-6 flex-shrink-0" /> {error}
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
        <div className="space-y-3">
          <label className="micro-label ml-2">Nome</label>
          <input 
            required 
            type="text" 
            value={formData.childName} 
            onChange={e => setFormData({...formData, childName: e.target.value})} 
            className="modern-input" 
            placeholder="Nome del bambino" 
          />
        </div>
        <div className="space-y-3">
          <label className="micro-label ml-2">Cognome</label>
          <input 
            required 
            type="text" 
            value={formData.childSurname} 
            onChange={e => setFormData({...formData, childSurname: e.target.value})} 
            className="modern-input" 
            placeholder="Cognome del bambino" 
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="micro-label ml-2">Data di Nascita</label>
        <div className="relative group">
          <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-warm-accent/40 pointer-events-none group-focus-within:text-warm-accent transition-colors" />
          <input 
            required 
            type="date" 
            value={formData.birthDate} 
            onChange={e => setFormData({...formData, birthDate: e.target.value})} 
            className="modern-input pl-16" 
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="micro-label ml-2">Allergie Comuni</label>
        <div className="flex flex-wrap gap-3">
          {COMMON_ALLERGIES.map(allergy => (
            <button
              key={allergy}
              type="button"
              onClick={() => toggleAllergy(allergy)}
              className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                formData.allergies.includes(allergy)
                  ? 'bg-warm-accent text-white border-warm-accent shadow-lg shadow-warm-accent/20'
                  : 'bg-warm-bg text-warm-muted border-warm-border hover:bg-warm-accent/5'
              }`}
            >
              {allergy}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="micro-label ml-2">Note Mediche / Altre Allergie</label>
        <textarea 
          value={formData.medicalNotes} 
          onChange={e => setFormData({...formData, medicalNotes: e.target.value})} 
          className="modern-input min-h-[180px] resize-none" 
          placeholder="Opzionale: altre allergie, intolleranze o note importanti per gli animatori" 
        />
      </div>

      <div className="space-y-8 pt-6">
        <button 
          type="submit" 
          disabled={submitting}
          className="w-full py-8 bg-warm-accent text-white rounded-full font-bold text-xl hover:bg-warm-accent/90 transition-all shadow-2xl shadow-warm-accent/30 flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed font-serif italic"
        >
          {submitting ? <Loader2 className="w-7 h-7 animate-spin" /> : <CheckCircle className="w-7 h-7" />}
          {submitting ? 'Invio in corso...' : 'Invia Iscrizione'}
        </button>
        <div className="flex items-center justify-center gap-3">
          <div className="h-px flex-1 bg-warm-border" />
          <p className="micro-label px-4">
            Verifica Amministrativa Richiesta
          </p>
          <div className="h-px flex-1 bg-warm-border" />
        </div>
      </div>
    </form>
  );
}

function LinkParentButton({ registration, users, onLink }: { registration: Registration, users: UserProfile[], onLink: (regId: string, parentUid: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    (u.firstName + ' ' + u.lastName).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all border ${registration.parentUid ? 'bg-warm-bg text-warm-muted border-warm-border hover:bg-white' : 'bg-warm-accent text-white border-warm-accent shadow-lg shadow-warm-accent/20 hover:scale-[1.02]'}`}
      >
        <LinkIcon className="w-4 h-4" /> {registration.parentUid ? 'Cambia Genitore' : 'Collega Genitore'}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              className="absolute right-0 mt-4 w-80 bg-white rounded-[2.5rem] shadow-2xl border border-warm-border z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-warm-border bg-warm-bg/50">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted/40" />
                  <input 
                    type="text" 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    className="modern-input py-3 text-xs pl-10" 
                    placeholder="Cerca per nome o email..." 
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-warm-border p-3">
                {filteredUsers.map(u => (
                  <button 
                    key={u.uid} 
                    onClick={() => { onLink(registration.id, u.uid); setIsOpen(false); }}
                    className="w-full p-4 text-left hover:bg-warm-accent/5 rounded-2xl transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-warm-bg rounded-xl flex items-center justify-center text-warm-muted group-hover:bg-warm-accent group-hover:text-white transition-all duration-500 border border-warm-border">
                        <UserCircle className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-warm-text">{u.firstName ? `${u.firstName} ${u.lastName}` : u.displayName}</p>
                        <p className="text-[10px] text-warm-muted font-sans tracking-tight">{u.email}</p>
                      </div>
                    </div>
                    {registration.parentUid === u.uid && (
                      <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="p-10 text-center">
                    <Search className="w-10 h-10 text-warm-muted/20 mx-auto mb-3" />
                    <p className="micro-label">Nessun utente trovato</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function EventForm() {
  const [formData, setFormData] = useState({ title: '', description: '', date: '', location: '' });
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'events'), { ...formData, createdAt: Timestamp.now() });
      setFormData({ title: '', description: '', date: '', location: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'events');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-3">
        <label className="micro-label ml-2">Titolo Evento</label>
        <input 
          required 
          type="text" 
          value={formData.title} 
          onChange={e => setFormData({...formData, title: e.target.value})} 
          className="modern-input" 
          placeholder="Es: Festa di Inizio Grest" 
        />
      </div>
      <div className="space-y-3">
        <label className="micro-label ml-2">Descrizione</label>
        <textarea 
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})} 
          className="modern-input min-h-[150px] resize-none" 
          placeholder="Dettagli dell'evento, programma, cosa portare..." 
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="micro-label ml-2">Data</label>
          <input 
            required 
            type="date" 
            value={formData.date} 
            onChange={e => setFormData({...formData, date: e.target.value})} 
            className="modern-input" 
          />
        </div>
        <div className="space-y-3">
          <label className="micro-label ml-2">Luogo</label>
          <input 
            type="text" 
            value={formData.location} 
            onChange={e => setFormData({...formData, location: e.target.value})} 
            className="modern-input" 
            placeholder="Es: Campo Sportivo" 
          />
        </div>
      </div>
      <button 
        type="submit" 
        disabled={submitting}
        className="w-full py-6 bg-warm-accent text-white rounded-full font-bold hover:bg-warm-accent/90 transition-all shadow-xl shadow-warm-accent/20 flex items-center justify-center gap-3 font-serif text-xl italic disabled:opacity-50"
      >
        {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
        {submitting ? 'Creazione...' : 'Crea Evento'}
      </button>
    </form>
  );
}

function SurveyForm() {
  const [formData, setFormData] = useState({ title: '', description: '', cost: '', departureTime: '', returnTime: '', minParticipants: '' });
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'surveys'), { 
        ...formData, 
        cost: formData.cost ? Number(formData.cost) : null,
        minParticipants: formData.minParticipants ? Number(formData.minParticipants) : null,
        active: true, 
        createdAt: Timestamp.now() 
      });
      setFormData({ title: '', description: '', cost: '', departureTime: '', returnTime: '', minParticipants: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'surveys');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="space-y-3">
        <label className="micro-label ml-2">Titolo Sondaggio</label>
        <input 
          required 
          type="text" 
          value={formData.title} 
          onChange={e => setFormData({...formData, title: e.target.value})} 
          className="modern-input" 
          placeholder="Es: Gita a Gardaland" 
        />
      </div>
      <div className="space-y-3">
        <label className="micro-label ml-2">Dettagli Gita</label>
        <textarea 
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})} 
          className="modern-input min-h-[150px] resize-none" 
          placeholder="Descrivi l'attività, cosa portare, ecc..." 
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="micro-label ml-2">Costo (€)</label>
          <input 
            type="number" 
            value={formData.cost} 
            onChange={e => setFormData({...formData, cost: e.target.value})} 
            className="modern-input" 
            placeholder="Es: 25" 
          />
        </div>
        <div className="space-y-3">
          <label className="micro-label ml-2">Min. Partecipanti</label>
          <input 
            type="number" 
            value={formData.minParticipants} 
            onChange={e => setFormData({...formData, minParticipants: e.target.value})} 
            className="modern-input" 
            placeholder="Es: 30" 
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="micro-label ml-2">Orario Partenza</label>
          <input 
            type="time" 
            value={formData.departureTime} 
            onChange={e => setFormData({...formData, departureTime: e.target.value})} 
            className="modern-input" 
          />
        </div>
        <div className="space-y-3">
          <label className="micro-label ml-2">Orario Ritorno</label>
          <input 
            type="time" 
            value={formData.returnTime} 
            onChange={e => setFormData({...formData, returnTime: e.target.value})} 
            className="modern-input" 
          />
        </div>
      </div>
      <button 
        disabled={submitting} 
        type="submit" 
        className="w-full py-8 bg-warm-accent text-white rounded-full font-bold text-xl hover:bg-warm-accent/90 transition-all shadow-2xl shadow-warm-accent/30 flex items-center justify-center gap-4 font-serif italic disabled:opacity-50"
      >
        {submitting ? <Loader2 className="w-7 h-7 animate-spin" /> : <Vote className="w-7 h-7" />}
        {submitting ? 'Pubblicazione...' : 'Pubblica Sondaggio'}
      </button>
    </form>
  );
}

function ScheduleForm() {
  const [formData, setFormData] = useState({ time: '', activity: '', description: '', day: 'Lunedì' });
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'schedule'), { ...formData, createdAt: Timestamp.now() });
      setFormData({ time: '', activity: '', description: '', day: 'Lunedì' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'schedule');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="micro-label ml-2">Orario</label>
          <input 
            required 
            type="time" 
            value={formData.time} 
            onChange={e => setFormData({...formData, time: e.target.value})} 
            className="modern-input" 
          />
        </div>
        <div className="space-y-3">
          <label className="micro-label ml-2">Giorno</label>
          <div className="relative">
            <select 
              value={formData.day} 
              onChange={e => setFormData({...formData, day: e.target.value})} 
              className="modern-input appearance-none pr-12"
            >
              {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-warm-muted">
              <ArrowUpRight className="w-4 h-4 rotate-45" />
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <label className="micro-label ml-2">Attività</label>
        <input 
          required 
          type="text" 
          value={formData.activity} 
          onChange={e => setFormData({...formData, activity: e.target.value})} 
          className="modern-input" 
          placeholder="Es: Accoglienza e Preghiera" 
        />
      </div>
      <div className="space-y-3">
        <label className="micro-label ml-2">Descrizione</label>
        <textarea 
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})} 
          className="modern-input min-h-[120px] resize-none" 
          placeholder="Dettagli opzionali sull'attività..." 
        />
      </div>
      <button 
        type="submit" 
        disabled={submitting}
        className="w-full py-6 bg-warm-accent text-white rounded-full font-bold hover:bg-warm-accent/90 transition-all shadow-xl shadow-warm-accent/20 flex items-center justify-center gap-3 font-serif text-xl italic disabled:opacity-50"
      >
        {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Timer className="w-6 h-6" />}
        {submitting ? 'Aggiunta...' : 'Aggiungi Orario'}
      </button>
    </form>
  );
}
