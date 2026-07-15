import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Car, MapPin, Calendar, CheckCircle, Clock,
  XCircle, RefreshCw, User, X,
  ArrowRight, Banknote, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useFirebaseBookings, useUpdateFirebaseBooking } from "@/lib/queries";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FirebaseUser {
  id?: string;
  name?: string; fullName?: string; displayName?: string;
  email?: string;
  phone?: string; phoneNo?: string; phoneNumber?: string;
}

interface FirebaseBooking {
  id: string;
  // user identity
  userId?: string;
  userName?: string; userEmail?: string; userPhone?: string;
  // enriched by backend join
  _user?: FirebaseUser;
  // nested user objects (some Flutter apps)
  user?: FirebaseUser;
  customer?: FirebaseUser;
  // route
  source?: string; pickup?: string; pickupLocation?: string; pickupAddress?: string;
  destination?: string; dropoff?: string; dropLocation?: string; dropAddress?: string;
  sourceLocation?: { lat: number; lng: number };
  destinationLocation?: { lat: number; lng: number };
  // schedule
  pickupDate?: string; date?: string;
  pickupTime?: string; time?: string;
  dropDate?: string; dropTime?: string;
  workingDays?: number;
  // trip metrics (what Firebase actually stores)
  tripType?: string;
  totalVehicles?: number;
  totalDistance?: number; distance?: number;
  totalAmount?: number; amount?: number; fare?: number; price?: number;
  // payment
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  status: string;
  createdAt?: string | { _seconds: number; _nanoseconds: number };
  updatedAt?: string;
}

type FbStatus = "Pending" | "Approved" | "Completed" | "Cancelled";

// ─── Field resolvers ──────────────────────────────────────────────────────────
// Priority: backend-enriched _user > flat fields > nested user objects
const resolveName = (b: FirebaseBooking): string => {
  const u = b._user ?? b.user ?? b.customer;
  return (
    b.userName ??
    u?.name ?? u?.fullName ?? u?.displayName ??
    "—"
  );
};

const resolveEmail = (b: FirebaseBooking): string => {
  const u = b._user ?? b.user ?? b.customer;
  return b.userEmail ?? u?.email ?? "";
};

const resolvePhone = (b: FirebaseBooking): string => {
  const u = b._user ?? b.user ?? b.customer;
  return b.userPhone ?? u?.phone ?? u?.phoneNo ?? u?.phoneNumber ?? "";
};

const resolveSource = (b: FirebaseBooking) =>
  b.source ?? b.pickup ?? b.pickupLocation ?? b.pickupAddress ?? "—";

const resolveDest = (b: FirebaseBooking) =>
  b.destination ?? b.dropoff ?? b.dropLocation ?? b.dropAddress ?? "—";

const resolveAmount = (b: FirebaseBooking) =>
  b.totalAmount ?? b.amount ?? b.fare ?? b.price ?? 0;

const resolveDate = (b: FirebaseBooking) => b.pickupDate ?? b.date ?? "—";
const resolveTime = (b: FirebaseBooking) => b.pickupTime ?? b.time ?? "";
const resolveDistance = (b: FirebaseBooking) => b.totalDistance ?? b.distance ?? null;

// ─── Vehicle resolvers ────────────────────────────────────────────────────────
// The Firebase booking document does NOT store a vehicleId reference —
// only totalVehicles (count) and totalDistance are available.
const resolveVehicleCount = (b: FirebaseBooking) => b.totalVehicles ?? null;

