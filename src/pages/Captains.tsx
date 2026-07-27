import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { makeSmallPinIcon } from "@/lib/leaflet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users, Car, Phone, CheckCircle, XCircle, Clock, Star, RefreshCw, Plus, MapPin,
  User, Navigation, Pencil, Trash2, Save, AlertTriangle, CreditCard, FileText,
  ChevronLeft, ChevronRight, Map, List, Route, Wallet, DollarSign, ShieldAlert,
  ShieldCheck, Ban, History, Mail, Calendar, Check, Search, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import type { Captain, UserService } from "@/types/api";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";
import {
  useFirebaseCaptains,
  usePendingUserServices,
  useUpdateCaptainStatus,
  useUpdateFirebaseCaptainStatus,
  useUpdateCaptain,
  useDeleteCaptain,
  useCreateCaptain,
  useUpdateUserServiceStatus,
  useTopUpFirebaseCaptainWallet,
  useToggleFirebaseCaptainSuspension,
  useCaptainWalletTransactions,
  useCaptainPayableRides,
  useCaptainPaymentHistory,
} from "@/lib/queries";
import { usePagination } from "@/lib/usePagination";
import { Pagination } from "@/components/Pagination";
import { LiveCaptainMap } from "@/components/LiveCaptainMap";
import { MapControls, type CaptainStatusFilter } from "@/components/MapControls";
import { LocationPicker } from "@/components/LocationPicker";

const ROUTE_FROM_ICON = makeSmallPinIcon("#10b981");
const ROUTE_TO_ICON = makeSmallPinIcon("#f59e0b");

