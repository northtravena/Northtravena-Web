import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users, RefreshCw, Search, Phone, Mail, Clock, AlertTriangle, Trash2, Save,
  XCircle, CheckCircle, Plus, Calendar, Smartphone, ShieldCheck, MapPin, ArrowRight,
  UserCheck, Copy, Eye, SlidersHorizontal
} from "lucide-react";
import { toast } from "sonner";
import {
  useFirebasePassengers,
  useUpdateFirebasePassenger,
  useDeletePassenger,
  useFirebaseBookings,
} from "@/lib/queries";
import { usePagination } from "@/lib/usePagination";
import { Pagination } from "@/components/Pagination";

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface FbPassenger {
  id: string;
  uid?: string;
  fullName?: string;
  name?: string;
  displayName?: string;
  email?: string;
  phoneNo?: string;
  phoneNumber?: string;
  phone?: string;
  role?: string;
  createdAt?: string | { _seconds: number; _nanoseconds: number };
  fcmToken?: string;
  photoUrl?: string;
  status?: string;
  isVerified?: boolean;
}

interface FbBooking {
  id: string;
  userId?: string;
  userName?: string;
  source?: string; pickup?: string; pickupLocation?: string;
  destination?: string; dropoff?: string; dropLocation?: string;
  pickupDate?: string; date?: string;
  totalAmount?: number; amount?: number; fare?: number; price?: number;
  status: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  if (!name || name === "—") return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function resolveName(p: FbPassenger) {
  return p.fullName || p.name || p.displayName || p.email || "Unnamed Passenger";
}

function resolveEmail(p: FbPassenger) {
  return p.email || "—";
}

function resolvePhone(p: FbPassenger) {
  return p.phoneNo || p.phoneNumber || p.phone || "—";
}

function resolveDate(createdAt?: string | { _seconds: number; _nanoseconds: number }) {
  if (!createdAt) return "—";
  if (typeof createdAt === "object" && "_seconds" in createdAt) {
    return new Date(createdAt._seconds * 1000).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  }
  if (typeof createdAt === "string") {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  }
  return "—";
}

function resolveTime(createdAt?: string | { _seconds: number; _nanoseconds: number }) {
  if (!createdAt) return "";
  if (typeof createdAt === "object" && "_seconds" in createdAt) {
    return new Date(createdAt._seconds * 1000).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit"
    });
  }
  if (typeof createdAt === "string") {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }
  }
  return "";
}