// ─── Timestamp resolver ───────────────────────────────────────────────────────
function resolveTimestamp(ts: string | { _seconds: number; _nanoseconds: number } | undefined): string {
  if (!ts) return "—";
  if (typeof ts === "string") {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toLocaleString();
  }
  if (typeof ts === "object" && "_seconds" in ts) {
    return new Date(ts._seconds * 1000).toLocaleString();
  }
  return "—";
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function tripTypeLabel(t?: string) {
  if (!t) return "—";
  const k = t.toLowerCase().replace(/[_\s-]/g, "");
  if (k === "oneway") return "One Way";
  if (k === "roundtrip") return "Round Trip";
  if (k === "monthly") return "Monthly";
  return t;
}

function tripTypePill(t?: string) {
  const k = (t ?? "").toLowerCase().replace(/[_\s-]/g, "");
  const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  if (k === "oneway") return `${base} bg-blue-100 text-blue-700`;
  if (k === "roundtrip") return `${base} bg-purple-100 text-purple-700`;
  if (k === "monthly") return `${base} bg-emerald-100 text-emerald-700`;
  return `${base} bg-gray-100 text-gray-600`;
}

function statusConfig(s: string) {
  const k = s.toLowerCase();
  if (k === "approved") return { label: "Approved", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" };
  if (k === "pending") return { label: "Pending", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" };
  if (k === "cancelled" || k === "canceled") return { label: "Cancelled", color: "bg-red-100 text-red-700", dot: "bg-red-500" };
  if (k === "completed") return { label: "Completed", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" };
  return { label: s, color: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
}

function StatusPill({ status }: { status: string }) {
  const cfg = statusConfig(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function getInitials(name: string) {
  if (!name || name === "—") return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "bg-emerald-100 text-emerald-700",
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-teal-100 text-teal-700",
  ];
  const i = (name.charCodeAt(0) || 0) % colors.length;
  return colors[i];
}

// ─── Booking Detail Drawer (slides in from the right) ────────────────────────
function BookingDrawer({
  booking, open, onClose, onUpdateStatus, updatingId,
}: {
  booking: FirebaseBooking | null;
  open: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: FbStatus) => void;
  updatingId: string | null;
}) {
  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!booking) return null;

  const name = resolveName(booking);
  const email = resolveEmail(booking);
  const phone = resolvePhone(booking);
  const source = resolveSource(booking);
  const dest = resolveDest(booking);
  const amount = resolveAmount(booking);
  const date = resolveDate(booking);
  const time = resolveTime(booking);
  const distance = resolveDistance(booking);
  const status = booking.status?.toLowerCase() ?? "";
  const cfg = statusConfig(booking.status);
  const avColor = avatarColor(name);

  const drawer = (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes nt-backdrop-in  { from { opacity:0 } to { opacity:1 } }
        @keyframes nt-backdrop-out { from { opacity:1 } to { opacity:0 } }
        @keyframes nt-drawer-in    { from { transform:translateX(100%) } to { transform:translateX(0) } }
        @keyframes nt-drawer-out   { from { transform:translateX(0) } to { transform:translateX(100%) } }

        .nt-backdrop-in  { animation: nt-backdrop-in  340ms cubic-bezier(0.32,0.72,0,1) forwards; }
        .nt-backdrop-out { animation: nt-backdrop-out 340ms cubic-bezier(0.32,0.72,0,1) forwards; }
        .nt-drawer-in    { animation: nt-drawer-in    360ms cubic-bezier(0.32,0.72,0,1) forwards; }
        .nt-drawer-out   { animation: nt-drawer-out   360ms cubic-bezier(0.32,0.72,0,1) forwards; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        className={open ? "nt-backdrop-in" : "nt-backdrop-out"}
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          backgroundColor: "rgba(15,23,42,0.45)",
          backdropFilter: "blur(3px)",
        }}
      />

      {/* Drawer panel */}
      <div
        className={open ? "nt-drawer-in" : "nt-drawer-out"}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50,
          width: "100%", maxWidth: "440px",
          backgroundColor: "#fff",
          boxShadow: "-8px 0 48px rgba(0,0,0,0.18)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-[#0D2955] to-[#1a4080] px-5 pt-5 pb-6 flex-shrink-0">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Avatar + customer info */}
          <div className="flex items-center gap-3 pr-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${avColor}`}>
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{name}</h2>
              {email && <p className="text-xs text-blue-200 truncate">{email}</p>}
              {phone && <p className="text-xs text-blue-200">{phone}</p>}
            </div>
          </div>

          {/* Status + trip type */}
          <div className="flex items-center gap-2 mt-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            <span className={tripTypePill(booking.tripType)}>
              {tripTypeLabel(booking.tripType)}
            </span>
          </div>

          {/* Amount */}
          <div className="mt-3 bg-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-blue-200 text-xs">Total Amount</span>
            <span className="text-white text-xl font-bold">{amount.toLocaleString()}</span>
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Route */}
          <DrawerSection title="Route">
            <div className="flex items-start gap-3 px-4 py-3">
              {/* Timeline */}
              <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                <div className="w-px flex-1 min-h-[28px] bg-gray-200 my-1" />
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-100" />
              </div>
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Pickup</p>
                  <p className="text-sm text-gray-800 font-medium leading-snug">{source}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Destination</p>
                  <p className="text-sm text-gray-800 font-medium leading-snug">{dest}</p>
                </div>
              </div>
              {distance !== null && (
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-gray-400">Distance</p>
                  <p className="text-sm font-semibold text-gray-700">{Number(distance).toFixed(1)} km</p>
                </div>
              )}
            </div>
          </DrawerSection>

          {/* Schedule */}
          <DrawerSection title="Schedule">
            <div className="grid grid-cols-2 gap-2 p-3">
              <InfoCard icon={<Calendar className="w-3.5 h-3.5 text-blue-500" />} label="Pickup Date" value={date} />
              {time && <InfoCard icon={<Clock className="w-3.5 h-3.5 text-purple-500" />} label="Pickup Time" value={time} />}
              {booking.dropDate && <InfoCard icon={<Calendar className="w-3.5 h-3.5 text-blue-400" />} label="Drop Date" value={booking.dropDate} />}
              {booking.dropTime && <InfoCard icon={<Clock className="w-3.5 h-3.5 text-purple-400" />} label="Drop Time" value={booking.dropTime} />}
            </div>
          </DrawerSection>

          {/* Trip Summary — shown instead of vehicle details since Firebase bookings
               don't store a vehicle reference, only trip metrics */}
          <DrawerSection title="Trip Summary">
            <div className="grid grid-cols-2 gap-2 p-3">
              <InfoCard
                icon={<Car className="w-3.5 h-3.5 text-orange-500" />}
                label="No. of Vehicles"
                value={booking.totalVehicles != null ? String(booking.totalVehicles) : "1"}
              />
              {resolveDistance(booking) != null && (
                <InfoCard
                  icon={<MapPin className="w-3.5 h-3.5 text-emerald-500" />}
                  label="Total Distance"
                  value={`${Number(resolveDistance(booking)).toFixed(2)} km`}
                />
              )}
              {booking.workingDays != null && (
                <InfoCard
                  icon={<Layers className="w-3.5 h-3.5 text-teal-500" />}
                  label="Working Days"
                  value={String(booking.workingDays)}
                />
              )}
              <InfoCard
                icon={<Banknote className="w-3.5 h-3.5 text-emerald-600" />}
                label="Total Amount"
                value={`${resolveAmount(booking).toLocaleString()}`}
              />
            </div>
          </DrawerSection>

          {/* Payment */}
          {(booking.paymentMethod || booking.paymentStatus) && (
            <DrawerSection title="Payment">
              <div className="grid grid-cols-2 gap-2 p-3">
                {booking.paymentMethod && (
                  <InfoCard icon={<Banknote className="w-3.5 h-3.5 text-emerald-500" />} label="Method" value={booking.paymentMethod} />
                )}
                {booking.paymentStatus && (
                  <InfoCard icon={<Banknote className="w-3.5 h-3.5 text-blue-500" />} label="Status" value={booking.paymentStatus} />
                )}
              </div>
            </DrawerSection>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Notes</p>
              <p className="text-sm text-gray-700">{booking.notes}</p>
            </div>
          )}

          {/* Booking metadata */}
          <DrawerSection title="Booking Info">
            <div className="px-4 py-3 space-y-2">
              <MetaRow label="Booking ID" value={booking.id} mono />
              {booking.userId && <MetaRow label="User ID" value={booking.userId} mono />}
              {booking.createdAt && (
                <MetaRow label="Created" value={resolveTimestamp(booking.createdAt)} />
              )}
              {booking.updatedAt && (
                <MetaRow label="Updated" value={resolveTimestamp(booking.updatedAt)} />
              )}
            </div>
          </DrawerSection>
        </div>

        {/* ── Footer actions ───────────────────────────────────────────────── */}
        {(status === "Pending" || status === "Approved") && (() => {
          // Check if this is an auto-approved type (oneWay or roundTrip)
          const tripType = (booking.tripType as string)?.toLowerCase().replace(/[_\s-]/g, "");
          const isAutoApproved = tripType === "oneway" || tripType === "roundtrip";

          // Don't show manual approval buttons for auto-approved types
          if (status === "Pending" && isAutoApproved) {
            return (
              <div className="flex-shrink-0 px-5 py-4 border-t bg-gray-50">
                <div className="text-center text-sm text-gray-500 italic">
                  🚀 This {tripType === "oneway" ? "One Way" : "Round Trip"} ride is being auto-approved...
                </div>
              </div>
            );
          }

          return (
            <div className="flex-shrink-0 px-5 py-4 border-t bg-gray-50 flex gap-2">
              {status === "Pending" && (
                <>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl h-10 text-sm"
                    disabled={updatingId === booking.id}
                    onClick={() => { onUpdateStatus(booking.id, "Approved"); onClose(); }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 hover:bg-red-50 border-red-200 rounded-xl h-10 text-sm"
                    disabled={updatingId === booking.id}
                    onClick={() => { onUpdateStatus(booking.id, "Cancelled"); onClose(); }}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Decline
                  </Button>
                </>
              )}
              {status === "Approved" && (
                <Button
                  variant="outline"
                  className="flex-1 text-orange-600 hover:bg-orange-50 border-orange-200 rounded-xl h-10 text-sm"
                  disabled={updatingId === booking.id}
                  onClick={() => { onUpdateStatus(booking.id, "Cancelled"); onClose(); }}
                >
                  <XCircle className="w-4 h-4 mr-1.5" /> Cancel Booking
                </Button>
              )}
            </div>
          );
        })()}
      </div>
    </>
  );

  return createPortal(drawer, document.body);
}

// ─── Drawer section wrapper ───────────────────────────────────────────────────
function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
      </div>
      {children}
    </div>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────
function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-start gap-2.5 shadow-sm">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function MetaRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className={`text-xs text-gray-600 text-right break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Services() {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<FirebaseBooking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autoApproving, setAutoApproving] = useState(false);

  const { data: rawBookings = [], isLoading: loading, error, refetch } = useFirebaseBookings();
  const bookings = rawBookings as FirebaseBooking[];
  const updateBooking = useUpdateFirebaseBooking();

  // Manual auto-approve trigger
  const handleAutoApprove = async () => {
    setAutoApproving(true);
    try {
      const response = await api.post("/firebase/bookings/auto-approve", {});
      const result = response as { approvedCount: number; skippedCount: number; message: string };
      toast.success(`✅ ${result.message}`);
      refetch(); // Refresh the list
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Auto-approval failed");
    } finally {
      setAutoApproving(false);
    }
  };

  // Open drawer
  const openDrawer = (b: FirebaseBooking) => {
    setSelected(b);
    // tiny rAF so the element is mounted before the open class is applied
    requestAnimationFrame(() => setDrawerOpen(true));
  };

  // Close drawer — animate out first, then clear data
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setTimeout(() => setSelected(null), 380); // matches transition duration
  }, []);

  const updateStatus = async (id: string, status: FbStatus) => {
    setUpdatingId(id);
    try {
      await updateBooking.mutateAsync({ id, status });
      const label = status === "approved" ? "Approved" : status === "cancelled" ? "Cancelled" : status;
      toast.success(`Booking ${label.toLowerCase()} successfully`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const count = (s: string) => {
    return bookings.filter((b) => {
      const status = b.status?.toLowerCase() === s;
      // For "pending" count, exclude oneWay and roundTrip (they're auto-approved)
      if (s === "pending") {
        const tripType = (b.tripType as string)?.toLowerCase().replace(/[_\s-]/g, "");
        const isAutoApproved = tripType === "oneway" || tripType === "roundtrip";
        return status && !isAutoApproved;
      }
      return status;
    }).length;
  };

  const stats = [
    { title: "Total Bookings", value: bookings.length, icon: Car, color: "text-emerald-600", bgColor: "bg-emerald-50" },
    { title: "Pending", value: count("pending"), icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50" },
    { title: "Approved", value: count("approved"), icon: CheckCircle, color: "text-blue-600", bgColor: "bg-blue-50" },
    { title: "Completed", value: count("completed"), icon: MapPin, color: "text-purple-600", bgColor: "bg-purple-50" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Failed to load bookings: {error instanceof Error ? error.message : "Unknown error"}
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Drawer — always mounted so close animation plays */}
      <BookingDrawer
        booking={selected}
        open={drawerOpen}
        onClose={closeDrawer}
        onUpdateStatus={updateStatus}
        updatingId={updatingId}
      />

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={stat.title} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5 text-emerald-600" />
            All Bookings
            <span className="text-xs font-normal text-gray-400 ml-1">— click a row to view details</span>
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={handleAutoApprove}
              disabled={autoApproving}
              variant="outline"
              size="sm"
              className="gap-2 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            >
              {autoApproving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
                  Auto-approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" /> Auto-Approve Pending
                </>
              )}
            </Button>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No bookings found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Trip Type</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Pickup Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => {
                  const name = resolveName(b);
                  const email = resolveEmail(b);
                  const ac = avatarColor(name);
                  return (
                    <TableRow key={b.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => openDrawer(b)}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${ac}`}>
                            {getInitials(name)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{name}</p>
                            {email && <p className="text-xs text-gray-400">{email}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={tripTypePill(b.tripType)}>{tripTypeLabel(b.tripType)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3 flex-shrink-0 text-emerald-500" />
                          <span className="truncate max-w-[140px]">{resolveSource(b)}</span>
                          <ArrowRight className="w-3 h-3 flex-shrink-0 text-gray-400" />
                          <span className="truncate max-w-[140px]">{resolveDest(b)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-3.5 h-3.5" />
                          {resolveDate(b)}
                        </div>
                        {resolveTime(b) && (
                          <p className="text-xs text-gray-400 mt-0.5">{resolveTime(b)}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={b.status} />
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-800">
                        {resolveAmount(b).toLocaleString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {b.status?.toLowerCase() === "Pending" && (() => {
                            // Check if this is an auto-approved type
                            const tripType = (b.tripType as string)?.toLowerCase().replace(/[_\s-]/g, "");
                            const isAutoApproved = tripType === "oneway" || tripType === "roundtrip";

                            if (isAutoApproved) {
                              return (
                                <span className="text-xs text-gray-400 italic">Auto-approving...</span>
                              );
                            }

                            return (
                              <>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs px-2 h-7"
                                  disabled={updatingId === b.id}
                                  onClick={() => updateStatus(b.id, "Approved")}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline"
                                  className="text-red-600 hover:bg-red-50 text-xs px-2 h-7"
                                  disabled={updatingId === b.id}
                                  onClick={() => updateStatus(b.id, "Cancelled")}>
                                  Decline
                                </Button>
                              </>
                            );
                          })()}
                          {b.status?.toLowerCase() === "Approved" && (
                            <Button size="sm" variant="outline"
                              className="text-orange-600 hover:bg-orange-50 text-xs px-2 h-7"
                              disabled={updatingId === b.id}
                              onClick={() => updateStatus(b.id, "Cancelled")}>
                              Cancel
                            </Button>
                          )}
                          {(b.status?.toLowerCase() === "Cancelled" ||
                            b.status?.toLowerCase() === "Completed") && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