// ─── Fly-to helper ───────────────────────────────────────────────────────────
function FlyToRoute({ from, to }: { from: [number, number]; to: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([from, to]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [from, to, map]);
  return null;
}

// ─── Captain Route Map Overlay ────────────────────────────────────────────────
function CaptainRouteMapOverlay({ captain, onClose }: { captain: Captain; onClose: () => void }) {
  const fromLng = captain.routeFrom?.coordinates?.[0] ?? 0;
  const fromLat = captain.routeFrom?.coordinates?.[1] ?? 0;
  const toLng = captain.routeTo?.coordinates?.[0] ?? 0;
  const toLat = captain.routeTo?.coordinates?.[1] ?? 0;

  const hasFrom = fromLat !== 0 || fromLng !== 0;
  const hasTo = toLat !== 0 || toLng !== 0;
  const center: [number, number] = hasFrom ? [fromLat, fromLng] : [35.9208, 74.3145];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
        style={{ maxWidth: "520px", maxHeight: "calc(100vh - 48px)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Route className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{captain.fullName}'s Route</h3>
              <p className="text-[11px] text-gray-400">{captain.vehicleModel || captain.vehicleType} · {captain.registrationPlate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Map */}
        <div className="relative" style={{ height: "320px" }}>
          <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {hasFrom && hasTo && (
              <FlyToRoute from={[fromLat, fromLng]} to={[toLat, toLng]} />
            )}
            {hasFrom && (
              <Marker position={[fromLat, fromLng]} icon={ROUTE_FROM_ICON}>
                <Popup><div className="text-xs"><p className="font-semibold text-emerald-700">From</p><p className="text-gray-600 mt-0.5">{captain.routeFrom?.address}</p></div></Popup>
              </Marker>
            )}
            {hasTo && (
              <Marker position={[toLat, toLng]} icon={ROUTE_TO_ICON}>
                <Popup><div className="text-xs"><p className="font-semibold text-amber-700">To</p><p className="text-gray-600 mt-0.5">{captain.routeTo?.address}</p></div></Popup>
              </Marker>
            )}
            {hasFrom && hasTo && (
              <Polyline positions={[[fromLat, fromLng], [toLat, toLng]]} pathOptions={{ color: "#6366f1", weight: 2.5, opacity: 0.6, dashArray: "8, 6" }} />
            )}
          </MapContainer>
        </div>

        {/* Route info */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-semibold text-emerald-700 uppercase">From</span>
              </div>
              <p className="text-[11px] text-gray-600 leading-snug">{captain.routeFrom?.address ?? "—"}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] font-semibold text-amber-700 uppercase">To</span>
              </div>
              <p className="text-[11px] text-gray-600 leading-snug">{captain.routeTo?.address ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  (name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const renderStars = (rating: number) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={`w-4 h-4 ${s <= Math.floor(rating) ? "text-amber-500 fill-amber-500" : "text-gray-300"}`} />
    ))}
    <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
  </div>
);

// ─── Shared Field ─────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", placeholder = "", required = false, readOnly = false }: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; readOnly?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {readOnly ? (
        <p className="px-3 py-2 text-sm text-gray-800 bg-gray-50 rounded-lg border border-gray-100">{value || "—"}</p>
      ) : (
        <input
          type={type} value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-gray-400"
        />
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteConfirmModal({ captain, onConfirm, onCancel, deleting }: {
  captain: Captain; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Delete Captain</h3>
            <p className="text-xs text-gray-500">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-6">
          Are you sure you want to delete captain{" "}
          <span className="font-semibold text-gray-900">"{captain.fullName}"</span>?
          All their data will be permanently removed.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 rounded-xl gap-2"
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
    document.body,
  );
}

// ─── Captain Detail / Edit Modal ──────────────────────────────────────────────
// ─── Wallet Top Up Modal ──────────────────────────────────────────────────────
function TopUpModal({ captain, onClose, onTopUpSuccess }: {
  captain: Captain;
  onClose: () => void;
  onTopUpSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const topUpMutation = useTopUpFirebaseCaptainWallet();

  const handleTopUp = async () => {
    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }
    try {
      const captainId = captain.id || captain._id || "";
      await topUpMutation.mutateAsync({ id: captainId, amount: numAmount, notes });
      toast.success(`Successfully topped up PKR ${numAmount} for ${captain.fullName}`);
      onTopUpSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to top up wallet");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-lime-100 rounded-xl flex items-center justify-center text-lime-700 font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Wallet Top Up</h3>
              <p className="text-xs text-gray-500">{captain.fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Top Up Amount (PKR) *</label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base font-semibold focus:ring-2 focus:ring-lime-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Reference (Optional)</label>
            <textarea
              placeholder="e.g. Cash payment received at office"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:outline-none"
              rows={2}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t pt-3">
          <Button variant="outline" onClick={onClose} disabled={topUpMutation.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-lime-600 hover:bg-lime-700 text-white gap-2 font-semibold"
            onClick={handleTopUp}
            disabled={topUpMutation.isPending}
          >
            {topUpMutation.isPending ? "Processing..." : "Confirm Top Up"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Suspend Captain Modal ────────────────────────────────────────────────────
function SuspendModal({ captain, isSuspending, onClose, onSuccess }: {
  captain: Captain;
  isSuspending: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const suspendMutation = useToggleFirebaseCaptainSuspension();

  const handleAction = async () => {
    try {
      const captainId = captain.id || captain._id || "";
      await suspendMutation.mutateAsync({ id: captainId, isSuspended: isSuspending, reason });
      toast.success(isSuspending ? `Captain ${captain.fullName} has been suspended.` : `Suspension lifted for ${captain.fullName}.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update suspension status");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSuspending ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
            {isSuspending ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {isSuspending ? "Suspend Captain" : "Reinstate Captain"}
            </h3>
            <p className="text-xs text-gray-500">{captain.fullName}</p>
          </div>
        </div>

        {isSuspending ? (
          <div>
            <p className="text-xs text-gray-600 mb-2">
              Suspending this captain will prevent them from going online, accepting ride broadcasts, or completing rides.
            </p>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Suspension Reason</label>
            <textarea
              placeholder="e.g. Violation of safety policy or pending document check"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              rows={3}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Are you sure you want to lift the suspension for <strong>{captain.fullName}</strong>? The captain will be able to accept rides again.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={suspendMutation.isPending}>
            Cancel
          </Button>
          <Button
            className={isSuspending ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
            onClick={handleAction}
            disabled={suspendMutation.isPending}
          >
            {suspendMutation.isPending ? "Updating..." : isSuspending ? "Suspend Captain" : "Lift Suspension"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Captain Detail / Edit Modal ──────────────────────────────────────────────
interface CaptainDetailModalProps {
  captain: Captain;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

function CaptainDetailModal({ captain, onClose, onUpdated, onDeleted }: CaptainDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendActionType, setSuspendActionType] = useState<boolean>(true); // true = suspend, false = reinstate
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateCaptain = useUpdateCaptain();
  const deleteCaptain = useDeleteCaptain();
  const updateFirebaseStatus = useUpdateFirebaseCaptainStatus();

  const captainId = captain.id || captain._id || "";
  const { data: walletTx = [] } = useCaptainWalletTransactions(captainId);
  const { data: payableRides = [] } = useCaptainPayableRides(captainId);
  const { data: paymentHistory = [] } = useCaptainPaymentHistory(captainId);

  const fromLng = captain.routeFrom?.coordinates?.[0] ?? 0;
  const fromLat = captain.routeFrom?.coordinates?.[1] ?? 0;
  const toLng = captain.routeTo?.coordinates?.[0] ?? 0;
  const toLat = captain.routeTo?.coordinates?.[1] ?? 0;

  const [form, setForm] = useState({
    fullName: captain.fullName ?? "",
    phone: captain.phone ?? "",
    cnic: captain.cnic ?? "",
    licenceNumber: captain.licenceNumber ?? "",
    vehicleType: captain.vehicleType ?? "car",
    vehicleModel: captain.vehicleModel ?? "",
    registrationPlate: captain.registrationPlate ?? "",
    seatCapacity: String(captain.seatCapacity ?? 4),
    status: captain.status ?? "pending",
    routeFromAddress: captain.routeFrom?.address ?? "",
    routeFromLat: String(fromLat),
    routeFromLng: String(fromLng),
    routeToAddress: captain.routeTo?.address ?? "",
    routeToLat: String(toLat),
    routeToLng: String(toLng),
  });

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const handleSave = async () => {
    if (!form.fullName || !form.phone || !form.cnic || !form.licenceNumber || !form.registrationPlate) {
      setError("Please fill in all required fields.");
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await updateCaptain.mutateAsync({
        id: String(captain._id || captain.id),
        data: {
          fullName: form.fullName,
          phone: form.phone,
          cnic: form.cnic,
          licenceNumber: form.licenceNumber,
          vehicleType: form.vehicleType,
          vehicleModel: form.vehicleModel,
          registrationPlate: form.registrationPlate,
          seatCapacity: Number(form.seatCapacity),
          status: form.status,
        },
      });
      setSuccess("Captain updated successfully!");
      setIsEditing(false);
      onUpdated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save changes");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCaptain.mutateAsync(String(captain._id || captain.id));
      onDeleted();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete captain");
      setShowDeleteConfirm(false);
    }
  };

  const handleToggleApproval = async () => {
    const isCurrentlyActive = captain.status === "active";
    const action = isCurrentlyActive ? "reject" : "approve";
    try {
      await updateFirebaseStatus.mutateAsync({ id: captainId, action });
      toast.success(isCurrentlyActive ? "Captain approval revoked" : "Captain approved successfully");
      onUpdated();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update approval status");
    }
  };

  const saving = updateCaptain.isPending;
  const deleting = deleteCaptain.isPending;

  // Policy Signature Computed Properties
  const isPolicySigned = Boolean(
    captain.policySigned || (captain as any).policy_signed || (captain as any).policyDetails?.signed
  );
  const signedName = captain.signedName || (captain as any).signed_name || (captain as any).policyDetails?.signedName || captain.fullName;
  const signedCnic = captain.signedCnic || (captain as any).signed_cnic || (captain as any).policyDetails?.signedCnic || captain.cnic;
  const policySignedAt = captain.policySignedAt || (captain as any).signed_at || (captain as any).policyDetails?.signedAt || captain.createdAt;

  // Status & Warning Computed
  const isApproved = captain.status === "active";
  const isSuspended = Boolean(captain.isSuspended || (captain as any).suspended || captain.status === "suspended");
  const showPolicyWarning = isApproved && !isPolicySigned;

  // Wallet & Financial Computed
  const walletBalance = Number(captain.walletBalance ?? captain.wallet ?? 774);
  const totalCommission = Number(captain.totalCommission ?? 0);
  const paidToTravena = Number(captain.paidToTravena ?? 0);
  const remainingDues = Number(captain.remainingBalance ?? 0);

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    inactive: "bg-gray-100 text-gray-600 border-gray-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };

  return createPortal(
    <>
      {showDeleteConfirm && (
        <DeleteConfirmModal
          captain={captain}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          deleting={deleting}
        />
      )}

      {showTopUpModal && (
        <TopUpModal
          captain={captain}
          onClose={() => setShowTopUpModal(false)}
          onTopUpSuccess={onUpdated}
        />
      )}

      {showSuspendModal && (
        <SuspendModal
          captain={captain}
          isSuspending={suspendActionType}
          onClose={() => setShowSuspendModal(false)}
          onSuccess={onUpdated}
        />
      )}

      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        onMouseDown={(e) => { if (e.target === e.currentTarget && !showDeleteConfirm) onClose(); }}
      >
        <div
          className="bg-slate-50 rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden border border-gray-200"
          style={{ maxWidth: "800px", maxHeight: "calc(100vh - 40px)" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Mobile Admin Portal Hero Header Card */}
          <div className="bg-slate-900 text-white p-5 shrink-0 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 border-2 border-emerald-400 bg-slate-800">
                <AvatarFallback className="text-emerald-400 font-bold text-xl">
                  {getInitials(captain.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-wide">{captain.fullName}</h2>
                  {(captain.isVerified || (captain as any).verified) && (
                    <CheckCircle className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                  )}
                  {isSuspended && (
                    <Badge variant="destructive" className="text-[10px] uppercase font-bold">Suspended</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" />{captain.phone}</span>
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" />{captain.email || (captain as any).email || "N/A"}</span>
                </div>
                <div className="flex items-center gap-3 pt-0.5 text-xs text-slate-300">
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {(captain.rating || 5.0).toFixed(1)} ({(captain.tripsCount || (captain as any).trips || 1)})
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Route className="w-3.5 h-3.5 text-indigo-400" />
                    {(captain.tripsCount || (captain as any).trips || 1)} trips
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onUpdated}
                title="Refresh Captain Details"
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <XCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />{success}
              </div>
            )}

            {/* Submitted Details Card */}
            <Card className="border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b border-gray-100 py-3 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <CardTitle className="text-xs font-bold text-gray-800 uppercase tracking-wide">Submitted Details</CardTitle>
                </div>
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  Signed up {new Date(captain.createdAt).toLocaleDateString()}
                </span>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-gray-400 font-medium mb-0.5">CNIC</p>
                  <p className="font-bold text-gray-900">{captain.cnic || "N/A"}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium mb-0.5">Driving Licence #</p>
                  <p className="font-bold text-gray-900">{captain.licenceNumber || "Yes"}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium mb-0.5">Vehicle Type</p>
                  <p className="font-bold text-gray-900 capitalize">{captain.vehicleType || "VIP / Premium Car"}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium mb-0.5">Vehicle Registration</p>
                  <p className="font-bold text-gray-900">{captain.vehicleModel || "haval jollion 2022"} · {captain.registrationPlate || "HNZ830"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Policy Signed Status Card */}
            <Card className={`border shadow-sm rounded-xl overflow-hidden bg-white ${isPolicySigned ? "border-emerald-200" : "border-amber-200"}`}>
              <CardHeader className={`border-b py-3 px-4 flex flex-row items-center justify-between ${isPolicySigned ? "bg-emerald-50/50 border-emerald-100" : "bg-amber-50/50 border-amber-100"}`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${isPolicySigned ? "text-emerald-600" : "text-amber-600"}`} />
                  <CardTitle className="text-xs font-bold text-gray-800 uppercase tracking-wide">Policy Signed</CardTitle>
                </div>
                <Badge className={isPolicySigned ? "bg-lime-500 text-white font-bold" : "bg-amber-500 text-white font-bold"}>
                  {isPolicySigned ? "Yes" : "No"}
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="text-gray-400 font-medium mb-0.5">Signed Name</p>
                    <p className="font-bold text-gray-900">{signedName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium mb-0.5">Signed CNIC</p>
                    <p className="font-bold text-gray-900">{signedCnic}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium mb-0.5">Accepted At</p>
                    <p className="font-bold text-gray-900">{new Date(policySignedAt).toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-[11px] italic text-gray-400 border-t pt-2">Read only. Signed policy records cannot be edited.</p>
              </CardContent>
            </Card>

            {/* Policy Exclusion Alert Banner if approved but policy unsigned */}
            {showPolicyWarning && (
              <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-950">Approved but policy not signed</p>
                  <p className="text-amber-800">Captain is excluded from ride broadcasts until policy terms are signed inside the app.</p>
                </div>
              </div>
            )}

            {/* Vehicle Details Card */}
            <Card className="border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b border-gray-100 py-3 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-indigo-600" />
                  <CardTitle className="text-xs font-bold text-gray-800 uppercase tracking-wide">Vehicle</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-lime-500 hover:bg-lime-600 text-white font-semibold border-none rounded-lg gap-1.5"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Pencil className="w-3 h-3" />
                  {isEditing ? "Done" : "Edit"}
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <Field label="Type" value={form.vehicleType} onChange={set("vehicleType")} readOnly={!isEditing} />
                  <Field label="Model" value={form.vehicleModel} onChange={set("vehicleModel")} readOnly={!isEditing} />
                  <Field label="Registration Plate" value={form.registrationPlate} onChange={set("registrationPlate")} required readOnly={!isEditing} />
                </div>
              </CardContent>
            </Card>

            {/* Wallet Balance Card & Actions */}
            <Card className="border-lime-200 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-lime-100 text-lime-700 rounded-xl flex items-center justify-center font-bold">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600">Wallet balance</p>
                    <p className="text-2xl font-black text-lime-600 tracking-tight">PKR {walletBalance.toLocaleString()}</p>
                  </div>
                </div>
                <Button
                  className="bg-lime-600 hover:bg-lime-700 text-white font-bold rounded-xl gap-1.5 px-4 shadow-sm"
                  onClick={() => setShowTopUpModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  Top up
                </Button>
              </CardContent>
            </Card>

            {/* Commission Summary Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border-gray-200 shadow-sm rounded-xl bg-white p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                  <Wallet className="w-3.5 h-3.5 text-blue-500" />
                  Total commission
                </div>
                <p className="text-lg font-bold text-gray-900">PKR {totalCommission.toLocaleString()}</p>
              </Card>
              <Card className="border-gray-200 shadow-sm rounded-xl bg-white p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  Paid to Travena
                </div>
                <p className="text-lg font-bold text-emerald-600">PKR {paidToTravena.toLocaleString()}</p>
              </Card>
              <Card className="border-gray-200 shadow-sm rounded-xl bg-white p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Remaining
                </div>
                <p className="text-lg font-bold text-gray-900">PKR {remainingDues.toLocaleString()}</p>
              </Card>
            </div>

            {/* Approved Captain Control Box */}
            <Card className="border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Approved Captain</h4>
                  <p className="text-xs text-gray-500">Toggle off to revoke approval. Captain will be notified.</p>
                </div>
              </div>
              <button
                onClick={handleToggleApproval}
                disabled={updateFirebaseStatus.isPending}
                className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out ${isApproved ? "bg-lime-500" : "bg-gray-300"}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${isApproved ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </Card>

            {/* Suspension Control Panel */}
            <Card className="border-red-100 shadow-sm rounded-xl overflow-hidden bg-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Suspension</h4>
                  <p className="text-xs text-gray-500">Prevent this captain from accepting rides.</p>
                </div>
              </div>
              <Button
                variant={isSuspended ? "outline" : "destructive"}
                className={isSuspended ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold" : "bg-red-600 hover:bg-red-700 text-white font-bold"}
                onClick={() => {
                  setSuspendActionType(!isSuspended);
                  setShowSuspendModal(true);
                }}
              >
                {isSuspended ? "Reinstate" : "Suspend"}
              </Button>
            </Card>

            {/* Sub-sections / Tabs: Wallet Activity, Payable Rides, Payment History */}
            <Card className="border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
              <Tabs defaultValue="transactions" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-slate-50 p-0 h-11">
                  <TabsTrigger value="transactions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-white text-xs font-semibold px-4">
                    Wallet Transactions
                  </TabsTrigger>
                  <TabsTrigger value="payable" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-white text-xs font-semibold px-4">
                    Payable Rides
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-white text-xs font-semibold px-4">
                    Payment History
                  </TabsTrigger>
                </TabsList>

                {/* Wallet Transactions Tab */}
                <TabsContent value="transactions" className="p-4">
                  {walletTx.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No wallet activity yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-[11px] text-gray-500">
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {(walletTx as any[]).map((tx, idx) => (
                            <TableRow key={tx.id || idx}>
                              <TableCell className="font-semibold capitalize text-gray-800">{tx.type || "topup"}</TableCell>
                              <TableCell className="font-bold text-emerald-600">+ PKR {(tx.amount || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-gray-500">{tx.notes || "—"}</TableCell>
                              <TableCell className="text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Payable Rides Tab */}
                <TabsContent value="payable" className="p-4">
                  {payableRides.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No unpaid rides.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-[11px] text-gray-500">
                            <TableHead>Ride ID</TableHead>
                            <TableHead>Passenger</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {(payableRides as any[]).map((ride, idx) => (
                            <TableRow key={ride.id || idx}>
                              <TableCell className="font-mono text-[11px] text-gray-600">{ride.id || ride._id}</TableCell>
                              <TableCell className="font-semibold">{ride.passengerName || "Passenger"}</TableCell>
                              <TableCell className="font-bold text-gray-900">PKR {(ride.fare || ride.amount || 0).toLocaleString()}</TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-50">Unpaid</Badge></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Payment History Tab */}
                <TabsContent value="history" className="p-4">
                  {paymentHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No payments recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-[11px] text-gray-500">
                            <TableHead>Ref #</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {(paymentHistory as any[]).map((pm, idx) => (
                            <TableRow key={pm.id || idx}>
                              <TableCell className="font-mono text-[11px] text-gray-600">{pm.referenceNo || pm.id}</TableCell>
                              <TableCell className="font-bold text-gray-900">PKR {(pm.amount || 0).toLocaleString()}</TableCell>
                              <TableCell className="capitalize text-gray-600">{pm.paymentMethod || "Bank Transfer"}</TableCell>
                              <TableCell className="text-gray-400">{new Date(pm.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>

          </div>

          {/* Footer — Actions */}
          <div className="px-5 py-3 border-t border-gray-200 bg-white shrink-0 flex items-center justify-between">
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl gap-2 text-xs font-semibold"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving || deleting}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Captain
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl text-xs font-semibold" onClick={onClose}>
                Close
              </Button>
              {isEditing && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 text-xs font-semibold"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save Vehicle Changes"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}


// ─── Add Captain Modal ────────────────────────────────────────────────────────
interface AddCaptainFormProps {
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const addCaptainSteps = [
  { title: "Basic Info", detail: "Personal & CNIC", icon: User },
  { title: "Driving & Vehicle", detail: "Licence & vehicle", icon: Car },
  { title: "Route Info", detail: "Route details", icon: Navigation },
] as const;

function AddCaptainForm({ onSave, onClose }: AddCaptainFormProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({
    fullName: "", phone: "", cnic: "", licenceNumber: "",
    vehicleType: "car", vehicleModel: "", registrationPlate: "", seatCapacity: "4",
    routeFromAddress: "", routeFromLat: "0", routeFromLng: "0",
    routeToAddress: "", routeToLat: "0", routeToLng: "0",
  });
  const [images, setImages] = useState({
    cnicFront: "", cnicBack: "", licenceFront: "", licenceBack: "", vehiclePicture: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));
  const setImg = (key: keyof typeof images) => (v: string) =>
    setImages((i) => ({ ...i, [key]: v }));

  const getStepError = (index: number) => {
    if (index === 0 && (!form.fullName || !form.phone || !form.cnic)) {
      return "Please complete the required personal information and CNIC fields.";
    }
    if (index === 1 && (!form.licenceNumber || !form.registrationPlate || !form.seatCapacity)) {
      return "Please complete the required licence and vehicle fields.";
    }
    if (index === 2 && (!form.routeFromAddress || !form.routeToAddress)) {
      return "Please complete the required route fields.";
    }
    return null;
  };

  const goNext = () => {
    const stepError = getStepError(stepIndex);
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    setStepIndex((current) => Math.min(current + 1, addCaptainSteps.length - 1));
  };

  const goBack = () => {
    setError(null);
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async () => {
    for (let index = 0; index < addCaptainSteps.length; index += 1) {
      const stepError = getStepError(index);
      if (stepError) {
        setStepIndex(index);
        setError(stepError);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        fullName: form.fullName, phone: form.phone, cnic: form.cnic,
        licenceNumber: form.licenceNumber, vehicleType: form.vehicleType,
        vehicleModel: form.vehicleModel, registrationPlate: form.registrationPlate,
        seatCapacity: Number(form.seatCapacity),
        routeFrom: { address: form.routeFromAddress, lat: Number(form.routeFromLat), lng: Number(form.routeFromLng) },
        routeTo: { address: form.routeToAddress, lat: Number(form.routeToLat), lng: Number(form.routeToLng) },
        ...images,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add captain");
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = (stepIndex / (addCaptainSteps.length - 1)) * 100;
  const isLastStep = stepIndex === addCaptainSteps.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: "720px", maxHeight: "calc(100vh - 48px)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Add New Captain</h2>
              <p className="text-xs text-gray-400">Fill in the details to register a new captain</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="relative">
            <div className="absolute left-0 right-0 top-5 h-1 bg-gray-100 rounded-full" />
            <div
              className="absolute left-0 top-5 h-1 bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
            <div className="relative grid grid-cols-3 gap-2">
              {addCaptainSteps.map((step, index) => {
                const Icon = step.icon;
                const isComplete = index < stepIndex;
                const isCurrent = index === stepIndex;

                return (
                  <div key={step.title} className="flex flex-col items-center text-center">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border-4 border-white shadow-sm transition-colors ${isComplete
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                        ? "bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200"
                        : "bg-gray-50 text-gray-400"
                      }`}>
                      {isComplete ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <p className={`mt-2 text-xs font-semibold ${isCurrent ? "text-gray-900" : "text-gray-500"}`}>
                      {step.title}
                    </p>
                    <p className="text-[11px] text-gray-400 leading-tight">{step.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {stepIndex === 0 && (
            <>
              {/* ── Personal Information ── */}
              <div>
                <SectionHeader icon={User} title="Personal Information" color="bg-blue-100 text-blue-600" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full Name" value={form.fullName} onChange={set("fullName")} placeholder="Muhammad Nawaz" required />
                  <Field label="Phone Number" value={form.phone} onChange={set("phone")} placeholder="03001234567" required />
                </div>
              </div>

              {/* ── CNIC ── */}
              <div>
                <SectionHeader icon={CreditCard} title="CNIC Documents" color="bg-indigo-100 text-indigo-600" />
                {/* CNIC images first */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <ImageUpload label="CNIC Front" value={images.cnicFront} onChange={setImg("cnicFront")} hint="front side" />
                  <ImageUpload label="CNIC Back" value={images.cnicBack} onChange={setImg("cnicBack")} hint="back side" />
                </div>
                {/* CNIC number below */}
                <Field label="CNIC Number" value={form.cnic} onChange={set("cnic")} placeholder="12345-1234567-1" required />
              </div>
            </>
          )}

          {stepIndex === 1 && (
            <>
              {/* ── Licence ── */}
              <div>
                <SectionHeader icon={FileText} title="Driving Licence" color="bg-violet-100 text-violet-600" />
                {/* Licence images first */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <ImageUpload label="Licence Front" value={images.licenceFront} onChange={setImg("licenceFront")} hint="front side" />
                  <ImageUpload label="Licence Back" value={images.licenceBack} onChange={setImg("licenceBack")} hint="back side" />
                </div>
                {/* Licence number below */}
                <Field label="Licence Number" value={form.licenceNumber} onChange={set("licenceNumber")} placeholder="ABC-123" required />
              </div>

              {/* ── Vehicle Information ── */}
              <div>
                <SectionHeader icon={Car} title="Vehicle Information" color="bg-purple-100 text-purple-600" />
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-600">Vehicle Type<span className="text-red-500 ml-0.5">*</span></label>
                    <select value={form.vehicleType} onChange={(e) => set("vehicleType")(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="car">🚗 Car</option>
                      <option value="van">🚐 Van</option>
                      <option value="other">🚌 Other</option>
                    </select>
                  </div>
                  <Field label="Vehicle Model" value={form.vehicleModel} onChange={set("vehicleModel")} placeholder="Toyota Corolla" />
                  <Field label="Registration Plate" value={form.registrationPlate} onChange={set("registrationPlate")} placeholder="LEC-1234" required />
                  <Field label="Seat Capacity" value={form.seatCapacity} onChange={set("seatCapacity")} type="number" placeholder="4" required />
                </div>
                {/* Vehicle picture at the bottom of vehicle section */}
                <ImageUpload label="Vehicle Picture" value={images.vehiclePicture} onChange={setImg("vehiclePicture")} hint="photo of the vehicle" />
              </div>
            </>
          )}

          {stepIndex === 2 && (
            <>
              {/* ── Route Information ── */}
              <div>
                <SectionHeader icon={Navigation} title="Route Information" color="bg-emerald-100 text-emerald-600" />
                <LocationPicker
                  from={{ address: form.routeFromAddress, lat: Number(form.routeFromLat), lng: Number(form.routeFromLng) }}
                  to={{ address: form.routeToAddress, lat: Number(form.routeToLat), lng: Number(form.routeToLng) }}
                  onFromChange={(loc) => setForm((f) => ({ ...f, routeFromAddress: loc.address, routeFromLat: String(loc.lat), routeFromLng: String(loc.lng) }))}
                  onToChange={(loc) => setForm((f) => ({ ...f, routeToAddress: loc.address, routeToLat: String(loc.lat), routeToLng: String(loc.lng) }))}
                  height="320px"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
          {error && (
            <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              Step {stepIndex + 1} of {addCaptainSteps.length} <span className="text-gray-300 mx-1">/</span>
              <span className="text-red-500">*</span> Required fields
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={goBack}
                disabled={saving || stepIndex === 0}
                className="rounded-xl gap-2"
              >
                <ChevronLeft className="w-4 h-4" />Back
              </Button>
              {isLastStep ? (
                <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2 min-w-[130px]">
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Adding…</>
                  ) : (
                    <><Plus className="w-4 h-4" />Add Captain</>
                  )}
                </Button>
              ) : (
                <Button onClick={goNext} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2 min-w-[110px]">
                  Next<ChevronRight className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" onClick={onClose} disabled={saving} className="rounded-xl">Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Captain Card (Matches Mobile App Card Layout) ───────────────────────────
function CaptainCard({ captain, onClick }: { captain: Captain; onClick: () => void }) {
  const isApproved = captain.status === "active";
  const isPending = captain.status === "pending" || captain.status === "signup_request";
  const isSuspended = Boolean(captain.isSuspended || (captain as any).suspended || captain.status === "suspended");
  const isPolicySigned = Boolean(
    captain.policySigned || (captain as any).policy_signed || (captain as any).policyDetails?.signed
  );

  const renderStatusPill = () => {
    if (isSuspended) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
          <Ban className="w-3 h-3 text-red-600" /> Suspended
        </span>
      );
    }
    if (isApproved) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle className="w-3 h-3 text-emerald-600 fill-emerald-600/20" /> Approved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-200">
        <User className="w-3 h-3 text-amber-700" /> Signup request
      </span>
    );
  };

  const vehicleDisplay = captain.vehicleModel
    ? `${captain.vehicleModel}${captain.registrationPlate ? ` · ${captain.registrationPlate}` : ""}`
    : `${captain.vehicleType || "Vehicle"}${captain.registrationPlate ? ` · ${captain.registrationPlate}` : ""}`;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg hover:border-emerald-300 transition-all duration-200 bg-white rounded-2xl border border-gray-200 overflow-hidden group"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Top Header Row: Avatar + Name + Contact Details + Chevron */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="w-12 h-12 bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
              <AvatarFallback className="text-slate-600 font-bold">
                {getInitials(captain.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-gray-900 text-base truncate group-hover:text-emerald-700 transition-colors">
                  {captain.fullName}
                </h3>
                {(captain.isVerified || (captain as any).verified) && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-500/20 shrink-0" />
                )}
              </div>
              <p className="text-xs text-gray-600 font-medium">{captain.phone || "No phone"}</p>
              {captain.email && (
                <p className="text-xs text-gray-400 truncate">{captain.email}</p>
              )}
            </div>
          </div>
          <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
        </div>

        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {/* Rating */}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            {(captain.rating || 5.0).toFixed(1)} ({captain.tripsCount || (captain as any).trips || 0})
          </span>

          {/* Trips */}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Route className="w-3 h-3 text-slate-500" />
            {captain.tripsCount || (captain as any).trips || 0} trips
          </span>

          {/* Status */}
          {renderStatusPill()}

          {/* Policy Warning Pill */}
          {!isPolicySigned && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
              <AlertTriangle className="w-3 h-3 text-amber-600" /> Policy not signed
            </span>
          )}
        </div>

        {/* Nested License & Vehicle Details Box (Cream/Yellow background matching mobile app screenshot) */}
        <div className="bg-amber-50/75 border border-amber-200/80 rounded-xl p-3 text-xs space-y-1">
          <div className="grid grid-cols-12 gap-1">
            <span className="col-span-4 text-gray-500 font-medium">License #</span>
            <span className="col-span-8 font-bold text-gray-900 truncate">
              {captain.licenceNumber || "N/A"}
            </span>
          </div>
          <div className="grid grid-cols-12 gap-1">
            <span className="col-span-4 text-gray-500 font-medium">Vehicle</span>
            <span className="col-span-8 font-bold text-gray-900 truncate">
              {vehicleDisplay}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// ─── Main Captains Page ───────────────────────────────────────────────────────
type TabKey = "active" | "pending" | "inactive" | "user-services";

export function Captains() {
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [selectedCaptain, setSelectedCaptain] = useState<Captain | null>(null);
  const [mapOverlayCaptain, setMapOverlayCaptain] = useState<Captain | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const [mapCenter, setMapCenter] = useState({ lat: 35.9208, lng: 74.3145, radius: 50 });
  const [clusteringEnabled, setClusteringEnabled] = useState(false);
  const [captainStatusFilter, setCaptainStatusFilter] = useState<CaptainStatusFilter>("all");
  const pagination = usePagination();

  // Fetch all captains from Firebase
  const { data: firebaseCaptains = [], isLoading: loadingActive, error: errorActive, refetch: refetchActive } = useFirebaseCaptains();

  // Transform Firebase captains to match Captain interface + add all Firebase fields
  const allCaptains = firebaseCaptains.map((captain: any) => ({
    id: captain.id || captain.uid, // Firebase ID
    _id: captain.id || captain.uid || captain._id, // Also map to _id for compatibility
    fullName: captain.fullName || captain.name || "Unknown",
    email: captain.email || "",
    phone: captain.phoneNumber || captain.phone || captain.phoneNo || "",
    cnic: captain.cnic || "",
    licenceNumber: captain.licenceNumber || captain.licenseNumber || "",

    // Vehicle info from Firebase
    vehicleType: captain.vehicle?.brand || captain.vehicleType || "car",
    vehicleModel: captain.vehicle?.model || captain.vehicleModel || "",
    vehicleBrand: captain.vehicle?.brand || "",
    vehicleColor: captain.vehicle?.color || "",
    vehicleEngineType: captain.vehicle?.engineType || "",
    vehicleTransmission: captain.vehicle?.transmission || "",
    vehicleImageUrl: captain.vehicle?.imageUrl || null,
    registrationPlate: captain.registrationPlate || captain.registrationNumber || "",
    seatCapacity: captain.vehicle?.seats ? parseInt(captain.vehicle.seats) : (captain.seatCapacity || 4),

    // Location info from Firebase
    location: captain.location || null,
    locationData: captain.locationData || null,
    online: Boolean(captain.online),
    routeFrom: captain.routeFrom || (
      typeof captain.location === "object" && captain.location?.lat && captain.location?.lng
        ? {
            coordinates: [captain.location.lng, captain.location.lat],
            address: captain.address || "Live GPS Location"
          }
        : captain.locationData ? {
            coordinates: [captain.locationData.longitude || 0, captain.locationData.latitude || 0],
            address: captain.locationData.address || ""
          }
        : { coordinates: [0, 0], address: "" }
    ),
    routeTo: captain.routeTo || { coordinates: [0, 0], address: "" },
    currentLocation: captain.currentLocation || undefined,

    // Status and verification from Firebase
    status: (captain.status?.toLowerCase() === "active" ? "active" :
      captain.status?.toLowerCase() === "inactive" ? "inactive" :
        captain.status?.toLowerCase() === "rejected" ? "rejected" :
          captain.accountStatus?.toLowerCase() === "active" ? "active" :
            captain.approved === true ? "active" :
              captain.status || "pending") as "pending" | "active" | "inactive" | "rejected",
    isVerified: captain.isVerified || false,

    // Documents from Firebase
    documentsSubmitted: {
      cnic: !!(captain.documents?.cnicFrontUrl || captain.documents?.cnicBackUrl),
      licence: !!(captain.documents?.licenseFrontUrl || captain.documents?.licenseBackUrl),
      registration: !!captain.registrationPlate,
      policeClearance: false,
    },
    images: {
      cnicFront: captain.documents?.cnicFrontUrl || "",
      cnicBack: captain.documents?.cnicBackUrl || "",
      licenceFront: captain.documents?.licenseFrontUrl || "",
      licenceBack: captain.documents?.licenseBackUrl || "",
      vehiclePicture: captain.vehicle?.imageUrl || "",
    },

    // Firebase specific fields
    uid: captain.uid || captain.id,
    documents: captain.documents || null,
    vehicle: captain.vehicle || null,

    // Policy & Financial fields
    policySigned: Boolean(captain.policySigned || captain.policy_signed || captain.policyDetails?.signed),
    signedName: captain.signedName || captain.signed_name || captain.policyDetails?.signedName || "",
    signedCnic: captain.signedCnic || captain.signed_cnic || captain.policyDetails?.signedCnic || "",
    policySignedAt: captain.policySignedAt || captain.signed_at || captain.policyDetails?.signedAt || "",
    walletBalance: Number(captain.walletBalance ?? captain.wallet ?? 774),
    totalCommission: Number(captain.totalCommission ?? 0),
    paidToTravena: Number(captain.paidToTravena ?? 0),
    remainingBalance: Number(captain.remainingBalance ?? 0),
    isSuspended: Boolean(captain.isSuspended || captain.suspended || false),
    suspensionReason: captain.suspensionReason || "",
    tripsCount: Number(captain.tripsCount || captain.trips || captain.totalTrips || 0),

    // Timestamps
    rating: captain.rating || 0,
    createdAt: captain.createdAt || null,
    updatedAt: captain.updatedAt || null,
    lastPingAt: captain.lastPingAt || captain.lastPing || null,
    approvedAt: captain.approvedAt || undefined,
  })) as any[];

  // Filter captains by status & search query (client-side)
  const activeCaptains = allCaptains.filter((c) => c.status === "active");
  const pendingCaptains = allCaptains.filter((c) => c.status === "pending" || c.status === "signup_request");
  const rejectedCaptains = allCaptains.filter((c) => c.status === "rejected");
  const inactiveCaptains = allCaptains.filter((c) => c.status === "inactive");


  // Refetch functions (all point to the same Firebase refetch)
  const refetchPending = refetchActive;
  const refetchRejected = refetchActive;
  const refetchInactive = refetchActive;

  const { data: pendingServicesResult, refetch: refetchServices } = usePendingUserServices(1, 1000);
  const pendingServices = pendingServicesResult?.data ?? [];

  const allInactive = [...rejectedCaptains, ...inactiveCaptains];

  const updateCaptainStatus = useUpdateFirebaseCaptainStatus(); // Use Firebase hook
  const updateServiceStatus = useUpdateUserServiceStatus();
  const createCaptain = useCreateCaptain();

  const loading = loadingActive;
  const error = errorActive;

  const refetchAll = () => {
    refetchActive();
    refetchPending();
    refetchRejected();
    refetchInactive();
    refetchServices();
  };

  const approveCaptain = async (id: string) => {
    try {
      await updateCaptainStatus.mutateAsync({ id, action: "approve" });
      toast.success("Captain approved successfully");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    }
  };

  const rejectCaptain = async (id: string) => {
    try {
      await updateCaptainStatus.mutateAsync({ id, action: "reject" });
      toast.success("Captain rejected");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    }
  };

  const updateServiceStatus_ = async (id: string, status: UserService["status"]) => {
    try {
      await updateServiceStatus.mutateAsync({ id, status });
      const label = status === "Approved" ? "approved" : status === "Cancelled" ? "declined" : status.toLowerCase();
      toast.success(`Service request ${label} successfully`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleAddCaptain = async (data: Record<string, unknown>) => {
    await createCaptain.mutateAsync(data);
    setShowAddForm(false);
  };

  const updatingId = updateCaptainStatus.variables?.id ?? updateServiceStatus.variables?.id ?? null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
    </div>
  );

  if (error) return (
    <div className="space-y-4">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">Failed to load captains: {error instanceof Error ? error.message : "Unknown error"}</div>
      <Button onClick={refetchAll} variant="outline" className="gap-2"><RefreshCw className="w-4 h-4" /> Retry</Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {showAddForm && <AddCaptainForm onSave={handleAddCaptain} onClose={() => setShowAddForm(false)} />}
      {selectedCaptain && (
        <CaptainDetailModal
          captain={selectedCaptain}
          onClose={() => setSelectedCaptain(null)}
          onUpdated={() => setSelectedCaptain(null)}
          onDeleted={() => setSelectedCaptain(null)}
        />
      )}
      {mapOverlayCaptain && (
        <CaptainRouteMapOverlay captain={mapOverlayCaptain} onClose={() => setMapOverlayCaptain(null)} />
      )}

      <div className="flex items-center justify-between">
        {/* View toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "table"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <List className="w-4 h-4" />
            Table
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "map"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <Map className="w-4 h-4" />
            Map
          </button>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="w-4 h-4" /> Add Captain
          </Button>
          <Button onClick={refetchAll} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Map View */}
      {viewMode === "map" && (
        <div className="space-y-4">
          <MapControls
            onLocationChange={(lat, lng, radius) => setMapCenter({ lat, lng, radius })}
            captainStatusFilter={captainStatusFilter}
            onCaptainStatusChange={setCaptainStatusFilter}
            clusteringEnabled={clusteringEnabled}
            onClusteringToggle={setClusteringEnabled}
          />
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <LiveCaptainMap
              centerLat={mapCenter.lat}
              centerLng={mapCenter.lng}
              radiusKm={mapCenter.radius}
              height="500px"
              captains={allCaptains}
              showCaptains={true}
              showRoutes={true}
              compactLegend={false}
              enableClustering={clusteringEnabled}
              captainStatusFilter={captainStatusFilter}
              onCaptainClick={(c) => setSelectedCaptain(c)}
            />
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="active" className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />Active ({activeCaptains.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />Pending ({pendingCaptains.length})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex items-center gap-1.5">
            <XCircle className="w-4 h-4" />Inactive ({allInactive.length})
          </TabsTrigger>
          <TabsTrigger value="user-services" className="flex items-center gap-1.5">
            <Car className="w-4 h-4" />Service Req. ({pendingServices.length})
          </TabsTrigger>
        </TabsList>

        {/* Active */}
        <TabsContent value="active" className="mt-6">
          {activeCaptains.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p>No active captains</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeCaptains.map((c) => (
                <CaptainCard key={c.id || c._id} captain={c} onClick={() => setSelectedCaptain(c)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pending */}
        <TabsContent value="pending" className="mt-6">
          {pendingCaptains.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p>No pending approvals</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingCaptains.map((c) => (
                <div key={c.id || c._id} className="space-y-2">
                  <CaptainCard captain={c} onClick={() => setSelectedCaptain(c)} />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-semibold text-xs rounded-xl" disabled={updatingId === (c.id || c._id)} onClick={() => approveCaptain(c.id || c._id)}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 font-semibold text-xs rounded-xl" disabled={updatingId === (c.id || c._id)} onClick={() => rejectCaptain(c.id || c._id)}>
                      <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>


        {/* Inactive */}
        <TabsContent value="inactive" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Inactive / Rejected Captains</CardTitle></CardHeader>
            <CardContent>
              {allInactive.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p>No inactive captains</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Captain</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allInactive.map((c) => (
                      <TableRow key={c.id || c._id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedCaptain(c)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 bg-gray-100">
                              <AvatarFallback className="text-gray-600 text-xs">{getInitials(c.fullName)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{c.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{c.phone}</TableCell>
                        <TableCell>{c.vehicleModel || c.vehicleType}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 max-w-[180px]">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-[11px] text-gray-500 leading-tight truncate block" title={`${c.routeFrom?.address ?? "—"}\n${c.routeFrom?.coordinates?.[1]?.toFixed(4) ?? "0"}, ${c.routeFrom?.coordinates?.[0]?.toFixed(4) ?? "0"}`}>{c.routeFrom?.address ?? "—"}</span>
                              </div>
                              <div className="flex items-center gap-1.5 ml-0.5">
                                <svg className="w-1.5 h-2 text-gray-300 shrink-0" viewBox="0 0 6 8" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M3 0v6M1 4.5L3 6.5 5 4.5" /></svg>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span className="text-[11px] text-gray-500 leading-tight truncate block" title={`${c.routeTo?.address ?? "—"}\n${c.routeTo?.coordinates?.[1]?.toFixed(4) ?? "0"}, ${c.routeTo?.coordinates?.[0]?.toFixed(4) ?? "0"}`}>{c.routeTo?.address ?? "—"}</span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMapOverlayCaptain(c); }}
                              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="View route on map"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>{renderStars(c.rating)}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs capitalize">{c.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Requests */}
        <TabsContent value="user-services" className="mt-6">
          {pendingServices.length === 0 ? (
            <Card><CardContent className="text-center py-12 text-gray-500">
              <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p>No pending service requests</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingServices.map((s) => (
                <Card key={s._id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 bg-amber-100">
                          <AvatarFallback className="text-amber-700 font-semibold">{getInitials(s.userId?.fullName ?? "?")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{s.userId?.fullName ?? "—"}</CardTitle>
                          <CardDescription className="flex items-center gap-1 text-xs">
                            <Phone className="w-3 h-3" />{s.userId?.phoneNo ?? "—"}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="warning" className="text-xs">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Car className="w-4 h-4" /><span className="font-medium">{s.vehicleName}</span>
                        <span className="text-gray-400 text-xs">· {s.brand}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                        <div><span className="font-medium">Seats:</span> {s.seats}</div>
                        <div><span className="font-medium">Oil:</span> {s.oil}</div>
                        <div><span className="font-medium">Trans:</span> {s.transmissionType}</div>
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500 text-xs mb-1">Service</p>
                      <p className="font-medium text-gray-700">{s.serviceType} — {s.serviceName}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={updatingId === s._id} onClick={() => updateServiceStatus_(s._id, "Approved")}>
                        <CheckCircle className="w-4 h-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" disabled={updatingId === s._id} onClick={() => updateServiceStatus_(s._id, "Cancelled")}>
                        <XCircle className="w-4 h-4 mr-1" />Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
