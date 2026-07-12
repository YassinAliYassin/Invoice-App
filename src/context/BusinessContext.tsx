import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Client,
  InventoryItem,
  Invoice,
  Quotation,
  Payment,
  BusinessSettings,
  CurrencyCode,
  CURRENCY_RATES,
} from '../types';
import {
  auth,
  db,
  isCloudSyncEnabled,
  handleFirestoreError,
  OperationType,
  FirebaseUser,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from '../firebase';
import {
  getLocalSession,
  localSignUp,
  localSignIn,
  localSignOut,
  AuthSessionUser,
} from '../utils/localAuth';

export type AppUser = FirebaseUser | AuthSessionUser | null;

function isLocalUser(user: AppUser): boolean {
  return !!user && typeof user.uid === 'string' && user.uid.startsWith('local_');
}

function isCloudAuthDisabledError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  const code = (e.code || '').toLowerCase();
  const msg = (e.message || '').toLowerCase();
  return (
    code.includes('operation-not-allowed') ||
    code.includes('configuration-not-found') ||
    code.includes('auth/configuration-not-found') ||
    msg.includes('configuration_not_found') ||
    msg.includes('operation_not_allowed') ||
    msg.includes('password_login_disabled') ||
    msg.includes('identity toolkit') ||
    msg.includes('auth/admin-restricted-operation')
  );
}

interface BusinessContextType {
  user: AppUser;
  loading: boolean;
  authLoading: boolean;
  isSyncing: boolean;
  clients: Client[];
  inventory: InventoryItem[];
  invoices: Invoice[];
  quotations: Quotation[];
  payments: Payment[];
  settings: BusinessSettings;
  errorLog: string | null;
  clearError: () => void;

  // Authentication
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<string>;
  logoutUser: () => Promise<void>;
  /** @deprecated use loginWithGoogle */
  login: () => Promise<void>;
  /** @deprecated use loginWithGoogle */
  logInWithGoogle: () => Promise<void>;
  /** @deprecated use logoutUser */
  logOutProcess: () => Promise<void>;
  connectionMode: 'firestore' | 'local';
  cloudAuthAvailable: boolean;
  usingLocalAuth: boolean;

  // Client actions
  saveClient: (client: Omit<Client, 'userId' | 'createdAt'>) => Promise<void>;
  removeClient: (id: string) => Promise<void>;

