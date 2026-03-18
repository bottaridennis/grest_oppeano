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
import { UserProfile, Registration, GrestEvent, UserRole, Attendance, Survey, SurveyResponse, ScheduleItem, Announcement, LegalContent } from './types';
import { COMMON_ALLERGIES } from './constants';
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
  const [confirming, setConfirming] = useState(false);
  
  useEffect(() => {
    if (confirming) {
      const timer = setTimeout(() => setConfirming(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirming]);

  if (confirming) {
    return (
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(); setConfirming(false); }}
        className={`p-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-all shadow-lg flex items-center gap-2 text-[10px] font-bold animate-pulse ${className}`}
      >
        <Trash2 className="w-4 h-4" /> Conferma?
      </button>
    );
  }

  return (
    <button 
      onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
      className={`p-3 text-warm-muted hover:text-red-500 transition-colors bg-warm-bg rounded-2xl border border-warm-border hover:border-red-100 ${className}`}
      title="Elimina"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  );
}

// --- Components ---

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
      <div className="min-h-screen flex items-center justify-center bg-warm-bg p-6">
        <div className="bg-warm-card p-10 rounded-[3rem] shadow-2xl max-w-md w-full text-center border border-warm-border">
          <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-red-100">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-warm-text mb-3 font-serif italic">Ops! Qualcosa è andato storto</h2>
          <p className="text-warm-muted mb-8 font-sans leading-relaxed">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-5 bg-warm-accent text-white rounded-2xl font-bold hover:bg-warm-accent/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-warm-accent/20 font-serif italic"
          >
            Ricarica l'app
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
    { label: 'Iscrizioni Totali', value: registrations.length, icon: Users, color: 'text-warm-accent', bg: 'bg-warm-accent/5' },
    { label: 'Iscrizioni Confermate', value: registrations.filter(r => r.status === 'confirmed').length, icon: CheckCircle, color: 'text-warm-accent', bg: 'bg-warm-accent/5' },
    { label: 'Utenti Registrati', value: users.length, icon: UserCircle, color: 'text-warm-accent', bg: 'bg-warm-accent/5' },
    { label: 'Sondaggi Attivi', value: surveys.filter(s => s.active).length, icon: Vote, color: 'text-warm-accent', bg: 'bg-warm-accent/5' },
  ];

  return (
    <div className="space-y-4 md:space-y-12">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-warm-bg p-3 md:p-8 rounded-[1rem] md:rounded-[2.5rem] border border-warm-border hover:shadow-xl hover:shadow-warm-accent/5 transition-all group"
          >
            <div className={`w-10 h-10 md:w-14 md:h-14 ${stat.bg} ${stat.color} rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-6 border border-warm-border group-hover:scale-110 transition-transform duration-500`}>
              <stat.icon className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <p className="text-warm-muted text-[8px] md:text-[10px] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] mb-1 truncate">{stat.label}</p>
            <p className="text-2xl md:text-4xl font-bold text-warm-text font-serif italic">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-10">
        <div className="bg-warm-bg/50 p-4 md:p-10 rounded-[1.5rem] md:rounded-[3rem] border border-warm-border">
          <h4 className="text-lg md:text-2xl font-bold text-warm-text font-serif italic mb-4 md:mb-8">Ultime Iscrizioni</h4>
          <div className="space-y-2 md:space-y-3">
            {registrations.slice(0, 5).map(reg => (
              <div key={reg.id} className="flex items-center justify-between p-2 md:p-3 bg-warm-card rounded-xl md:rounded-2xl border border-warm-border shadow-sm gap-2">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <div className="w-7 h-7 md:w-10 md:h-10 bg-warm-accent/10 text-warm-accent rounded-lg md:rounded-xl flex items-center justify-center font-bold flex-shrink-0 text-[10px] md:text-base">
                    {reg.childName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-sm font-bold text-warm-text truncate">{reg.childName} {reg.childSurname}</p>
                    <p className="text-[7px] md:text-[10px] text-warm-muted uppercase tracking-widest">{reg.status}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[7px] md:text-[10px] font-bold text-warm-muted">{new Date(reg.createdAt.toDate()).toLocaleDateString('it-IT')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-warm-bg/50 p-4 md:p-10 rounded-[1.5rem] md:rounded-[3rem] border border-warm-border">
          <h4 className="text-lg md:text-2xl font-bold text-warm-text font-serif italic mb-4 md:mb-8">Stato Sondaggi</h4>
          <div className="space-y-4 md:space-y-5">
            {surveys.slice(0, 3).map(survey => {
              const surveyResponses = responses.filter(r => r.surveyId === survey.id);
              const percentage = survey.minParticipants ? Math.min(100, (surveyResponses.length / survey.minParticipants) * 100) : 0;
              return (
                <div key={survey.id} className="space-y-2 md:space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-[11px] md:text-sm font-bold text-warm-text truncate max-w-[70%]">{survey.title}</p>
                    <p className="text-[9px] md:text-[10px] font-bold text-warm-muted uppercase tracking-widest">{surveyResponses.length} / {survey.minParticipants || '∞'}</p>
                  </div>
                  <div className="h-1.5 md:h-2 bg-warm-bg rounded-full overflow-hidden border border-warm-border">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full bg-warm-accent"
                    />
                  </div>
                </div>
              );
            })}
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-xl md:text-2xl font-bold text-warm-text font-serif italic">Gestione Annunci</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg ${isAdding ? 'bg-warm-bg text-warm-muted border border-warm-border' : 'bg-warm-accent text-white shadow-warm-accent/20 hover:scale-[1.02]'}`}
        >
          {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {isAdding ? 'Annulla' : 'Nuovo Annuncio'}
        </button>
      </div>

      {isAdding && (
        <motion.form 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          onSubmit={handleSubmit}
          className="bg-warm-bg p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-warm-border space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Titolo</label>
              <input 
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-6 py-4 bg-warm-card border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans"
                placeholder="Titolo dell'annuncio..."
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Tipo</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-6 py-4 bg-warm-card border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans cursor-pointer"
              >
                <option value="info">Info</option>
                <option value="warning">Avviso</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Contenuto</label>
            <textarea 
              required
              rows={4}
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-6 py-4 bg-warm-card border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans resize-none"
              placeholder="Scrivi qui il contenuto dell'annuncio..."
            />
          </div>
          <button type="submit" className="w-full py-5 bg-warm-accent text-white rounded-2xl font-bold hover:bg-warm-accent/90 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-warm-accent/20 font-serif italic">
            Pubblica Annuncio
          </button>
        </motion.form>
      )}

      <div className="grid gap-4 md:gap-6">
        {announcements.map(ann => (
          <div key={ann.id} className="p-4 md:p-6 bg-warm-card border border-warm-border rounded-[1.5rem] md:rounded-[2rem] hover:shadow-xl hover:shadow-warm-accent/5 transition-all group flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex gap-4 md:gap-5">
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border flex-shrink-0 ${
                ann.type === 'urgent' ? 'bg-red-50 text-red-500 border-red-100' :
                ann.type === 'warning' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                'bg-emerald-50 text-emerald-500 border-emerald-100'
              }`}>
                <Megaphone className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                  <h4 className="font-bold text-base md:text-lg text-warm-text truncate">{ann.title}</h4>
                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-warm-muted">{new Date(ann.createdAt.toDate()).toLocaleDateString('it-IT')}</span>
                </div>
                <p className="text-warm-text/70 text-xs md:text-sm leading-relaxed font-sans">{ann.content}</p>
              </div>
            </div>
            <div className="w-full sm:w-auto flex justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-warm-border/50">
              <DeleteButton onDelete={() => onDelete(ann.id!)} />
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="py-20 text-center bg-warm-bg rounded-[2rem] border-2 border-dashed border-warm-border">
            <Megaphone className="w-12 h-12 text-warm-muted/30 mx-auto mb-4" />
            <p className="text-warm-muted italic font-serif">Nessun annuncio pubblicato.</p>
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Nome</label>
          <input 
            required
            value={formData.firstName}
            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-6 py-4 bg-warm-card border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans"
            placeholder="Nome..."
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Cognome</label>
          <input 
            required
            value={formData.lastName}
            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-6 py-4 bg-warm-card border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans"
            placeholder="Cognome..."
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Email</label>
          <input 
            type="email"
            required
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-6 py-4 bg-warm-card border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans"
            placeholder="email@esempio.com"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Password Temporanea</label>
          <input 
            required
            type="password"
            value={formData.tempPassword}
            onChange={e => setFormData({ ...formData, tempPassword: e.target.value })}
            className="w-full px-6 py-4 bg-warm-card border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans"
            placeholder="Password..."
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Telefono</label>
          <input 
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-6 py-4 bg-warm-card border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans"
            placeholder="333 1234567"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Ruolo</label>
          <select 
            value={formData.role}
            onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
            className="w-full px-6 py-4 bg-warm-card border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans cursor-pointer"
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
        className="w-full py-5 bg-warm-accent text-white rounded-2xl font-bold hover:bg-warm-accent/90 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-warm-accent/20 font-serif italic disabled:opacity-50"
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
      <h2 className="text-3xl md:text-5xl font-bold text-warm-text mb-8 md:mb-12 font-serif italic leading-tight">{titles[type]}</h2>
      <div className="bg-warm-bg p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-warm-border shadow-sm">
        <div className="prose prose-stone max-w-none text-warm-text/80 font-sans leading-relaxed whitespace-pre-wrap text-sm md:text-base">
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
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        {(['privacy', 'cookies', 'terms'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all border ${
              activeType === t ? 'bg-warm-accent text-white border-warm-accent shadow-lg' : 'bg-warm-bg text-warm-muted border-warm-border hover:bg-warm-accent/5'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={15}
          className="w-full px-8 py-6 bg-warm-card border border-warm-border rounded-[2rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans resize-none"
          placeholder={`Inserisci qui il testo per ${activeType}...`}
        />
        <button
          onClick={() => onSave(activeType, text)}
          className="w-full py-5 bg-warm-accent text-white rounded-2xl font-bold hover:bg-warm-accent/90 transition-all font-serif italic"
        >
          Salva Modifiche
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
        className="bg-warm-card p-6 md:p-10 rounded-[3rem] shadow-2xl max-w-md w-full border border-warm-border my-auto"
      >
        <h2 className="text-3xl font-bold text-warm-text mb-4 font-serif italic">Cambia Password</h2>
        <p className="text-warm-muted mb-8 font-sans">Al primo accesso è obbligatorio cambiare la password temporanea fornita dall'amministratore.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Nuova Password</label>
            <input 
              required
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Conferma Password</label>
            <input 
              required
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-warm-accent text-white rounded-2xl font-bold hover:bg-warm-accent/90 transition-all font-serif italic disabled:opacity-50"
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
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] w-[90%] max-w-2xl bg-warm-card/90 backdrop-blur-xl border border-warm-border p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center gap-6"
    >
      <div className="flex-1">
        <h4 className="font-bold text-warm-text mb-2 font-serif italic">Cookie & Privacy</h4>
        <p className="text-xs text-warm-muted leading-relaxed font-sans">
          Utilizziamo cookie tecnici per migliorare la tua esperienza. Continuando a navigare accetti la nostra informativa sulla privacy e l'uso dei cookie.
        </p>
      </div>
      <div className="flex gap-4">
        <button onClick={accept} className="px-8 py-3 bg-warm-accent text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-warm-accent/90 transition-all">
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
        className="bg-warm-card p-6 md:p-10 rounded-[3rem] shadow-2xl max-w-md w-full border border-warm-border my-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-warm-text font-serif italic">Modifica Utente</h2>
          <button onClick={onClose} className="p-2 hover:bg-warm-bg rounded-full transition-all"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Nome</label>
            <input required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Cognome</label>
            <input required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Telefono</label>
            <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all" />
          </div>
          {auth.currentUser?.uid !== user.uid && (
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Ruolo</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all">
                <option value="parent">Genitore</option>
                <option value="animator">Animatore</option>
                <option value="admin">Amministratore</option>
              </select>
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full py-5 bg-warm-accent text-white rounded-2xl font-bold hover:bg-warm-accent/90 transition-all font-serif italic disabled:opacity-50">
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
        className="bg-warm-card p-6 md:p-10 rounded-[3rem] shadow-2xl max-w-md w-full border border-warm-border my-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-warm-text font-serif italic">Modifica Bambino</h2>
          <button onClick={onClose} className="p-2 hover:bg-warm-bg rounded-full transition-all"><X className="w-6 h-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Nome Bambino</label>
            <input required value={formData.childName} onChange={e => setFormData({ ...formData, childName: e.target.value })} className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Cognome Bambino</label>
            <input required value={formData.childSurname} onChange={e => setFormData({ ...formData, childSurname: e.target.value })} className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Data di Nascita</label>
            <input required type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Allergie Comuni</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGIES.map(allergy => (
                <button
                  key={allergy}
                  type="button"
                  onClick={() => toggleAllergy(allergy)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border ${
                    formData.allergies.includes(allergy)
                      ? 'bg-warm-accent text-white border-warm-accent'
                      : 'bg-warm-bg text-warm-muted border-warm-border hover:border-warm-accent/30'
                  }`}
                >
                  {allergy}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Altro (Note Mediche / Allergie)</label>
            <textarea value={formData.medicalNotes} onChange={e => setFormData({ ...formData, medicalNotes: e.target.value })} className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all resize-none h-24" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-5 bg-warm-accent text-white rounded-2xl font-bold hover:bg-warm-accent/90 transition-all font-serif italic disabled:opacity-50">
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-1 space-y-8">
        <h3 className="text-3xl font-bold text-warm-text font-serif italic">Il Mio Profilo</h3>
        <div className="bg-warm-card p-8 rounded-[3rem] border border-warm-border shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Nome</label>
              <input required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Cognome</label>
              <input required value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Telefono</label>
              <input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] ml-2">Email</label>
              <input disabled value={user.email || ''} className="w-full px-6 py-4 bg-warm-bg/50 border border-warm-border rounded-2xl text-warm-muted cursor-not-allowed" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-5 bg-warm-accent text-white rounded-2xl font-bold hover:bg-warm-accent/90 transition-all font-serif italic disabled:opacity-50 shadow-lg shadow-warm-accent/20">
              {loading ? 'Aggiornamento...' : 'Salva Profilo'}
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-8">
        <h3 className="text-3xl font-bold text-warm-text font-serif italic">I Miei Bambini</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myChildren.map(child => (
            <div key={child.id} className="bg-warm-card p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-warm-border shadow-sm group hover:shadow-md transition-all duration-500 overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-warm-accent/10 rounded-2xl flex items-center justify-center text-warm-accent">
                  <Heart className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <button onClick={() => onEditRegistration(child)} className="p-3 text-warm-muted hover:text-warm-accent hover:bg-warm-accent/5 rounded-2xl transition-all border border-transparent hover:border-warm-accent/10">
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
              <h4 className="text-xl md:text-2xl font-bold text-warm-text font-serif italic mb-3 truncate">{child.childName} {child.childSurname}</h4>
              <div className="space-y-3">
                <p className="text-xs text-warm-muted font-sans flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-warm-accent/40" />
                  Nato il: <span className="text-warm-text font-medium">{new Date(child.birthDate).toLocaleDateString('it-IT')}</span>
                </p>
                <p className="text-xs text-warm-muted font-sans flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${child.status === 'confirmed' ? 'text-emerald-500' : 'text-amber-500'}`} />
                  Stato: <span className={`font-bold uppercase tracking-widest ${child.status === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'}`}>{child.status}</span>
                </p>
              </div>
              {(child.allergies && child.allergies.length > 0) && (
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {child.allergies.map(a => (
                    <span key={a} className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[9px] font-bold uppercase tracking-widest">
                      {a}
                    </span>
                  ))}
                </div>
              )}
              {child.medicalNotes && (
                <div className="mt-6 p-4 bg-warm-bg/50 rounded-2xl border border-warm-border/50">
                  <p className="text-[10px] font-bold text-warm-muted uppercase tracking-widest mb-1.5">Note Mediche</p>
                  <p className="text-xs text-warm-text/70 font-sans italic leading-relaxed break-words">{child.medicalNotes}</p>
                </div>
              )}
            </div>
          ))}
          {myChildren.length === 0 && (
            <div className="col-span-full py-20 text-center bg-warm-card rounded-[3rem] border-2 border-dashed border-warm-border">
              <p className="text-warm-muted italic font-serif text-lg">Non hai ancora iscritto nessun bambino.</p>
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
  const [activeTab, setActiveTab] = useState<'home' | 'register' | 'admin' | 'legal'>('home');
  const [adminTab, setAdminTab] = useState<'dashboard' | 'registrations' | 'attendance' | 'surveys' | 'schedule' | 'events' | 'users' | 'announcements' | 'legal'>('dashboard');
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
    id: 'dashboard' | 'registrations' | 'attendance' | 'surveys' | 'announcements' | 'schedule' | 'events' | 'users' | 'legal';
    label: string;
    icon: React.ReactNode;
  }

  const adminTabs: AdminTabInfo[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
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

  const linkRegistrationToParent = async (regId: string, parentUid: string) => {
    try {
      await updateDoc(doc(db, 'registrations', regId), { parentUid });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${regId}`);
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
        <header className="sticky top-0 z-50 bg-warm-bg/80 backdrop-blur-xl border-b border-warm-border">
          <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveTab('home')}>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-warm-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-warm-accent/20 group-hover:rotate-12 transition-all duration-500">
                  <Heart className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-warm-text tracking-tight font-serif italic leading-none">Grest <span className="text-warm-accent">Oppeano</span></h1>
                  <p className="text-[8px] md:text-[10px] font-bold text-warm-muted uppercase tracking-[0.3em] mt-1 hidden xs:block">Comunità in Cammino</p>
                </div>
              </div>

              <nav className="hidden md:flex items-center gap-2 bg-warm-card p-1.5 rounded-full border border-warm-border shadow-sm">
                <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home className="w-4 h-4" />} label="Home" />
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
                <div className="flex items-center gap-4 bg-warm-card pl-4 pr-2 py-2 rounded-full border border-warm-border shadow-sm">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-warm-text leading-none">{profile?.firstName || user.displayName}</p>
                    <p className="text-[9px] text-warm-muted uppercase tracking-widest mt-1">{profile?.role}</p>
                  </div>
                  {user.providerData.every(p => p.providerId !== 'google.com') && (
                    <button onClick={linkGoogle} title="Collega account Google" className="p-2.5 hover:bg-warm-bg text-warm-muted hover:text-warm-accent rounded-full transition-all">
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                    </button>
                  )}
                  <button onClick={logout} className="p-2.5 hover:bg-red-50 text-warm-muted hover:text-red-500 rounded-full transition-all group">
                    <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setActiveTab('register')} className="flex items-center gap-3 px-8 py-3.5 bg-warm-accent text-white rounded-full font-bold hover:bg-warm-accent/90 transition-all hover:scale-[1.02] shadow-lg shadow-warm-accent/20 font-serif italic">
                  <UserCircle className="w-5 h-5" />
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
                className="fixed inset-0 z-[100] bg-stone-900/50 p-4 backdrop-blur-sm overflow-y-auto flex justify-center items-start sm:items-center"
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl max-w-md w-full my-auto"
                >
                  <h2 className="text-2xl font-bold mb-2">Completa il tuo profilo</h2>
                  <p className="text-stone-500 mb-6">Inserisci il tuo nome e cognome per continuare.</p>
                  <ProfileForm onComplete={updateProfile} />
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-20">
                <section className="relative min-h-[60vh] py-20 md:py-32 flex items-center justify-center overflow-hidden rounded-[4rem] bg-warm-accent">
                  <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-warm-secondary/30 rounded-full -mr-40 -mt-40 blur-[150px] animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white/10 rounded-full -ml-20 -mb-20 blur-[120px]" />
                  </div>
                  
                  <div className="relative z-10 text-center px-6 max-w-4xl">
                    <motion.span 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-warm-secondary text-[10px] uppercase font-bold tracking-[0.5em] mb-8 block"
                    >
                      Estate 2026 • Oppeano
                    </motion.span>
                    <motion.h2 
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-5xl md:text-9xl font-bold text-white mb-10 tracking-tighter leading-[0.85] font-serif relative inline-block"
                    >
                      <Sparkles className="absolute -top-12 -left-12 w-12 h-12 text-warm-secondary/40 animate-pulse" />
                      Comunità <br/><span className="text-warm-secondary italic">in Cammino</span>
                      <Sparkles className="absolute -bottom-8 -right-8 w-10 h-10 text-white/20 animate-bounce" />
                    </motion.h2>
                    <motion.p 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-white/70 text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed font-light"
                    >
                      Un'esperienza indimenticabile di gioco, amicizia e crescita per tutta la nostra comunità.
                    </motion.p>
                    
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-12 flex flex-wrap justify-center gap-6"
                    >
                      <button onClick={() => setActiveTab('register')} className="px-10 py-5 bg-white text-warm-accent rounded-full font-bold text-lg hover:bg-warm-secondary hover:text-white transition-all hover:scale-105 shadow-2xl font-serif italic">
                        Iscriviti Ora
                      </button>
                      <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-full border border-white/20">
                        <div className="flex -space-x-3">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-warm-accent bg-warm-bg overflow-hidden">
                              <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="user" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ))}
                        </div>
                        <span className="text-white/90 text-sm font-medium">+150 Iscritti</span>
                      </div>
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

            {activeTab === 'register' && (
              <motion.div key="register" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto">
                <div className="bg-white p-6 md:p-12 rounded-[2.5rem] border border-stone-200 shadow-xl shadow-stone-100/50">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                      <UserPlus className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-stone-900">Nuova Iscrizione</h2>
                      <p className="text-stone-500">Compila il modulo per iscrivere tuo figlio al Grest.</p>
                    </div>
                  </div>
                  
                  {!user ? (
                    <div className="max-w-md mx-auto py-12">
                      <div className="bg-warm-bg p-8 rounded-[2.5rem] border border-warm-border shadow-sm">
                        <div className="flex gap-4 mb-8">
                          <button 
                            onClick={() => setAuthMode('login')}
                            className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-warm-accent text-white' : 'text-warm-muted'}`}
                          >
                            Accedi
                          </button>
                          <button 
                            onClick={() => setAuthMode('register')}
                            className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${authMode === 'register' ? 'bg-warm-accent text-white' : 'text-warm-muted'}`}
                          >
                            Registrati
                          </button>
                        </div>

                        <form onSubmit={authMode === 'login' ? loginWithEmail : registerWithEmail} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-widest ml-2">Email</label>
                            <input 
                              type="email"
                              required
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              className="w-full px-6 py-3 bg-warm-card border border-warm-border rounded-xl outline-none focus:ring-2 focus:ring-warm-accent/20"
                              placeholder="email@esempio.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-warm-muted uppercase tracking-widest ml-2">Password</label>
                            <input 
                              type="password"
                              required
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              className="w-full px-6 py-3 bg-warm-card border border-warm-border rounded-xl outline-none focus:ring-2 focus:ring-warm-accent/20"
                              placeholder="••••••••"
                            />
                          </div>
                          <button 
                            disabled={authLoading}
                            className="w-full py-4 bg-warm-accent text-white rounded-xl font-bold hover:bg-warm-accent/90 transition-all shadow-lg shadow-warm-accent/20"
                          >
                            {authLoading ? 'Caricamento...' : (authMode === 'login' ? 'Entra' : 'Crea Account')}
                          </button>
                        </form>

                        <div className="relative my-8">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-warm-border"></div></div>
                          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold"><span className="bg-warm-bg px-4 text-warm-muted">Oppure</span></div>
                        </div>

                        <button onClick={login} className="w-full py-4 bg-white border border-warm-border text-warm-text rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-warm-bg transition-all">
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
                        <h3 className="text-xl md:text-2xl font-bold text-warm-text font-serif italic">Gestione Iscrizioni</h3>
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
                          <div key={reg.id} className="p-4 md:p-8 bg-warm-card border border-warm-border rounded-[1.5rem] md:rounded-[2.5rem] hover:shadow-xl hover:shadow-warm-accent/5 transition-all group overflow-hidden">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-8">
                              <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                                <div className="w-14 h-14 md:w-16 md:h-16 bg-warm-bg rounded-2xl flex items-center justify-center text-warm-accent font-bold text-xl md:text-2xl group-hover:bg-warm-accent group-hover:text-white transition-all duration-500 border border-warm-border shrink-0 mx-auto sm:mx-0">
                                  {reg.childName[0]}{reg.childSurname[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-xl md:text-2xl text-warm-text text-center sm:text-left truncate">{reg.childName} {reg.childSurname}</p>
                                  <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 md:gap-2 mt-3 md:mt-4">
                                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-warm-muted flex items-center gap-1.5 md:gap-2 bg-warm-bg px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl border border-warm-border">
                                      <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-warm-accent/40" /> {new Date(reg.birthDate).toLocaleDateString('it-IT')}
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
                                    <div className="mt-3 md:mt-4 p-2.5 md:p-3 bg-warm-bg/50 rounded-xl border border-warm-border/50">
                                      <p className="text-[9px] md:text-[10px] text-warm-muted italic font-sans break-words">
                                        <Info className="w-3 md:w-3.5 h-3 md:h-3.5 inline mr-1 md:mr-1.5 opacity-50" /> {reg.medicalNotes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 md:gap-3 pt-4 md:pt-6 lg:pt-0 border-t lg:border-t-0 border-warm-border/50">
                                <button onClick={() => setEditingRegistration(reg)} className="p-3 md:p-4 bg-warm-bg text-warm-muted rounded-2xl hover:bg-warm-accent hover:text-white transition-all shadow-sm border border-warm-border" title="Modifica">
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
                          <div className="py-20 md:py-32 text-center bg-warm-bg rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-warm-border">
                            <Users className="w-12 h-12 md:w-16 md:h-16 text-warm-muted/30 mx-auto mb-4" />
                            <p className="text-warm-muted italic font-serif">Nessuna iscrizione registrata.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {adminTab === 'attendance' && (
                    <div className="p-4 md:p-12 space-y-8 md:space-y-12">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-xl md:text-2xl font-bold text-warm-text font-serif italic">Presenze di Oggi</h3>
                        <div className="flex items-center gap-2 px-4 py-2 bg-warm-bg border border-warm-border rounded-2xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-warm-muted">
                          <Calendar className="w-4 h-4 text-warm-accent/40" />
                          {new Date().toLocaleDateString('it-IT')}
                        </div>
                      </div>
                      <div className="grid gap-3 md:gap-4">
                        {allRegistrations.filter(r => r.status === 'confirmed').map(reg => {
                          const isPresent = attendance.find(a => a.registrationId === reg.id)?.present;
                          return (
                            <div key={reg.id} className="p-4 md:p-5 bg-warm-card border border-warm-border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 hover:shadow-lg hover:shadow-warm-accent/5 transition-all group">
                              <p className="font-bold text-warm-text text-base md:text-lg font-serif italic">{reg.childName} {reg.childSurname}</p>
                              <button 
                                onClick={() => toggleAttendance(reg.id)} 
                                className={`w-full sm:w-auto px-8 py-3 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg ${isPresent ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-warm-bg text-warm-muted border border-warm-border hover:bg-warm-accent/5'}`}
                              >
                                {isPresent ? 'Presente' : 'Assente'}
                              </button>
                            </div>
                          );
                        })}
                        {allRegistrations.filter(r => r.status === 'confirmed').length === 0 && (
                          <div className="py-20 text-center bg-warm-bg rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-warm-border">
                            <p className="text-warm-muted italic font-serif">Nessun partecipante confermato.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {adminTab === 'surveys' && (
                    <div className="p-4 md:p-12 space-y-8 md:space-y-12">
                      <div className="space-y-6 md:space-y-10">
                        <h3 className="text-xl md:text-2xl font-bold text-warm-text font-serif italic">Risultati Sondaggi</h3>
                        <div className="grid gap-6 md:gap-8">
                          {surveys.map(survey => {
                            const responses = allSurveyResponses.filter(r => r.surveyId === survey.id);
                            const participants = responses.filter(r => r.participating);
                            return (
                              <div key={survey.id} className="bg-warm-card p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-warm-border shadow-sm group">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                      <h4 className="font-bold text-xl md:text-2xl text-warm-text truncate">{survey.title}</h4>
                                      <button 
                                        onClick={() => updateEntity('surveys', survey.id, { active: !survey.active })}
                                        className={`text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full transition-all ${survey.active ? 'bg-emerald-100 text-emerald-700' : 'bg-warm-bg text-warm-muted border border-warm-border'}`}
                                      >
                                        {survey.active ? 'Attivo' : 'Archiviato'}
                                      </button>
                                    </div>
                                    <p className="text-warm-text/70 leading-relaxed font-sans text-sm md:text-base">{survey.description}</p>
                                    {survey.minParticipants && (
                                      <div className="mt-6 flex items-center gap-4">
                                        <div className="w-32 md:w-48 h-2.5 bg-warm-bg rounded-full overflow-hidden border border-warm-border">
                                          <div 
                                            className={`h-full transition-all duration-700 ${participants.length >= survey.minParticipants ? 'bg-emerald-500' : 'bg-warm-accent'}`}
                                            style={{ width: `${Math.min(100, (participants.length / survey.minParticipants) * 100)}%` }}
                                          />
                                        </div>
                                        <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest ${participants.length >= survey.minParticipants ? 'text-emerald-600' : 'text-warm-accent'}`}>
                                          {participants.length}/{survey.minParticipants}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-row md:flex-col items-center md:items-end gap-4 w-full md:w-auto justify-between md:justify-start border-t md:border-t-0 pt-4 md:pt-0 border-warm-border/50">
                                    <div className="md:text-right">
                                      <p className="text-3xl md:text-5xl font-bold text-warm-text font-serif italic">{participants.length}</p>
                                      <p className="text-[9px] md:text-[10px] uppercase font-bold text-warm-muted tracking-[0.2em]">Adesioni</p>
                                    </div>
                                    <DeleteButton onDelete={() => deleteEntity('surveys', survey.id)} />
                                  </div>
                                </div>
                                <div className="space-y-4 pt-6 md:pt-8 border-t border-warm-border">
                                  <p className="text-[9px] md:text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em]">Dettaglio Partecipanti</p>
                                  {participants.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {participants.map(p => {
                                        const reg = allRegistrations.find(r => r.id === p.registrationId);
                                        return (
                                          <div key={p.id} className="flex flex-col sm:flex-row items-center justify-between p-3 md:p-4 bg-warm-bg rounded-2xl border border-warm-border group/item hover:border-warm-accent/30 transition-all gap-3">
                                            <span className="text-xs font-bold text-warm-text truncate max-w-full">
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
                                    <p className="text-sm text-warm-muted italic font-serif py-2">Nessuna partecipazione registrata.</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="pt-8 md:pt-12 border-t border-warm-border">
                        <h3 className="text-xl md:text-2xl font-bold mb-6 md:mb-8 text-warm-text font-serif italic">Crea Nuovo Sondaggio</h3>
                        <div className="bg-warm-bg p-5 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border border-warm-border">
                          <SurveyForm />
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'schedule' && (
                    <div className="p-4 md:p-12 space-y-8 md:space-y-12">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="text-xl md:text-2xl font-bold text-warm-text font-serif italic">Gestione Orari</h3>
                        <div className="px-4 py-2 bg-warm-bg border border-warm-border rounded-2xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-warm-muted">
                          {schedule.length} Attività
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                        <div className="space-y-4 md:space-y-6">
                          <p className="text-[9px] md:text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] mb-4">Programma Attuale</p>
                          <div className="grid gap-3 md:gap-4">
                            {schedule.map(item => (
                              <div key={item.id} className="p-4 md:p-6 bg-warm-card border border-warm-border rounded-[1.5rem] md:rounded-[2.5rem] hover:shadow-xl hover:shadow-warm-accent/5 transition-all group flex flex-col sm:flex-row items-center justify-between gap-4 md:gap-6">
                                <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 text-center sm:text-left w-full">
                                  <div className="w-20 h-14 md:w-24 md:h-16 bg-warm-bg rounded-2xl flex items-center justify-center text-warm-accent font-bold text-lg md:text-xl border border-warm-border group-hover:bg-warm-accent group-hover:text-white transition-all duration-500 shrink-0">
                                    {item.time}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-warm-text text-base md:text-xl font-serif italic truncate">{item.activity}</p>
                                    <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-2">
                                      <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-warm-muted bg-warm-bg px-2 py-1 rounded-xl border border-warm-border">{item.day}</span>
                                      {item.description && <p className="text-[10px] md:text-xs text-warm-muted italic font-serif truncate max-w-[150px] md:max-w-[200px]">— {item.description}</p>}
                                    </div>
                                  </div>
                                </div>
                                <DeleteButton onDelete={() => deleteEntity('schedule', item.id)} className="p-2 sm:p-4" />
                              </div>
                            ))}
                            {schedule.length === 0 && (
                              <div className="py-20 text-center bg-warm-bg rounded-[2rem] border-2 border-dashed border-warm-border">
                                <p className="text-warm-muted italic font-serif">Nessuna attività in programma.</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-4 md:space-y-6">
                          <p className="text-[9px] md:text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em] mb-4">Aggiungi Attività</p>
                          <div className="bg-warm-bg p-5 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border border-warm-border">
                            <ScheduleForm />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'events' && (
                    <div className="p-4 md:p-12 space-y-8 md:space-y-12">
                      <div className="space-y-6 md:space-y-10">
                        <h3 className="text-xl md:text-2xl font-bold text-warm-text font-serif italic">Eventi in Programma</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                          <div className="grid gap-4 md:gap-6">
                            {events.map(event => (
                              <div key={event.id} className="p-4 md:p-6 bg-warm-card border border-warm-border rounded-[1.5rem] md:rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-warm-accent/5 transition-all group flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-4 mb-2">
                                    <h4 className="font-bold text-lg md:text-xl text-warm-text truncate">{event.title}</h4>
                                    <span className="px-2.5 py-1 bg-warm-bg border border-warm-border text-warm-muted rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 md:gap-2 w-fit">
                                      <Calendar className="w-3 md:w-3.5 h-3 md:h-3.5 text-warm-accent/40" />
                                      {new Date(event.date).toLocaleDateString('it-IT')}
                                    </span>
                                  </div>
                                  <p className="text-warm-text/60 text-xs md:text-sm leading-relaxed font-sans line-clamp-2">{event.description}</p>
                                  {event.location && (
                                    <div className="flex items-center gap-1.5 md:gap-2 mt-3 md:mt-4 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-warm-muted">
                                      <MapPin className="w-3.5 md:w-4 h-3.5 md:h-4 text-warm-accent/40" />
                                      {event.location}
                                    </div>
                                  )}
                                </div>
                                <DeleteButton onDelete={() => deleteEntity('events', event.id)} className="p-2" />
                              </div>
                            ))}
                            {events.length === 0 && (
                              <div className="py-20 text-center bg-warm-bg rounded-[2rem] border-2 border-dashed border-warm-border">
                                <p className="text-warm-muted italic font-serif">Nessun evento in programma.</p>
                              </div>
                            )}
                          </div>
                          <div className="bg-warm-bg p-5 md:p-10 rounded-[1.5rem] md:rounded-[2rem] border border-warm-border">
                            <EventForm />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'users' && (
                    <div className="p-4 md:p-12 space-y-8 md:space-y-12">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6">
                        <h3 className="text-xl md:text-2xl font-bold text-warm-text font-serif italic">Gestione Utenti</h3>
                        <div className="relative flex-1 max-w-md">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-warm-accent/40" />
                          <input 
                            type="text" 
                            placeholder="Cerca utenti..." 
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full pl-10 md:pl-12 pr-4 md:pr-6 py-2.5 md:py-3.5 bg-warm-bg border border-warm-border rounded-2xl md:rounded-[1.5rem] text-sm outline-none focus:ring-4 focus:ring-warm-accent/5 focus:border-warm-accent transition-all font-sans"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
                        <div className="lg:col-span-2 space-y-6 md:space-y-8">
                          <p className="text-[9px] md:text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em]">Lista Utenti</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {allUsers.filter(u => 
                              (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) || 
                              (u.firstName + ' ' + u.lastName).toLowerCase().includes(userSearch.toLowerCase()) ||
                              (u.displayName || '').toLowerCase().includes(userSearch.toLowerCase())
                            ).map(u => (
                              <div key={u.uid} className="p-4 md:p-8 bg-warm-card border border-warm-border rounded-[1.5rem] md:rounded-[2.5rem] hover:shadow-xl hover:shadow-warm-accent/5 transition-all group overflow-hidden">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 md:gap-6 mb-6 md:mb-8">
                                  <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 text-center sm:text-left">
                                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border transition-all duration-500 shrink-0 ${
                                      u.isManual ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-warm-bg text-warm-accent border-warm-border group-hover:bg-warm-accent group-hover:text-white'
                                    }`}>
                                      <UserCircle className="w-10 h-10" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-xl text-warm-text truncate">{u.firstName ? `${u.firstName} ${u.lastName}` : u.displayName || 'Utente senza nome'}</p>
                                      <p className="text-xs text-warm-muted font-sans break-all">{u.email || (u.phone ? `Tel: ${u.phone}` : 'Nessun contatto')}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button onClick={() => setEditingUser(u)} className="p-4 text-stone-300 hover:text-warm-accent hover:bg-warm-accent/5 rounded-2xl transition-all group border border-transparent hover:border-warm-accent/10">
                                      <Edit2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                    </button>
                                    <DeleteButton onDelete={() => deleteEntity('users', u.uid)} className="p-4" />
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-warm-border/50">
                                  <div className="sm:mr-auto text-center sm:text-left">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-warm-muted mb-1">Ruolo Attuale</p>
                                    <div className="flex items-center justify-center sm:justify-start gap-2">
                                      <span className="px-3 py-1 bg-warm-accent/10 text-warm-accent rounded-lg text-[10px] font-bold uppercase tracking-widest border border-warm-accent/20">{u.role}</span>
                                      {u.isManual && <span className="text-[8px] font-bold text-amber-600 uppercase tracking-tighter bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Manuale</span>}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap justify-center gap-2">
                                    {(['parent', 'animator', 'admin'] as UserRole[]).map(r => (
                                      <button 
                                        key={r}
                                        onClick={() => updateEntity('users', u.uid, { role: r })}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border ${
                                          u.role === r ? 'bg-warm-accent text-white border-warm-accent shadow-md shadow-warm-accent/20' : 'bg-warm-bg text-warm-muted border-warm-border hover:bg-warm-accent/5'
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
                          <p className="text-[10px] font-bold text-warm-muted uppercase tracking-[0.2em]">Crea Utente Manuale</p>
                          <div className="bg-warm-bg p-8 rounded-[3rem] border border-warm-border">
                            <ManualUserForm onComplete={() => {}} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'legal' && (
                    <div className="p-6 md:p-12 space-y-12">
                      <div className="space-y-10">
                        <h3 className="text-2xl font-bold text-warm-text font-serif italic">Gestione Pagine Legali</h3>
                        <div className="bg-warm-bg p-6 md:p-10 rounded-[3rem] border border-warm-border">
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
      className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-2xl md:rounded-full transition-all duration-500 relative group flex-1 md:flex-none ${
        active ? 'bg-warm-accent text-white shadow-lg' : 'text-warm-muted hover:text-warm-accent hover:bg-warm-accent/5'
      }`}
    >
      <span className="transition-transform group-hover:scale-110">{icon}</span>
      <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">{label}</span>
    </button>
  );
}

function AdminTab({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, key?: React.Key }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-500 border font-sans text-xs font-bold uppercase tracking-widest whitespace-nowrap w-full justify-center ${
        active 
          ? 'bg-warm-accent text-white border-warm-accent shadow-lg shadow-warm-accent/20 scale-[1.02]' 
          : 'bg-warm-card border-warm-border text-warm-muted hover:border-warm-accent/30 hover:bg-warm-bg'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-warm-accent'}`}>{icon}</span>
      <span>{label}</span>
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
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Nome</label>
          <input 
            required 
            type="text" 
            value={firstName} 
            onChange={e => setFirstName(e.target.value)} 
            className="w-full px-6 py-5 bg-warm-bg border border-warm-border rounded-[1.5rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text placeholder:text-warm-muted/50 font-sans" 
            placeholder="Il tuo nome" 
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Cognome</label>
          <input 
            required 
            type="text" 
            value={lastName} 
            onChange={e => setLastName(e.target.value)} 
            className="w-full px-6 py-5 bg-warm-bg border border-warm-border rounded-[1.5rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text placeholder:text-warm-muted/50 font-sans" 
            placeholder="Il tuo cognome" 
          />
        </div>
      </div>
      <button 
        onClick={() => firstName && lastName && onComplete(firstName, lastName)} 
        className="w-full py-6 bg-warm-accent text-white rounded-[2rem] font-bold text-lg hover:bg-warm-accent/90 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-warm-accent/20 flex items-center justify-center gap-3 font-serif italic"
      >
        <CheckCircle className="w-6 h-6" />
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
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-10">
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-red-50 border border-red-100 text-red-600 rounded-[1.5rem] text-sm font-medium flex items-center gap-3">
          <XCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Nome</label>
          <input 
            required 
            type="text" 
            value={formData.childName} 
            onChange={e => setFormData({...formData, childName: e.target.value})} 
            className="w-full px-6 py-5 bg-warm-bg border border-warm-border rounded-[1.5rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text placeholder:text-warm-muted/50 font-sans" 
            placeholder="Nome del bambino" 
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Cognome</label>
          <input 
            required 
            type="text" 
            value={formData.childSurname} 
            onChange={e => setFormData({...formData, childSurname: e.target.value})} 
            className="w-full px-6 py-5 bg-warm-bg border border-warm-border rounded-[1.5rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text placeholder:text-warm-muted/50 font-sans" 
            placeholder="Cognome del bambino" 
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Data di Nascita</label>
        <div className="relative">
          <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-accent/40 pointer-events-none" />
          <input 
            required 
            type="date" 
            value={formData.birthDate} 
            onChange={e => setFormData({...formData, birthDate: e.target.value})} 
            className="w-full pl-16 pr-6 py-5 bg-warm-bg border border-warm-border rounded-[1.5rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans" 
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Allergie Comuni</label>
        <div className="flex flex-wrap gap-3">
          {COMMON_ALLERGIES.map(allergy => (
            <button
              key={allergy}
              type="button"
              onClick={() => toggleAllergy(allergy)}
              className={`px-4 py-2.5 rounded-[1rem] text-xs font-bold transition-all border ${
                formData.allergies.includes(allergy)
                  ? 'bg-warm-accent text-white border-warm-accent shadow-lg shadow-warm-accent/20'
                  : 'bg-warm-bg text-warm-muted border-warm-border hover:border-warm-accent/30'
              }`}
            >
              {allergy}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Altro (Note Mediche / Allergie)</label>
        <textarea 
          value={formData.medicalNotes} 
          onChange={e => setFormData({...formData, medicalNotes: e.target.value})} 
          className="w-full px-6 py-5 bg-warm-bg border border-warm-border rounded-[1.5rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all min-h-[150px] text-warm-text placeholder:text-warm-muted/50 font-sans resize-none" 
          placeholder="Opzionale: altre allergie, intolleranze o note importanti per gli animatori" 
        />
      </div>

      <div className="space-y-6 pt-4">
        <button 
          type="submit" 
          disabled={submitting}
          className="w-full py-6 bg-warm-accent text-white rounded-[2rem] font-bold text-lg hover:bg-warm-accent/90 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-warm-accent/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-serif italic"
        >
          {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
          {submitting ? 'Invio in corso...' : 'Invia Iscrizione'}
        </button>
        <p className="text-center text-[10px] text-warm-muted uppercase tracking-[0.2em] font-bold">
          L'iscrizione verrà verificata dagli amministratori
        </p>
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
        className={`px-6 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all border ${registration.parentUid ? 'bg-warm-bg text-warm-muted border-warm-border hover:bg-warm-card' : 'bg-warm-accent text-white border-warm-accent shadow-lg shadow-warm-accent/20 hover:scale-[1.02]'}`}
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
              className="absolute right-0 mt-4 w-80 bg-warm-card rounded-[2.5rem] shadow-2xl border border-warm-border z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-warm-border bg-warm-bg/50">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-muted/40" />
                  <input 
                    type="text" 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    className="w-full pl-10 pr-4 py-3 bg-warm-card border border-warm-border rounded-xl text-xs outline-none focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent transition-all text-warm-text placeholder:text-warm-muted/50" 
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
                    <p className="text-[10px] text-warm-muted uppercase tracking-widest font-bold">Nessun utente trovato</p>
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Titolo</label>
        <input 
          required 
          type="text" 
          value={formData.title} 
          onChange={e => setFormData({...formData, title: e.target.value})} 
          className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans" 
          placeholder="Es: Festa di Inizio Grest" 
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Descrizione</label>
        <textarea 
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})} 
          className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all min-h-[120px] text-warm-text font-sans resize-none" 
          placeholder="Dettagli dell'evento..." 
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Data</label>
          <input 
            required 
            type="date" 
            value={formData.date} 
            onChange={e => setFormData({...formData, date: e.target.value})} 
            className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans" 
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Luogo</label>
          <input 
            type="text" 
            value={formData.location} 
            onChange={e => setFormData({...formData, location: e.target.value})} 
            className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans" 
            placeholder="Es: Campo Sportivo" 
          />
        </div>
      </div>
      <button 
        type="submit" 
        disabled={submitting}
        className="w-full py-5 bg-warm-accent text-white rounded-2xl font-bold hover:bg-warm-accent/90 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-warm-accent/20 flex items-center justify-center gap-2 font-serif italic"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Titolo Sondaggio</label>
        <input 
          required 
          type="text" 
          value={formData.title} 
          onChange={e => setFormData({...formData, title: e.target.value})} 
          className="w-full px-6 py-5 bg-warm-bg border border-warm-border rounded-[1.5rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text placeholder:text-warm-muted/50 font-sans" 
          placeholder="Es: Gita a Gardaland" 
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Dettagli Gita</label>
        <textarea 
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})} 
          className="w-full px-6 py-5 bg-warm-bg border border-warm-border rounded-[1.5rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all min-h-[120px] text-warm-text placeholder:text-warm-muted/50 font-sans resize-none" 
          placeholder="Descrivi l'attività, cosa portare, ecc..." 
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Costo (€)</label>
          <input 
            type="number" 
            value={formData.cost} 
            onChange={e => setFormData({...formData, cost: e.target.value})} 
            className="w-full px-6 py-5 bg-warm-bg border border-warm-border rounded-[1.5rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans" 
            placeholder="Es: 25" 
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Min. Partecipanti</label>
          <input 
            type="number" 
            value={formData.minParticipants} 
            onChange={e => setFormData({...formData, minParticipants: e.target.value})} 
            className="w-full px-6 py-5 bg-warm-bg border border-warm-border rounded-[1.5rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans" 
            placeholder="Es: 30" 
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Orario Partenza</label>
          <input 
            type="time" 
            value={formData.departureTime} 
            onChange={e => setFormData({...formData, departureTime: e.target.value})} 
            className="w-full px-6 py-5 bg-warm-bg border border-warm-border rounded-[1.5rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans" 
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Orario Ritorno</label>
          <input 
            type="time" 
            value={formData.returnTime} 
            onChange={e => setFormData({...formData, returnTime: e.target.value})} 
            className="w-full px-6 py-5 bg-warm-bg border border-warm-border rounded-[1.5rem] focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans" 
          />
        </div>
      </div>
      <button 
        disabled={submitting} 
        type="submit" 
        className="w-full py-6 bg-warm-accent text-white rounded-[2rem] font-bold text-lg hover:bg-warm-accent/90 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 shadow-xl shadow-warm-accent/20 flex items-center justify-center gap-3 font-serif italic"
      >
        {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Vote className="w-6 h-6" />}
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Orario</label>
          <input 
            required 
            type="time" 
            value={formData.time} 
            onChange={e => setFormData({...formData, time: e.target.value})} 
            className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans" 
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Giorno</label>
          <select 
            value={formData.day} 
            onChange={e => setFormData({...formData, day: e.target.value})} 
            className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans appearance-none"
          >
            {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Attività</label>
        <input 
          required 
          type="text" 
          value={formData.activity} 
          onChange={e => setFormData({...formData, activity: e.target.value})} 
          className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all text-warm-text font-sans" 
          placeholder="Es: Accoglienza e Preghiera" 
        />
      </div>
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase text-warm-muted tracking-[0.2em] ml-2">Descrizione</label>
        <textarea 
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})} 
          className="w-full px-6 py-4 bg-warm-bg border border-warm-border rounded-2xl focus:ring-4 focus:ring-warm-accent/10 focus:border-warm-accent outline-none transition-all min-h-[100px] text-warm-text font-sans resize-none" 
          placeholder="Dettagli opzionali..." 
        />
      </div>
      <button 
        type="submit" 
        disabled={submitting}
        className="w-full py-5 bg-warm-accent text-white rounded-2xl font-bold hover:bg-warm-accent/90 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-warm-accent/20 flex items-center justify-center gap-2 font-serif italic"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Timer className="w-5 h-5" />}
        {submitting ? 'Aggiunta...' : 'Aggiungi Orario'}
      </button>
    </form>
  );
}