function avatarColor(name: string) {
  const colors = [
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-blue-100 text-blue-700 border-blue-200",
    "bg-purple-100 text-purple-700 border-purple-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-indigo-100 text-indigo-700 border-indigo-200",
    "bg-teal-100 text-teal-700 border-teal-200",
  ];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteConfirmModal({
  passenger, onConfirm, onCancel, deleting
}: {
  passenger: FbPassenger; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  const name = resolveName(passenger);
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Delete Passenger</h3>
            <p className="text-xs text-gray-500">Permanently remove user account</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-6">
          Are you sure you want to delete passenger <span className="font-semibold text-gray-900">"{name}"</span>? All account data will be removed from Firebase.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 rounded-xl gap-2 text-white"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</>
            ) : (
              <><Trash2 className="w-4 h-4" />Delete</>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Edit Passenger Modal ─────────────────────────────────────────────────────
function EditPassengerModal({
  passenger, onClose, onSave, saving
}: {
  passenger: FbPassenger;
  onClose: () => void;
  onSave: (updated: { fullName: string; phoneNo: string; email: string }) => Promise<void>;
  saving: boolean;
}) {
  const [fullName, setFullName] = useState(resolveName(passenger));
  const [phoneNo, setPhoneNo] = useState(resolvePhone(passenger) === "—" ? "" : resolvePhone(passenger));
  const [email, setEmail] = useState(resolveEmail(passenger) === "—" ? "" : resolveEmail(passenger));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    setError(null);
    try {
      await onSave({ fullName, phoneNo, email });
      toast.success("Passenger details updated successfully!");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update passenger");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              {getInitials(fullName)}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Edit Passenger</h3>
              <p className="text-xs text-gray-400">Update profile information</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="e.g. Ali Ahmed"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="e.g. 03451234567"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="e.g. user@example.com"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Sliding Passenger Details Drawer ─────────────────────────────────────────
function PassengerDetailsDrawer({
  passenger, onClose, onEdit, onDelete, bookings
}: {
  passenger: FbPassenger;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  bookings: FbBooking[];
}) {
  const name = resolveName(passenger);
  const email = resolveEmail(passenger);
  const phone = resolvePhone(passenger);
  const ac = avatarColor(name);
  const dateStr = resolveDate(passenger.createdAt);
  const timeStr = resolveTime(passenger.createdAt);

  // Filter bookings for this passenger
  const passengerId = passenger.id || passenger.uid;
  const userBookings = useMemo(() => {
    return bookings.filter((b) => b.userId === passengerId || (b.userName && b.userName.toLowerCase() === name.toLowerCase()));
  }, [bookings, passengerId, name]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Card */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-900 to-teal-800 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-bold text-2xl shadow-inner shrink-0">
              {getInitials(name)}
            </div>
            <div className="min-w-0 pr-6">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 uppercase tracking-wider mb-1">
                Passenger Profile
              </span>
              <h2 className="text-xl font-bold text-white truncate" title={name}>{name}</h2>
              <p className="text-xs text-emerald-100/80 truncate mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ID: {passengerId}
              </p>
            </div>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
              <span className="text-[11px] font-medium text-emerald-800 uppercase tracking-wide">Total Bookings</span>
              <p className="text-xl font-bold text-emerald-900 mt-1">{userBookings.length}</p>
            </div>
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
              <span className="text-[11px] font-medium text-blue-800 uppercase tracking-wide">Push Notification</span>
              <p className="text-xs font-semibold text-blue-900 mt-1.5 flex items-center gap-1">
                {passenger.fcmToken ? (
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Enabled</span>
                ) : (
                  <span className="text-gray-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> No Device</span>
                )}
              </p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" /> Contact Details
            </h3>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-medium block">Phone Number</span>
                    <span className="text-sm font-semibold text-gray-900">{phone}</span>
                  </div>
                </div>
                {phone !== "—" && (
                  <button
                    onClick={() => copyToClipboard(phone, "Phone number")}
                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="h-px bg-gray-200/60" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-medium block">Email Address</span>
                    <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px] block">{email}</span>
                  </div>
                </div>
                {email !== "—" && (
                  <button
                    onClick={() => copyToClipboard(email, "Email address")}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Account Metadata */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Account Metadata
            </h3>

            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Registration Date:</span>
                <span className="font-semibold text-gray-800">{dateStr} {timeStr && `at ${timeStr}`}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Account Role:</span>
                <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 border-emerald-200">
                  {passenger.role || "Passenger"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">User ID (Firebase):</span>
                <span className="font-mono text-[11px] text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                  {passengerId}
                </span>
              </div>

              {passenger.fcmToken && (
                <div className="pt-1">
                  <span className="text-[10px] text-gray-400 font-medium block mb-1">FCM Device Token:</span>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200">
                    <span className="text-[10px] font-mono text-gray-600 truncate flex-1">{passenger.fcmToken}</span>
                    <button
                      onClick={() => copyToClipboard(passenger.fcmToken!, "FCM Token")}
                      className="text-gray-400 hover:text-emerald-600 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bookings Activity */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Recent Bookings ({userBookings.length})
            </h3>

            {userBookings.length === 0 ? (
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center text-xs text-gray-400">
                No ride bookings found for this passenger yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {userBookings.map((b) => (
                  <div key={b.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800">
                        {b.totalAmount ?? b.amount ?? b.fare ? `PKR ${(b.totalAmount ?? b.amount ?? b.fare)!.toLocaleString()}` : "—"}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        b.status?.toLowerCase() === "complete" || b.status?.toLowerCase() === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : b.status?.toLowerCase() === "cancelled" || b.status?.toLowerCase() === "canceled"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600 truncate">
                      <span className="truncate max-w-[120px]">{b.source || b.pickup || "Origin"}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate max-w-[120px]">{b.destination || b.dropoff || "Destination"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl gap-1.5 text-xs"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Account
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 text-xs px-4"
            onClick={onEdit}
          >
            Edit Profile
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Passengers Component ────────────────────────────────────────────────
export function Passengers() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [pushFilter, setPushFilter] = useState<"all" | "active" | "none">("all");
  const [selectedPassenger, setSelectedPassenger] = useState<FbPassenger | null>(null);
  const [editingPassenger, setEditingPassenger] = useState<FbPassenger | null>(null);
  const [deletingPassenger, setDeletingPassenger] = useState<FbPassenger | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: rawPassengers = [], isLoading: loading, error, refetch } = useFirebasePassengers();
  const { data: rawBookings = [] } = useFirebaseBookings();
  const updatePassenger = useUpdateFirebasePassenger();
  const deletePassenger = useDeletePassenger();
  const pagination = usePagination();

  const passengers = rawPassengers as FbPassenger[];
  const bookings = rawBookings as FbBooking[];

  // Stats
  const totalPassengers = passengers.length;
  const activeDeviceCount = passengers.filter((p) => !!p.fcmToken).length;
  const verifiedCount = passengers.filter((p) => resolvePhone(p) !== "—" && resolveEmail(p) !== "—").length;
  
  const todayStr = new Date().toISOString().split("T")[0];
  const newTodayCount = passengers.filter((p) => resolveDate(p.createdAt).includes(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }))).length;

  // Search and Sort
  const filteredPassengers = useMemo(() => {
    return passengers
      .filter((p) => {
        if (pushFilter === "active" && !p.fcmToken) return false;
        if (pushFilter === "none" && !!p.fcmToken) return false;

        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const name = resolveName(p).toLowerCase();
        const email = resolveEmail(p).toLowerCase();
        const phone = resolvePhone(p).toLowerCase();
        const id = (p.id || p.uid || "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q) || id.includes(q);
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return resolveName(a).localeCompare(resolveName(b));
        }
        const tA = typeof a.createdAt === "object" && "_seconds" in a.createdAt ? a.createdAt._seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const tB = typeof b.createdAt === "object" && "_seconds" in b.createdAt ? b.createdAt._seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return sortBy === "newest" ? tB - tA : tA - tB;
      });
  }, [passengers, search, sortBy, pushFilter]);

  const totalItems = filteredPassengers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pagination.limit));

  const paginatedPassengers = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return filteredPassengers.slice(start, start + pagination.limit);
  }, [filteredPassengers, pagination.page, pagination.limit]);

  // Handlers
  const handleUpdatePassenger = async (updatedData: { fullName: string; phoneNo: string; email: string }) => {
    if (!editingPassenger) return;
    const targetId = editingPassenger.id || editingPassenger.uid;
    await updatePassenger.mutateAsync({
      id: String(targetId),
      data: updatedData
    });
    refetch();
  };

  const handleDeletePassenger = async () => {
    if (!deletingPassenger) return;
    const targetId = deletingPassenger.id || deletingPassenger.uid;
    try {
      await deletePassenger.mutateAsync(String(targetId));
      toast.success("Passenger deleted successfully!");
      setDeletingPassenger(null);
      if (selectedPassenger?.id === targetId) setSelectedPassenger(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete passenger");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* Modals & Drawers */}
      {selectedPassenger && (
        <PassengerDetailsDrawer
          passenger={selectedPassenger}
          onClose={() => setSelectedPassenger(null)}
          onEdit={() => { setEditingPassenger(selectedPassenger); }}
          onDelete={() => { setDeletingPassenger(selectedPassenger); }}
          bookings={bookings}
        />
      )}

      {editingPassenger && (
        <EditPassengerModal
          passenger={editingPassenger}
          onClose={() => setEditingPassenger(null)}
          onSave={handleUpdatePassenger}
          saving={updatePassenger.isPending}
        />
      )}

      {deletingPassenger && (
        <DeleteConfirmModal
          passenger={deletingPassenger}
          onCancel={() => setDeletingPassenger(null)}
          onConfirm={handleDeletePassenger}
          deleting={deletePassenger.isPending}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-600" />
            Passengers Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View registered app passengers, contact details, registration timestamps, and account activity
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2 rounded-xl">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Passengers</CardTitle>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalPassengers}</div>
            <p className="text-xs text-gray-400 mt-1">Registered users on mobile app</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Devices (FCM)</CardTitle>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Smartphone className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeDeviceCount}</div>
            <p className="text-xs text-gray-400 mt-1">Ready for push notifications</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Verified Contacts</CardTitle>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{verifiedCount}</div>
            <p className="text-xs text-gray-400 mt-1">Has both phone & email provided</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Registrations</CardTitle>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{newTodayCount}</div>
            <p className="text-xs text-gray-400 mt-1">Joined recently</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-gray-200/80 shadow-sm">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 rounded-t-xl">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); pagination.setPage(1); }}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-gray-400 shadow-sm"
            />
          </div>

          {/* Filters & Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Push Status Filter */}
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Push Status:</span>
              <select
                value={pushFilter}
                onChange={(e) => { setPushFilter(e.target.value as any); pagination.setPage(1); }}
                className="text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
              >
                <option value="all">All Push Statuses</option>
                <option value="active">Active Device (FCM Token)</option>
                <option value="none">No Push Token</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
              >
                <option value="newest">Newest Registered</option>
                <option value="oldest">Oldest Registered</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 bg-red-50/50 text-sm">
              Failed to load passenger directory: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          ) : filteredPassengers.length === 0 ? (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <Users className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-base font-semibold text-gray-600">{search ? "No passengers found" : "No passengers registered"}</p>
              <p className="text-xs text-gray-400">{search ? "Try adjusting your search query" : "Passengers will appear here when they create an account on the app"}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700 text-xs uppercase tracking-wider pl-6">Passenger</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs uppercase tracking-wider">Contact Information</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs uppercase tracking-wider">Registration Date</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs uppercase tracking-wider">Push Status</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs uppercase tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPassengers.map((p) => {
                    const name = resolveName(p);
                    const email = resolveEmail(p);
                    const phone = resolvePhone(p);
                    const ac = avatarColor(name);
                    const dateStr = resolveDate(p.createdAt);

                    return (
                      <TableRow
                        key={p.id || p.uid}
                        className="cursor-pointer hover:bg-emerald-50/30 transition-colors group"
                        onClick={() => setSelectedPassenger(p)}
                      >
                        {/* Passenger Profile */}
                        <TableCell className="pl-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className={`w-10 h-10 border ${ac} font-bold text-sm shrink-0 shadow-sm`}>
                              <AvatarFallback>{getInitials(name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-sm text-gray-900 group-hover:text-emerald-700 transition-colors">{name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0 bg-gray-100 text-gray-600 border border-gray-200">
                                  {p.role || "Passenger"}
                                </Badge>
                                <span className="text-[10px] text-gray-400 font-mono">ID: {(p.id || p.uid || "").slice(0, 8)}...</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact Information */}
                        <TableCell className="py-3.5">
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate max-w-[200px]" title={email}>{email}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Registration Date */}
                        <TableCell className="py-3.5 text-xs text-gray-600">
                          <div className="flex items-center gap-1.5 font-medium text-gray-800">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {dateStr}
                          </div>
                          {resolveTime(p.createdAt) && (
                            <span className="text-[11px] text-gray-400 block mt-0.5 pl-5">
                              {resolveTime(p.createdAt)}
                            </span>
                          )}
                        </TableCell>

                        {/* Push Token Status */}
                        <TableCell className="py-3.5">
                          {p.fcmToken ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active Device
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                              No FCM Token
                            </span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="pr-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 px-2.5 rounded-lg border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 gap-1.5"
                              onClick={() => setSelectedPassenger(p)}
                            >
                              <Eye className="w-3.5 h-3.5" /> Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-8 px-2.5 rounded-lg border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 gap-1.5"
                              onClick={() => setDeletingPassenger(p)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {filteredPassengers.length > 0 && (
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                  <Pagination
                    page={pagination.page}
                    limit={pagination.limit}
                    total={totalItems}
                    totalPages={totalPages}
                    onPageChange={pagination.setPage}
                    onLimitChange={pagination.setLimit}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
