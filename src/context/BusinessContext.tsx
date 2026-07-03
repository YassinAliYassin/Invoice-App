import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Client,
  InventoryItem,
  Invoice,
  Quotation,
  Payment,
  BusinessSettings,
  CurrencyCode,
  CURRENCY_RATES
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
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
} from '../firebase';

interface BusinessContextType {
  user: FirebaseUser | any | null;
  loading: boolean;
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
  login: () => Promise<void>;
  logoutUser: () => Promise<void>;
  logInWithGoogle: () => Promise<void>;
  logOutProcess: () => Promise<void>;
  connectionMode: 'firestore' | 'local';

  // Client actions
  saveClient: (client: Omit<Client, 'userId' | 'createdAt'>) => Promise<void>;
  removeClient: (id: string) => Promise<void>;

  // Inventory actions
  saveInventoryItem: (item: Omit<InventoryItem, 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeInventoryItem: (id: string) => Promise<void>;
  adjustStock: (id: string, newQty: number) => Promise<void>;

  // Invoice actions
  saveInvoice: (invoice: Omit<Invoice, 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeInvoice: (id: string) => Promise<void>;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<void>;

  // Quotation actions
  saveQuotation: (quotation: Omit<Quotation, 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeQuotation: (id: string) => Promise<void>;
  updateQuotationStatus: (id: string, status: Quotation['status']) => Promise<void>;
  convertQuoteToInvoice: (quoteId: string) => Promise<void>;

  // Payment actions
  recordPayment: (payment: Omit<Payment, 'userId' | 'createdAt'>) => Promise<void>;
  removePayment: (id: string) => Promise<void>;

  // Settings action
  saveSettings: (settings: BusinessSettings) => Promise<void>;

  // General Currency converter
  convertCurrency: (amount: number, from: CurrencyCode, to: CurrencyCode) => number;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// --- Default Initial settings & Data Mock templates for offline-immediate user experience ---
const defaultSettings = (uid: string): BusinessSettings => ({
  userId: uid,
  businessName: "Global Solutions Ltd",
  businessEmail: "hello@globalsolutions.com",
  businessPhone: "+1 (555) 012-3456",
  businessAddress: "100 Innovation Blvd, Suite 400, New York, NY 10001",
  taxId: "VAT-US98765432",
  defaultCurrency: "USD",
  logoUrl: "",
  brandColor: "#2563eb"
});

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  // Core collections data state
  const [clients, setClients] = useState<Client[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    userId: "local-user",
    businessName: "Acme Enterprise",
    businessEmail: "billing@acme.com",
    businessPhone: "+1 (555) 019-2831",
    businessAddress: "45 Broad St, Floor 12, Boston, MA 02109",
    taxId: "TAX-123456",
    defaultCurrency: "USD",
    logoUrl: "",
    brandColor: "#2563eb"
  });

  const clearError = () => setErrorLog(null);

  // --- Multi-Currency Global conversion calculator helper ---
  const convertCurrency = (amount: number, from: CurrencyCode, to: CurrencyCode): number => {
    if (from === to) return amount;
    const rateFrom = CURRENCY_RATES[from] || 1;
    const rateTo = CURRENCY_RATES[to] || 1;
    // convert first to base (USD), then to target
    const amountInBase = amount / rateFrom;
    return amountInBase * rateTo;
  };

  // Safe wrapper for localStorage fallbacks
  const getLocalStorageItem = (key: string, defaultValue: any) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const setLocalStorageItem = (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Local storage saving error:", e);
    }
  };

  // --- Auth state change effects ---
  useEffect(() => {
    if (isCloudSyncEnabled && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          console.log("Logged in Firebase User:", firebaseUser.email);
        } else {
          setUser(null);
          setLoading(false);
        }
      });
      return () => unsubscribe();
    } else {
      // Local execution fallback
      const mockSessionUser = getLocalStorageItem("app_mock_user", {
        uid: "local-user",
        email: "demo@premium-suite.com",
        displayName: "Demo Account (Local Mode)",
        emailVerified: true
      });
      setUser(mockSessionUser);
      setLoading(false);
    }
  }, []);

  // --- Core Firestore syncing / localStorage loading ---
  useEffect(() => {
    if (!user) {
      setClients([]);
      setInventory([]);
      setInvoices([]);
      setQuotations([]);
      setPayments([]);
      return;
    }

    const uid = user.uid;

    if (isCloudSyncEnabled && db) {
      setIsSyncing(true);
      
      // Load and Sync Settings (document settings/{userId})
      const settingsDocRef = doc(db, 'settings', uid);
      const unsubSettings = onSnapshot(settingsDocRef, (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as BusinessSettings);
        } else {
          // Initialize settings in first run
          const initialSettings = defaultSettings(uid);
          setDoc(settingsDocRef, initialSettings).catch(err => {
            console.error("Initializing settings failed:", err);
          });
          setSettings(initialSettings);
        }
      }, (error) => {
        setErrorLog("Permission error syncing settings: " + error.message);
      });

      // Load & Sync Clients
      const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
        const items = snap.docs
          .map(doc => doc.data() as Client)
          .filter(c => c.userId === uid);
        setClients(items);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'clients'));

      // Load & Sync Inventory
      const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
        const items = snap.docs
          .map(doc => doc.data() as InventoryItem)
          .filter(i => i.userId === uid);
        setInventory(items);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'inventory'));

      // Load & Sync Invoices
      const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snap) => {
        const items = snap.docs
          .map(doc => doc.data() as Invoice)
          .filter(i => i.userId === uid);
        setInvoices(items);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'invoices'));

      // Load & Sync Quotations
      const unsubQuotations = onSnapshot(collection(db, 'quotations'), (snap) => {
        const items = snap.docs
          .map(doc => doc.data() as Quotation)
          .filter(q => q.userId === uid);
        setQuotations(items);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'quotations'));

      // Load & Sync Payments
      const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
        const items = snap.docs
          .map(doc => doc.data() as Payment)
          .filter(p => p.userId === uid);
        setPayments(items);
        setIsSyncing(false);
        setLoading(false);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'payments'));

      return () => {
        unsubSettings();
        unsubClients();
        unsubInventory();
        unsubInvoices();
        unsubQuotations();
        unsubPayments();
      };
    } else {
      // Local Mode: Load from Local Storage with beautiful rich mock initial data for demoing
      const localClients = getLocalStorageItem(`clients_${uid}`, []);
      const localInventory = getLocalStorageItem(`inventory_${uid}`, [
        { id: "p1", name: "Premium Consulting", sku: "SRV-CONS", description: "Business advisory service", price: 150, currency: "USD", quantity: 99, minStockLevel: 5, taxRate: 15, type: "service", userId: uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "p2", name: "Server Rack 42U", sku: "HW-RACK42", description: "Datacenter server cabinet hardware", price: 899, currency: "USD", quantity: 3, minStockLevel: 5, taxRate: 8, type: "product", userId: uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "p3", name: "Fiber Optic Cable (10m)", sku: "CAB-FO10", description: "High speed interconnect cables", price: 45, currency: "USD", quantity: 180, minStockLevel: 10, taxRate: 8, type: "item", userId: uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ]);
      const localInvoices = getLocalStorageItem(`invoices_${uid}`, []);
      const localQuotations = getLocalStorageItem(`quotations_${uid}`, []);
      const localPayments = getLocalStorageItem(`payments_${uid}`, []);
      const localSettings = getLocalStorageItem(`settings_${uid}`, defaultSettings(uid));

      setClients(localClients);
      setInventory(localInventory);
      setInvoices(localInvoices);
      setQuotations(localQuotations);
      setPayments(localPayments);
      setSettings(localSettings);
      setLoading(false);
    }
  }, [user]);

  // Auth Functions
  const login = async () => {
    if (isCloudSyncEnabled && auth) {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (err: any) {
        setErrorLog("Google Auth failed: " + err.message);
      }
    } else {
      // Toggle to standard mock user session
      const mock = {
        uid: "local-user",
        email: "demo@premium-suite.com",
        displayName: "Demo Enterprise",
        emailVerified: true
      };
      setLocalStorageItem("app_mock_user", mock);
      setUser(mock);
    }
  };

  const logoutUser = async () => {
    if (isCloudSyncEnabled && auth) {
      try {
        await signOut(auth);
      } catch (err: any) {
        setErrorLog("Signout failed: " + err.message);
      }
    } else {
      localStorage.removeItem("app_mock_user");
      setUser(null);
    }
  };

  // --- Client actions ---
  const saveClient = async (clientData: Omit<Client, 'userId' | 'createdAt'>) => {
    const uid = user?.uid || "local-user";
    const entireClient: Client = {
      ...clientData,
      userId: uid,
      createdAt: new Date().toISOString()
    };

    if (isCloudSyncEnabled && db) {
      try {
        await setDoc(doc(db, 'clients', entireClient.id), entireClient);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `clients/${entireClient.id}`);
      }
    } else {
      const updated = [entireClient, ...clients.filter(c => c.id !== entireClient.id)];
      setClients(updated);
      setLocalStorageItem(`clients_${uid}`, updated);
    }
  };

  const removeClient = async (id: string) => {
    const uid = user?.uid || "local-user";
    if (isCloudSyncEnabled && db) {
      try {
        await deleteDoc(doc(db, 'clients', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `clients/${id}`);
      }
    } else {
      const updated = clients.filter(c => c.id !== id);
      setClients(updated);
      setLocalStorageItem(`clients_${uid}`, updated);
    }
  };

  // --- Inventory actions ---
  const saveInventoryItem = async (itemData: Omit<InventoryItem, 'userId' | 'createdAt' | 'updatedAt'>) => {
    const uid = user?.uid || "local-user";
    const timestamp = new Date().toISOString();
    const existingIndex = inventory.findIndex(i => i.id === itemData.id);
    const entireItem: InventoryItem = {
      ...itemData,
      userId: uid,
      createdAt: existingIndex > -1 ? inventory[existingIndex].createdAt : timestamp,
      updatedAt: timestamp
    };

    if (isCloudSyncEnabled && db) {
      try {
        await setDoc(doc(db, 'inventory', entireItem.id), entireItem);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `inventory/${entireItem.id}`);
      }
    } else {
      const updated = [entireItem, ...inventory.filter(i => i.id !== entireItem.id)];
      setInventory(updated);
      setLocalStorageItem(`inventory_${uid}`, updated);
    }
  };

  const removeInventoryItem = async (id: string) => {
    const uid = user?.uid || "local-user";
    if (isCloudSyncEnabled && db) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `inventory/${id}`);
      }
    } else {
      const updated = inventory.filter(i => i.id !== id);
      setInventory(updated);
      setLocalStorageItem(`inventory_${uid}`, updated);
    }
  };

  const adjustStock = async (id: string, newQty: number) => {
    const uid = user?.uid || "local-user";
    const targetItem = inventory.find(i => i.id === id);
    if (!targetItem) return;

    const updatedItem = {
      ...targetItem,
      quantity: Math.max(0, newQty),
      updatedAt: new Date().toISOString()
    };

    if (isCloudSyncEnabled && db) {
      try {
        await updateDoc(doc(db, 'inventory', id), { quantity: updatedItem.quantity, updatedAt: updatedItem.updatedAt });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `inventory/${id}`);
      }
    } else {
      const updated = inventory.map(i => i.id === id ? updatedItem : i);
      setInventory(updated);
      setLocalStorageItem(`inventory_${uid}`, updated);
    }
  };

  // --- Invoice actions ---
  const saveInvoice = async (invoiceData: Omit<Invoice, 'userId' | 'createdAt' | 'updatedAt'>) => {
    const uid = user?.uid || "local-user";
    const timestamp = new Date().toISOString();
    const existingIndex = invoices.findIndex(i => i.id === invoiceData.id);
    
    // Auto calculate aggregates strictly for consistency
    let subtotal = 0;
    let taxAmount = 0;
    invoiceData.items.forEach(item => {
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
      updatedAt: timestamp
    };

    // Auto-update stock quantities of any non-service items in invoice on first creation
    if (existingIndex === -1) {
      entireInvoice.items.forEach(item => {
        if (item.sku) {
          const inv = inventory.find(i => i.sku === item.sku);
          if (inv) {
            adjustStock(inv.id, inv.quantity - item.quantity);
          }
        }
      });
    }

    if (isCloudSyncEnabled && db) {
      try {
        await setDoc(doc(db, 'invoices', entireInvoice.id), entireInvoice);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `invoices/${entireInvoice.id}`);
      }
    } else {
      const updated = [entireInvoice, ...invoices.filter(i => i.id !== entireInvoice.id)];
      setInvoices(updated);
      setLocalStorageItem(`invoices_${uid}`, updated);
    }
  };

  const removeInvoice = async (id: string) => {
    const uid = user?.uid || "local-user";
    if (isCloudSyncEnabled && db) {
      try {
        await deleteDoc(doc(db, 'invoices', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `invoices/${id}`);
      }
    } else {
      const updated = invoices.filter(i => i.id !== id);
      setInvoices(updated);
      setLocalStorageItem(`invoices_${uid}`, updated);
    }
  };

  const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    const uid = user?.uid || "local-user";
    const invoiceDoc = invoices.find(i => i.id === id);
    if (!invoiceDoc) return;

    if (isCloudSyncEnabled && db) {
      try {
        await updateDoc(doc(db, 'invoices', id), { status, updatedAt: new Date().toISOString() });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `invoices/${id}`);
      }
    } else {
      const updated = invoices.map(i => i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i);
      setInvoices(updated);
      setLocalStorageItem(`invoices_${uid}`, updated);
    }
  };

  // --- Quotation actions ---
  const saveQuotation = async (quotationData: Omit<Quotation, 'userId' | 'createdAt' | 'updatedAt'>) => {
    const uid = user?.uid || "local-user";
    const timestamp = new Date().toISOString();
    const existingIndex = quotations.findIndex(q => q.id === quotationData.id);

    let subtotal = 0;
    let taxAmount = 0;
    quotationData.items.forEach(item => {
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
      createdAt: existingIndex > -1 ? quotations[existingIndex].createdAt : timestamp,
      updatedAt: timestamp
    };

    if (isCloudSyncEnabled && db) {
      try {
        await setDoc(doc(db, 'quotations', entireQuotation.id), entireQuotation);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `quotations/${entireQuotation.id}`);
      }
    } else {
      const updated = [entireQuotation, ...quotations.filter(q => q.id !== entireQuotation.id)];
      setQuotations(updated);
      setLocalStorageItem(`quotations_${uid}`, updated);
    }
  };

  const removeQuotation = async (id: string) => {
    const uid = user?.uid || "local-user";
    if (isCloudSyncEnabled && db) {
      try {
        await deleteDoc(doc(db, 'quotations', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `quotations/${id}`);
      }
    } else {
      const updated = quotations.filter(q => q.id !== id);
      setQuotations(updated);
      setLocalStorageItem(`quotations_${uid}`, updated);
    }
  };

  const updateQuotationStatus = async (id: string, status: Quotation['status']) => {
    const uid = user?.uid || "local-user";
    const target = quotations.find(q => q.id === id);
    if (!target) return;

    if (isCloudSyncEnabled && db) {
      try {
        await updateDoc(doc(db, 'quotations', id), { status, updatedAt: new Date().toISOString() });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `quotations/${id}`);
      }
    } else {
      const updated = quotations.map(q => q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q);
      setQuotations(updated);
      setLocalStorageItem(`quotations_${uid}`, updated);
    }
  };

  const convertQuoteToInvoice = async (quoteId: string) => {
    const quote = quotations.find(q => q.id === quoteId);
    if (!quote) return;

    const newInvoice: Omit<Invoice, 'userId' | 'createdAt' | 'updatedAt'> = {
      id: "inv_" + Date.now().toString(),
      invoiceNumber: "INV-" + Date.now().toString().slice(-6),
      clientId: quote.clientId,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 Days term
      items: quote.items,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      total: quote.total,
      currency: quote.currency,
      status: "draft",
      notes: quote.notes ? `Converted from Quote ${quote.quotationNumber}. ` + quote.notes : `Converted from Quote ${quote.quotationNumber}.`
    };

    // Mark quote as accepted
    await updateQuotationStatus(quoteId, "accepted");
    // Save new invoice
    await saveInvoice(newInvoice);
  };

  // --- Payment actions ---
  const recordPayment = async (paymentData: Omit<Payment, 'userId' | 'createdAt'>) => {
    const uid = user?.uid || "local-user";
    const entirePayment: Payment = {
      ...paymentData,
      userId: uid,
      createdAt: new Date().toISOString()
    };

    // Mark corresponding invoice as paid if payment equals or exceeds total due
    const invoice = invoices.find(i => i.id === paymentData.invoiceId);
    if (invoice) {
      const totalInvoicePayments = payments
        .filter(p => p.invoiceId === paymentData.invoiceId && p.id !== paymentData.id)
        .reduce((sum, p) => sum + p.amount, 0) + paymentData.amount;
        
      if (totalInvoicePayments >= invoice.total) {
        await updateInvoiceStatus(paymentData.invoiceId, "paid");
      }
    }

    if (isCloudSyncEnabled && db) {
      try {
        await setDoc(doc(db, 'payments', entirePayment.id), entirePayment);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `payments/${entirePayment.id}`);
      }
    } else {
      const updated = [entirePayment, ...payments];
      setPayments(updated);
      setLocalStorageItem(`payments_${uid}`, updated);
    }
  };

  const removePayment = async (id: string) => {
    const uid = user?.uid || "local-user";
    
    // Find payment to identify invoice
    const targetPayment = payments.find(p => p.id === id);
    if (targetPayment) {
      const invoice = invoices.find(i => i.id === targetPayment.invoiceId);
      if (invoice && invoice.status === "paid") {
        // Shift status back to sent
        await updateInvoiceStatus(invoice.id, "sent");
      }
    }

    if (isCloudSyncEnabled && db) {
      try {
        await deleteDoc(doc(db, 'payments', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `payments/${id}`);
      }
    } else {
      const updated = payments.filter(p => p.id !== id);
      setPayments(updated);
      setLocalStorageItem(`payments_${uid}`, updated);
    }
  };

  // --- Settings action ---
  const saveSettings = async (settingsData: BusinessSettings) => {
    const uid = user?.uid || "local-user";
    const entireSettings = {
      ...settingsData,
      userId: uid,
      updatedAt: new Date().toISOString()
    };

    if (isCloudSyncEnabled && db) {
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
        isSyncing,
        clients,
        inventory,
        invoices,
        quotations,
        payments,
        settings,
        errorLog,
        clearError,
        login,
        logoutUser,
        logInWithGoogle: login,
        logOutProcess: logoutUser,
        connectionMode: isCloudSyncEnabled ? 'firestore' : 'local',
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
        convertCurrency
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