  // Inventory actions
  saveInventoryItem: (
    item: Omit<InventoryItem, 'userId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  removeInventoryItem: (id: string) => Promise<void>;
  adjustStock: (id: string, newQty: number) => Promise<void>;

  // Invoice actions
  saveInvoice: (
    invoice: Omit<Invoice, 'userId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  removeInvoice: (id: string) => Promise<void>;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<void>;

  // Quotation actions
  saveQuotation: (
    quotation: Omit<Quotation, 'userId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  removeQuotation: (id: string) => Promise<void>;
  updateQuotationStatus: (
    id: string,
    status: Quotation['status']
  ) => Promise<void>;
  convertQuoteToInvoice: (quoteId: string) => Promise<void>;

  // Payment actions
  recordPayment: (payment: Omit<Payment, 'userId' | 'createdAt'>) => Promise<void>;
  removePayment: (id: string) => Promise<void>;

  // Settings action
  saveSettings: (
    settings: Omit<BusinessSettings, 'userId'> & { userId?: string }
  ) => Promise<void>;

  // General Currency converter
  convertCurrency: (amount: number, from: CurrencyCode, to: CurrencyCode) => number;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

const defaultSettings = (uid: string): BusinessSettings => ({
  userId: uid,
  businessName: 'My Business',
  businessEmail: '',
  businessPhone: '',
  businessAddress: '',
  taxId: '',
  defaultCurrency: 'USD',
  logoUrl: '',
  brandColor: '#2563eb',
});

function mapFirebaseAuthError(code: string, fallback: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use':
      'An account with this email already exists. Please log in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed':
      'Email/password sign-in is not enabled for this project. Enable it in Firebase Console → Authentication → Sign-in method.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
    'auth/too-many-requests':
      'Too many failed attempts. Please wait a moment and try again.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
    'auth/popup-blocked': 'Sign-in popup was blocked by the browser. Allow popups and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/missing-email': 'Please enter your email address.',
  };
  return map[code] || fallback;
}

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  /** When Firebase Auth is not set up, we force local accounts */
  const [forceLocalAuth, setForceLocalAuth] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings(''));

  const clearError = () => setErrorLog(null);

  const convertCurrency = (
    amount: number,
    from: CurrencyCode,
    to: CurrencyCode
  ): number => {
    if (from === to) return amount;
    const rateFrom = CURRENCY_RATES[from] || 1;
    const rateTo = CURRENCY_RATES[to] || 1;
    return (amount / rateFrom) * rateTo;
  };

  const getLocalStorageItem = (key: string, defaultValue: unknown) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const setLocalStorageItem = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Local storage saving error:', e);
    }
  };

  // --- Auth state ---
  useEffect(() => {
    let cancelled = false;
    // Never block the UI forever if Firebase Auth hangs (missing project config / network)
    const safety = window.setTimeout(() => {
      if (!cancelled) {
        setLoading((prev) => {
          // only clear loading if still waiting on auth with no user
          return prev ? false : prev;
        });
      }
    }, 4000);

    // Restore local session first (works even when Firebase Auth is broken)
    const localSession = getLocalSession();

    if (isCloudSyncEnabled && auth && !localSession) {
      try {
        const unsubscribe = onAuthStateChanged(
          auth,
          (firebaseUser) => {
            if (cancelled) return;
            window.clearTimeout(safety);
            if (firebaseUser) {
              setForceLocalAuth(false);
              setUser(firebaseUser);
            } else {
              setUser(null);
              setLoading(false);
              setClients([]);
              setInventory([]);
              setInvoices([]);
              setQuotations([]);
              setPayments([]);
            }
          },
          (err) => {
            console.error('Auth state error:', err);
            if (!cancelled) {
              window.clearTimeout(safety);
              setForceLocalAuth(true);
              setUser(null);
              setLoading(false);
            }
          }
        );
        return () => {
          cancelled = true;
          window.clearTimeout(safety);
          unsubscribe();
        };
      } catch (err) {
        console.error('Auth subscribe failed:', err);
        window.clearTimeout(safety);
        setForceLocalAuth(true);
        setLoading(false);
      }
      return () => {
        cancelled = true;
        window.clearTimeout(safety);
      };
    }

    // Local mode (or restored local session while cloud Auth is unavailable)
    if (localSession) {
      setForceLocalAuth(true);
      setUser(localSession);
    } else {
      setUser(null);
      setLoading(false);
    }
    window.clearTimeout(safety);
    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, []);

  // --- Data sync / local load ---
  useEffect(() => {
    if (!user) {
      setClients([]);
      setInventory([]);
      setInvoices([]);
      setQuotations([]);
      setPayments([]);
      setLoading(false);
      return;
    }

    const uid = user.uid;
    const useCloud = isCloudSyncEnabled && !!db && !isLocalUser(user) && !forceLocalAuth;

    if (useCloud && db) {
      setIsSyncing(true);

      const settingsDocRef = doc(db, 'settings', uid);
      const unsubSettings = onSnapshot(
        settingsDocRef,
        (snap) => {
          if (snap.exists()) {
            setSettings(snap.data() as BusinessSettings);
          } else {
            const initialSettings = defaultSettings(uid);
            if (user.email) {
              initialSettings.businessEmail = user.email;
            }
            if (user.displayName) {
              initialSettings.businessName = user.displayName;
            }
            setDoc(settingsDocRef, initialSettings).catch((err) => {
              console.error('Initializing settings failed:', err);
            });
            setSettings(initialSettings);
          }
        },
        (error) => {
          setErrorLog('Permission error syncing settings: ' + error.message);
        }
      );

      const unsubClients = onSnapshot(
        collection(db, 'clients'),
        (snap) => {
          setClients(
            snap.docs.map((d) => d.data() as Client).filter((c) => c.userId === uid)
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'clients')
      );

      const unsubInventory = onSnapshot(
        collection(db, 'inventory'),
        (snap) => {
          setInventory(
            snap.docs
              .map((d) => d.data() as InventoryItem)
              .filter((i) => i.userId === uid)
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'inventory')
      );

      const unsubInvoices = onSnapshot(
        collection(db, 'invoices'),
        (snap) => {
          setInvoices(
            snap.docs
              .map((d) => d.data() as Invoice)
              .filter((i) => i.userId === uid)
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'invoices')
      );

      const unsubQuotations = onSnapshot(
        collection(db, 'quotations'),
        (snap) => {
          setQuotations(
            snap.docs
              .map((d) => d.data() as Quotation)
              .filter((q) => q.userId === uid)
          );
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'quotations')
      );

      const unsubPayments = onSnapshot(
        collection(db, 'payments'),
        (snap) => {
          setPayments(
            snap.docs
              .map((d) => d.data() as Payment)
              .filter((p) => p.userId === uid)
          );
          setIsSyncing(false);
          setLoading(false);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'payments')
      );

      return () => {
        unsubSettings();
        unsubClients();
        unsubInventory();
        unsubInvoices();
        unsubQuotations();
        unsubPayments();
      };
    }

    // Local mode per-user data
    const localClients = getLocalStorageItem(`clients_${uid}`, []);
    // Empty catalog by default — users add real products (sample pack available in Inventory UI)
    const localInventory = getLocalStorageItem(`inventory_${uid}`, []);
    const localInvoices = getLocalStorageItem(`invoices_${uid}`, []);
    const localQuotations = getLocalStorageItem(`quotations_${uid}`, []);
    const localPayments = getLocalStorageItem(`payments_${uid}`, []);
    const localSettings = getLocalStorageItem(
      `settings_${uid}`,
      (() => {
        const s = defaultSettings(uid);
        if (user.email) s.businessEmail = user.email;
        if (user.displayName) s.businessName = user.displayName;
        return s;
      })()
    );

    // Auto-flag overdue invoices (sent past due date)
    const today = new Date().toISOString().split('T')[0];
    const flaggedInvoices = (localInvoices as Invoice[]).map((inv) => {
      if (inv.status === 'sent' && inv.dueDate < today) {
        return { ...inv, status: 'overdue' as const, updatedAt: new Date().toISOString() };
      }
      return inv;
    });
    const overdueChanged = flaggedInvoices.some(
      (inv, idx) => inv.status !== (localInvoices as Invoice[])[idx]?.status
    );
    if (overdueChanged) {
      setLocalStorageItem(`invoices_${uid}`, flaggedInvoices);
    }

    setClients(localClients as Client[]);
    setInventory(localInventory as InventoryItem[]);
    setInvoices(flaggedInvoices);
    setQuotations(localQuotations as Quotation[]);
    setPayments(localPayments as Payment[]);
    setSettings(localSettings as BusinessSettings);
    setLoading(false);
  }, [user]);

  // Persist overdue status for cloud invoices (sent past due)
  useEffect(() => {
    if (!user || !isCloudSyncEnabled || !db || loading) return;
    const today = new Date().toISOString().split('T')[0];
    const needsOverdue = invoices.filter(
      (inv) => inv.status === 'sent' && inv.dueDate < today
    );
    if (needsOverdue.length === 0) return;
    needsOverdue.forEach((inv) => {
      updateDoc(doc(db, 'invoices', inv.id), {
        status: 'overdue',
        updatedAt: new Date().toISOString(),
      }).catch(() => {
        /* non-fatal */
      });
    });
  }, [user, loading, invoices, isCloudSyncEnabled]);

  // --- Auth functions ---
  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    setAuthLoading(true);
    setErrorLog(null);
    try {
      if (isCloudSyncEnabled && auth && !forceLocalAuth) {
        try {
          const cred = await createUserWithEmailAndPassword(
            auth,
            email.trim(),
            password
          );
          if (displayName.trim()) {
            await updateProfile(cred.user, { displayName: displayName.trim() });
          }
          return;
        } catch (cloudErr) {
          if (!isCloudAuthDisabledError(cloudErr)) throw cloudErr;
          // Firebase Auth not initialized / email provider off → local fallback
          console.warn('Cloud signup unavailable, using local accounts:', cloudErr);
          setForceLocalAuth(true);
        }
      }
      const session = await localSignUp(email, password, displayName);
      setUser(session);
      setLoading(false);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      const msg = e.code
        ? mapFirebaseAuthError(e.code, e.message || 'Sign up failed')
        : e.message || 'Sign up failed';
      setErrorLog(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setAuthLoading(true);
    setErrorLog(null);
    try {
      if (isCloudSyncEnabled && auth && !forceLocalAuth) {
        try {
          await signInWithEmailAndPassword(auth, email.trim(), password);
          return;
        } catch (cloudErr) {
          // Prefer local if this email has a local account, or cloud auth is disabled
          if (isCloudAuthDisabledError(cloudErr)) {
            setForceLocalAuth(true);
          } else {
            // try local fallback for hybrid users before rethrowing
            try {
              const session = await localSignIn(email, password);
              setForceLocalAuth(true);
              setUser(session);
              setLoading(false);
              return;
            } catch {
              throw cloudErr;
            }
          }
        }
      }
      const session = await localSignIn(email, password);
      setUser(session);
      setLoading(false);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      const msg = e.code
        ? mapFirebaseAuthError(e.code, e.message || 'Login failed')
        : e.message || 'Login failed';
      setErrorLog(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setAuthLoading(true);
    setErrorLog(null);
    try {
      if (isCloudSyncEnabled && auth && !forceLocalAuth) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
        return;
      }
      throw new Error(
        'Google sign-in needs Firebase Authentication enabled in the console (Authentication → Get started). Use email & password for local accounts in the meantime.'
      );
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (isCloudAuthDisabledError(err)) {
        setForceLocalAuth(true);
      }
      const msg = e.code
        ? mapFirebaseAuthError(e.code, e.message || 'Google sign-in failed')
        : e.message || 'Google sign-in failed';
      setErrorLog(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<string> => {
    setAuthLoading(true);
    setErrorLog(null);
    try {
      if (!email.trim()) {
        throw new Error('Please enter your email address.');
      }
      if (isCloudSyncEnabled && auth && !forceLocalAuth) {
        try {
          await sendPasswordResetEmail(auth, email.trim());
          return 'Password reset email sent. Check your inbox (and spam folder).';
        } catch (cloudErr) {
          if (!isCloudAuthDisabledError(cloudErr)) throw cloudErr;
          setForceLocalAuth(true);
        }
      }
      throw new Error(
        'Password reset by email needs Firebase Auth. In local mode, create a new account if you forgot your password.'
      );
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      const msg = e.code
        ? mapFirebaseAuthError(e.code, e.message || 'Password reset failed')
        : e.message || 'Password reset failed';
      setErrorLog(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const logoutUser = async () => {
    setErrorLog(null);
    try {
      if (isLocalUser(user) || forceLocalAuth) {
        localSignOut();
        setUser(null);
      } else if (isCloudSyncEnabled && auth) {
        await signOut(auth);
      } else {
        localSignOut();
        setUser(null);
      }
      setClients([]);
      setInventory([]);
      setInvoices([]);
      setQuotations([]);
      setPayments([]);
      setLoading(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorLog('Sign out failed: ' + (e.message || 'Unknown error'));
    }
  };

  const usingCloudData =
    isCloudSyncEnabled && !!db && !!user && !isLocalUser(user) && !forceLocalAuth;

  // --- Client actions ---
  const saveClient = async (clientData: Omit<Client, 'userId' | 'createdAt'>) => {
    const uid = user?.uid || 'local-user';
    const existing = clients.find((c) => c.id === clientData.id);
    const entireClient: Client = {
      ...clientData,
      userId: uid,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await setDoc(doc(db, 'clients', entireClient.id), entireClient);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `clients/${entireClient.id}`);
      }
    } else {
      setClients((prev) => {
        const updated = [entireClient, ...prev.filter((c) => c.id !== entireClient.id)];
        setLocalStorageItem(`clients_${uid}`, updated);
        return updated;
      });
    }
  };

  const removeClient = async (id: string) => {
    const uid = user?.uid || 'local-user';
    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await deleteDoc(doc(db, 'clients', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `clients/${id}`);
      }
    } else {
      const updated = clients.filter((c) => c.id !== id);
      setClients(updated);
      setLocalStorageItem(`clients_${uid}`, updated);
    }
  };

  // --- Inventory actions ---
  const saveInventoryItem = async (
    itemData: Omit<InventoryItem, 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    const uid = user?.uid || 'local-user';
    const timestamp = new Date().toISOString();
    const existingIndex = inventory.findIndex((i) => i.id === itemData.id);
    const entireItem: InventoryItem = {
      ...itemData,
      userId: uid,
      createdAt: existingIndex > -1 ? inventory[existingIndex].createdAt : timestamp,
      updatedAt: timestamp,
    };

    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await setDoc(doc(db, 'inventory', entireItem.id), entireItem);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `inventory/${entireItem.id}`);
      }
    } else {
      setInventory((prev) => {
        const updated = [entireItem, ...prev.filter((i) => i.id !== entireItem.id)];
        setLocalStorageItem(`inventory_${uid}`, updated);
        return updated;
      });
    }
  };

  const removeInventoryItem = async (id: string) => {
    const uid = user?.uid || 'local-user';
    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `inventory/${id}`);
      }
    } else {
      const updated = inventory.filter((i) => i.id !== id);
      setInventory(updated);
      setLocalStorageItem(`inventory_${uid}`, updated);
    }
  };

  const adjustStock = async (id: string, newQty: number) => {
    const uid = user?.uid || 'local-user';
    const targetItem = inventory.find((i) => i.id === id);
    if (!targetItem) return;

    const updatedItem = {
      ...targetItem,
      quantity: Math.max(0, newQty),
      updatedAt: new Date().toISOString(),
    };

    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await updateDoc(doc(db, 'inventory', id), {
          quantity: updatedItem.quantity,
          updatedAt: updatedItem.updatedAt,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `inventory/${id}`);
      }
    } else {
      const updated = inventory.map((i) => (i.id === id ? updatedItem : i));
      setInventory(updated);
      setLocalStorageItem(`inventory_${uid}`, updated);
    }
  };

  // --- Invoice actions ---
  const saveInvoice = async (
    invoiceData: Omit<Invoice, 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    const uid = user?.uid || 'local-user';
    const timestamp = new Date().toISOString();
    const existingIndex = invoices.findIndex((i) => i.id === invoiceData.id);

    let subtotal = 0;
    let taxAmount = 0;
    invoiceData.items.forEach((item) => {
      const itemSub = item.quantity * item.price;
      subtotal += itemSub;
      taxAmount += itemSub * (item.taxRate / 100);
    });

    const entireInvoice: Invoice = {
      ...invoiceData,
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
      userId: uid,
      createdAt: existingIndex > -1 ? invoices[existingIndex].createdAt : timestamp,
      updatedAt: timestamp,
    };

    if (existingIndex === -1) {
      entireInvoice.items.forEach((item) => {
        if (item.sku) {
          const inv = inventory.find((i) => i.sku === item.sku);
          if (inv) {
            adjustStock(inv.id, inv.quantity - item.quantity);
          }
        }
      });
    }

    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await setDoc(doc(db, 'invoices', entireInvoice.id), entireInvoice);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `invoices/${entireInvoice.id}`);
      }
    } else {
      setInvoices((prev) => {
        const updated = [entireInvoice, ...prev.filter((i) => i.id !== entireInvoice.id)];
        setLocalStorageItem(`invoices_${uid}`, updated);
        return updated;
      });
    }
  };

  const removeInvoice = async (id: string) => {
    const uid = user?.uid || 'local-user';
    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await deleteDoc(doc(db, 'invoices', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `invoices/${id}`);
      }
    } else {
      const updated = invoices.filter((i) => i.id !== id);
      setInvoices(updated);
      setLocalStorageItem(`invoices_${uid}`, updated);
    }
  };

  const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    const uid = user?.uid || 'local-user';
    const invoiceDoc = invoices.find((i) => i.id === id);
    if (!invoiceDoc) return;

    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await updateDoc(doc(db, 'invoices', id), {
          status,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `invoices/${id}`);
      }
    } else {
      const updated = invoices.map((i) =>
        i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i
      );
      setInvoices(updated);
      setLocalStorageItem(`invoices_${uid}`, updated);
    }
  };

  // --- Quotation actions ---
  const saveQuotation = async (
    quotationData: Omit<Quotation, 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    const uid = user?.uid || 'local-user';
    const timestamp = new Date().toISOString();
    const existingIndex = quotations.findIndex((q) => q.id === quotationData.id);

    let subtotal = 0;
    let taxAmount = 0;
    quotationData.items.forEach((item) => {
      const itemSub = item.quantity * item.price;
      subtotal += itemSub;
      taxAmount += itemSub * (item.taxRate / 100);
    });

    const entireQuotation: Quotation = {
      ...quotationData,
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
      userId: uid,
      createdAt:
        existingIndex > -1 ? quotations[existingIndex].createdAt : timestamp,
      updatedAt: timestamp,
    };

    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await setDoc(doc(db, 'quotations', entireQuotation.id), entireQuotation);
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `quotations/${entireQuotation.id}`
        );
      }
    } else {
      setQuotations((prev) => {
        const updated = [
          entireQuotation,
          ...prev.filter((q) => q.id !== entireQuotation.id),
        ];
        setLocalStorageItem(`quotations_${uid}`, updated);
        return updated;
      });
    }
  };

  const removeQuotation = async (id: string) => {
    const uid = user?.uid || 'local-user';
    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await deleteDoc(doc(db, 'quotations', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `quotations/${id}`);
      }
    } else {
      const updated = quotations.filter((q) => q.id !== id);
      setQuotations(updated);
      setLocalStorageItem(`quotations_${uid}`, updated);
    }
  };

  const updateQuotationStatus = async (
    id: string,
    status: Quotation['status']
  ) => {
    const uid = user?.uid || 'local-user';
    const target = quotations.find((q) => q.id === id);
    if (!target) return;

    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await updateDoc(doc(db, 'quotations', id), {
          status,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `quotations/${id}`);
      }
    } else {
      const updated = quotations.map((q) =>
        q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q
      );
      setQuotations(updated);
      setLocalStorageItem(`quotations_${uid}`, updated);
    }
  };

  const convertQuoteToInvoice = async (quoteId: string) => {
    const quote = quotations.find((q) => q.id === quoteId);
    if (!quote) return;

    const newInvoice: Omit<Invoice, 'userId' | 'createdAt' | 'updatedAt'> = {
      id: 'inv_' + Date.now().toString(),
      invoiceNumber: 'INV-' + Date.now().toString().slice(-6),
      clientId: quote.clientId,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      items: quote.items,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      total: quote.total,
      currency: quote.currency,
      status: 'draft',
      notes: quote.notes
        ? `Converted from Quote ${quote.quotationNumber}. ` + quote.notes
        : `Converted from Quote ${quote.quotationNumber}.`,
    };

    await updateQuotationStatus(quoteId, 'accepted');
    await saveInvoice(newInvoice);
  };

  // --- Payment actions ---
  const recordPayment = async (
    paymentData: Omit<Payment, 'userId' | 'createdAt'>
  ) => {
    const uid = user?.uid || 'local-user';
    const entirePayment: Payment = {
      ...paymentData,
      userId: uid,
      createdAt: new Date().toISOString(),
    };

    const invoice = invoices.find((i) => i.id === paymentData.invoiceId);
    if (invoice) {
      const totalInvoicePayments =
        payments
          .filter((p) => p.invoiceId === paymentData.invoiceId && p.id !== paymentData.id)
          .reduce((sum, p) => sum + p.amount, 0) + paymentData.amount;

      if (totalInvoicePayments >= invoice.total) {
        await updateInvoiceStatus(paymentData.invoiceId, 'paid');
      }
    }

    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await setDoc(doc(db, 'payments', entirePayment.id), entirePayment);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `payments/${entirePayment.id}`);
      }
    } else {
      setPayments((prev) => {
        const updated = [entirePayment, ...prev];
        setLocalStorageItem(`payments_${uid}`, updated);
        return updated;
      });
    }
  };

  const removePayment = async (id: string) => {
    const uid = user?.uid || 'local-user';

    const targetPayment = payments.find((p) => p.id === id);
    if (targetPayment) {
      const invoice = invoices.find((i) => i.id === targetPayment.invoiceId);
      if (invoice && invoice.status === 'paid') {
        await updateInvoiceStatus(invoice.id, 'sent');
      }
    }

    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await deleteDoc(doc(db, 'payments', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `payments/${id}`);
      }
    } else {
      const updated = payments.filter((p) => p.id !== id);
      setPayments(updated);
      setLocalStorageItem(`payments_${uid}`, updated);
    }
  };

  // --- Settings ---
  const saveSettings = async (
    settingsData: Omit<BusinessSettings, 'userId'> & { userId?: string }
  ) => {
    const uid = user?.uid || 'local-user';
    const entireSettings: BusinessSettings = {
      ...settingsData,
      userId: uid,
      updatedAt: new Date().toISOString(),
    };

    if (isCloudSyncEnabled && db && user && !isLocalUser(user) && !forceLocalAuth) {
      try {
        await setDoc(doc(db, 'settings', uid), entireSettings);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `settings/${uid}`);
      }
    } else {
      setSettings(entireSettings);
      setLocalStorageItem(`settings_${uid}`, entireSettings);
    }
  };

  return (
    <BusinessContext.Provider
      value={{
        user,
        loading,
        authLoading,
        isSyncing,
        clients,
        inventory,
        invoices,
        quotations,
        payments,
        settings,
        errorLog,
        clearError,
        signUpWithEmail,
        loginWithEmail,
        loginWithGoogle,
        resetPassword,
        logoutUser,
        login: loginWithGoogle,
        logInWithGoogle: loginWithGoogle,
        logOutProcess: logoutUser,
        connectionMode:
          isCloudSyncEnabled && !forceLocalAuth && user && !isLocalUser(user)
            ? 'firestore'
            : 'local',
        cloudAuthAvailable: isCloudSyncEnabled && !!auth && !forceLocalAuth,
        usingLocalAuth: forceLocalAuth || isLocalUser(user),
        saveClient,
        removeClient,
        saveInventoryItem,
        removeInventoryItem,
        adjustStock,
        saveInvoice,
        removeInvoice,
        updateInvoiceStatus,
        saveQuotation,
        removeQuotation,
        updateQuotationStatus,
        convertQuoteToInvoice,
        recordPayment,
        removePayment,
        saveSettings,
        convertCurrency,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
