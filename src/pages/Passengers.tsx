import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users, UserCheck, RefreshCw, Search, Phone, Mail, MapPin, Navigation,
  XCircle, CheckCircle, Clock, AlertTriangle, Trash2, Save, DollarSign,
  ArrowRight, UserX, ShieldAlert, Plus, ChevronLeft, ChevronRight, Pencil, Map as MapIcon, List,
} from "lucide-react";
import type { Passenger } from "@/types/api";
import { LiveCaptainMap } from "@/components/LiveCaptainMap";
import { MapControls, type MatchStatusFilter, type CaptainStatusFilter } from "@/components/MapControls";
import { LocationPicker } from "@/components/LocationPicker";
import { toast } from "sonner";
import {
  useFirebasePassengers,
  useUpdateFirebasePassenger,
  useDeletePassenger,
  useFirebaseCaptains,
  useCreatePassenger,
  useAvailableFirebaseUsers,
} from "@/lib/queries";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  (name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

const matchStatusConfig: Record<string, { label: string; color: string; bg: string; variant: "success" | "warning" | "error" | "secondary" }> = {
  matched: { label: "Matched", color: "text-emerald-700", bg: "bg-emerald-100", variant: "success" },
  unmatched: { label: "Unmatched", color: "text-amber-700", bg: "bg-amber-100", variant: "warning" },
  "on-hold": { label: "On Hold", color: "text-red-700", bg: "bg-red-100", variant: "error" },
};

function getUserFullName(userId: Passenger["userId"]): string {
  if (typeof userId === "string") return "Unknown";
  return userId.fullName || "Unknown";
}

function getUserEmail(userId: Passenger["userId"]): string {
  if (typeof userId === "string") return "—";
  return userId.email || "—";
}

function getUserPhone(userId: Passenger["userId"]): string {
  if (typeof userId === "string") return "—";
  return userId.phoneNo || "—";
}

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
        <p className="px-3 py-2 text-sm text-gray-800 bg-gray-50 rounded-lg border border-gray-100">
          {value || "—"}
        </p>
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
function DeleteConfirmModal({ passenger, onConfirm, onCancel, deleting }: {
  passenger: Passenger; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Delete Passenger</h3>
            <p className="text-xs text-gray-500">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-6">
          Are you sure you want to delete passenger{" "}
          <span className="font-semibold text-gray-900">"{getUserFullName(passenger.userId)}"</span>?
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

// ─── Passenger Detail Modal ───────────────────────────────────────────────────
interface PassengerDetailModalProps {
  passenger: Passenger;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

function PassengerDetailModal({ passenger, onClose, onUpdated, onDeleted }: PassengerDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updatePassenger = useUpdateFirebasePassenger();
  const deletePassenger = useDeletePassenger();

  // Fetch captains from Firebase and filter for Active status only
  const { data: firebaseCaptains = [] } = useFirebaseCaptains();
  const activeCaptains = firebaseCaptains
    .filter((c: any) => c.status?.toLowerCase() === "active")
    .map((c: any) => ({
      _id: c.id || c.uid,
      fullName: c.fullName || c.name || "Unknown",
      phone: c.phoneNumber || c.phone || "",
      routeFrom: c.locationData ? {
        address: c.locationData.address || c.location || ""
      } : { address: c.location || "" },
      routeTo: { address: "" }, // Firebase captains may not have routeTo
    }));

  const [selectedCaptainId, setSelectedCaptainId] = useState<string>(
    typeof passenger.assignedCaptain === "object" && passenger.assignedCaptain
      ? passenger.assignedCaptain._id
      : ""
  );
  const [editMonthlyFee, setEditMonthlyFee] = useState<string>(String(passenger.monthlyFee || ""));
  const [routeForm, setRouteForm] = useState({
    residenceAddress: passenger.residence?.address ?? "",
    residenceLat: String(passenger.residence?.coordinates?.[1] ?? 0),
    residenceLng: String(passenger.residence?.coordinates?.[0] ?? 0),
    workplaceAddress: passenger.workplace?.address ?? "",
    workplaceLat: String(passenger.workplace?.coordinates?.[1] ?? 0),
    workplaceLng: String(passenger.workplace?.coordinates?.[0] ?? 0),
  });

  const handleSaveRoute = async () => {
    if (!routeForm.residenceAddress || !routeForm.workplaceAddress) {
      setError("Please set both residence and workplace locations on the map.");
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      // Use Firebase user ID (id or uid)
      const passengerId = (passenger as any).id || (passenger as any).uid || passenger._id;

      await updatePassenger.mutateAsync({
        id: String(passengerId),
        data: {
          residence: {
            address: routeForm.residenceAddress,
            latitude: Number(routeForm.residenceLat),
            longitude: Number(routeForm.residenceLng),
          },
          workplace: {
            address: routeForm.workplaceAddress,
            latitude: Number(routeForm.workplaceLat),
            longitude: Number(routeForm.workplaceLng),
          },
        },
      });
      setSuccess("Commute route updated successfully!");
      setIsEditing(false);
      onUpdated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update route");
    }
  };

  const handleAssignCaptain = async () => {
    setError(null);
    setSuccess(null);
    try {
      // Use Firebase user ID (id or uid)
      const passengerId = (passenger as any).id || (passenger as any).uid || passenger._id;

      await updatePassenger.mutateAsync({
        id: String(passengerId),
        data: {
          assignedCaptainId: selectedCaptainId || null,
          monthlyFee: Number(editMonthlyFee) || 0,
        },
      });
      setSuccess(selectedCaptainId ? "Captain assigned successfully!" : "Captain unassigned successfully!");
      onUpdated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update captain assignment");
    }
  };

  const handleDelete = async () => {
    try {
      await deletePassenger.mutateAsync(String(passenger._id));
      onDeleted();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete passenger");
      setShowDeleteConfirm(false);
    }
  };

  const saving = updatePassenger.isPending;
  const deleting = deletePassenger.isPending;
  const config = matchStatusConfig[passenger.matchStatus] ?? matchStatusConfig.unmatched;
  const assignedCaptain = typeof passenger.assignedCaptain === "object" ? passenger.assignedCaptain : null;

  return createPortal(
    <>
      {showDeleteConfirm && (
        <DeleteConfirmModal
          passenger={passenger}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          deleting={deleting}
        />
      )}

      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        onMouseDown={(e) => { if (e.target === e.currentTarget && !showDeleteConfirm) onClose(); }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
          style={{ maxWidth: "720px", maxHeight: "calc(100vh - 48px)" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 bg-emerald-100">
                <AvatarFallback className="text-emerald-700 font-bold text-lg">
                  {getInitials(getUserFullName(passenger.userId))}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-base font-bold text-gray-900">{getUserFullName(passenger.userId)}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-400">{getUserPhone(passenger.userId)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Feedback banners */}
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

            {/* Personal Info */}
            <div>
              <SectionHeader icon={Users} title="Passenger Information" color="bg-blue-100 text-blue-600" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full Name" value={getUserFullName(passenger.userId)} />
                <Field label="Phone" value={getUserPhone(passenger.userId)} />
                <Field label="Email" value={getUserEmail(passenger.userId)} />
                <Field label="Registered" value={passenger.registeredAt ? new Date(passenger.registeredAt).toLocaleDateString() : "—"} />
              </div>
            </div>

            {/* Route */}
            <div>
              <SectionHeader icon={Navigation} title="Commute Route" color="bg-emerald-100 text-emerald-600" />
              {isEditing ? (
                <LocationPicker
                  from={{ address: routeForm.residenceAddress, lat: Number(routeForm.residenceLat), lng: Number(routeForm.residenceLng) }}
                  to={{ address: routeForm.workplaceAddress, lat: Number(routeForm.workplaceLat), lng: Number(routeForm.workplaceLng) }}
                  onFromChange={(loc) => setRouteForm((f) => ({ ...f, residenceAddress: loc.address, residenceLat: String(loc.lat), residenceLng: String(loc.lng) }))}
                  onToChange={(loc) => setRouteForm((f) => ({ ...f, workplaceAddress: loc.address, workplaceLat: String(loc.lat), workplaceLng: String(loc.lng) }))}
                  height="280px"
                  fromLabel="Residence"
                  toLabel="Workplace"
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700 uppercase">Residence</span>
                    </div>
                    <Field label="Address" value={passenger.residence?.address ?? ""} />
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-xs font-semibold text-blue-700 uppercase">Workplace</span>
                    </div>
                    <Field label="Address" value={passenger.workplace?.address ?? ""} />
                  </div>
                </div>
              )}
            </div>

            {/* Assigned Captain */}
            <div>
              <SectionHeader icon={UserCheck} title="Assigned Captain" color="bg-purple-100 text-purple-600" />
              {assignedCaptain ? (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 bg-purple-100">
                      <AvatarFallback className="text-purple-700 text-sm font-semibold">
                        {getInitials(assignedCaptain.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{assignedCaptain.fullName}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />{assignedCaptain.phone}
                      </div>
                    </div>
                  </div>
                  {assignedCaptain.routeFrom && assignedCaptain.routeTo && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                      <MapPin className="w-3 h-3 text-emerald-500" />
                      <span>{assignedCaptain.routeFrom.address}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span>{assignedCaptain.routeTo.address}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400">
                  <UserX className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                  No captain assigned
                </div>
              )}
            </div>

            {/* Captain Assignment */}
            <div>
              <SectionHeader icon={ShieldAlert} title="Manage Assignment" color="bg-amber-100 text-amber-600" />
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs font-medium text-gray-600">Assign Captain</label>
                  <select
                    value={selectedCaptainId}
                    onChange={(e) => setSelectedCaptainId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">— No captain —</option>
                    {activeCaptains.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.fullName} ({c.routeFrom?.address} → {c.routeTo?.address})
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2 min-w-[110px]"
                  onClick={handleAssignCaptain}
                  disabled={saving}
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                  ) : (
                    <><Save className="w-4 h-4" />Update</>
                  )}
                </Button>
              </div>
            </div>

            {/* Subscription */}
            <div>
              <SectionHeader icon={DollarSign} title="Subscription" color="bg-green-100 text-green-600" />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-600">Monthly Fee (PKR)</label>
                  <input
                    type="number"
                    value={editMonthlyFee}
                    onChange={(e) => setEditMonthlyFee(e.target.value)}
                    placeholder="4500"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-gray-400"
                  />
                </div>
                <Field
                  label="Subscription Started"
                  value={passenger.subscriptionStartDate ? new Date(passenger.subscriptionStartDate).toLocaleDateString() : "—"}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl gap-2"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <Button variant="outline" className="rounded-xl" onClick={() => { setIsEditing(false); setSuccess(null); setError(null); }} disabled={saving}>
                      Cancel
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2 min-w-[110px]" onClick={handleSaveRoute} disabled={saving}>
                      {saving ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                      ) : (
                        <><Save className="w-4 h-4" />Save</>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="rounded-xl" onClick={onClose}>Close</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2" onClick={() => { setIsEditing(true); setSuccess(null); setError(null); }}>
                      <Pencil className="w-4 h-4" />Edit Route
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ─── Add Passenger Modal ──────────────────────────────────────────────────────
interface AddPassengerFormProps {
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

const addPassengerSteps = [
  { title: "Select User", detail: "Choose a user", icon: Users },
  { title: "Commute Route", detail: "Residence & workplace", icon: Navigation },
  { title: "Subscription", detail: "Fee & assignment", icon: DollarSign },
] as const;

function AddPassengerForm({ onSave, onClose }: AddPassengerFormProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState({
    userId: "",
    residenceAddress: "", residenceLat: "35.8894", residenceLng: "74.3587",
    workplaceAddress: "", workplaceLat: "35.8723", workplaceLng: "74.3812",
    monthlyFee: "",
    assignedCaptain: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const { data: allUsers = [], isLoading: loadingUsers } = useAvailableFirebaseUsers();

  // Fetch captains from Firebase and filter for Active status only
  const { data: firebaseCaptains = [] } = useFirebaseCaptains();
  const activeCaptains = firebaseCaptains
    .filter((c: any) => c.status?.toLowerCase() === "active")
    .map((c: any) => ({
      _id: c.id || c.uid,
      fullName: c.fullName || c.name || "Unknown",
      phone: c.phoneNumber || c.phone || "",
      routeFrom: c.locationData ? {
        address: c.locationData.address || c.location || ""
      } : { address: c.location || "" },
      routeTo: { address: "" }, // Firebase captains may not have routeTo
    }));

  // Filter to users who don't already have a passenger profile (already done by backend)
  const availableUsers = allUsers;

  const selectedUser = availableUsers.find((u: any) => u.id === form.userId);

  // Helper to get user name from Firebase user
  const getUserName = (u: any) => u?.fullName || u?.name || u?.displayName || "Unknown";
  const getUserEmail = (u: any) => u?.email || "—";
  const getUserPhone = (u: any) => u?.phone || u?.phoneNo || u?.phoneNumber || "—";

  const getStepError = (index: number) => {
    if (index === 0 && !form.userId) {
      return "Please select a user to register as a passenger.";
    }
    if (index === 1 && !form.residenceAddress) {
      return "Please enter the passenger's residence area.";
    }
    if (index === 1 && !form.workplaceAddress) {
      return "Please enter the passenger's workplace area.";
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
    setStepIndex((current) => Math.min(current + 1, addPassengerSteps.length - 1));
  };

  const goBack = () => {
    setError(null);
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async () => {
    for (let index = 0; index < addPassengerSteps.length; index += 1) {
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
        userId: form.userId,
        residence: {
          address: form.residenceAddress,
          lat: Number(form.residenceLat),
          lng: Number(form.residenceLng),
        },
        workplace: {
          address: form.workplaceAddress,
          lat: Number(form.workplaceLat),
          lng: Number(form.workplaceLng),
        },
        monthlyFee: Number(form.monthlyFee) || 0,
        assignedCaptain: form.assignedCaptain || undefined,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add passenger");
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = (stepIndex / (addPassengerSteps.length - 1)) * 100;
  const isLastStep = stepIndex === addPassengerSteps.length - 1;

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
              <h2 className="text-base font-bold text-gray-900">Add New Passenger</h2>
              <p className="text-xs text-gray-400">Register a passenger for the daily commute network</p>
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
              {addPassengerSteps.map((step, index) => {
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
              {/* ── Select User ── */}
              <div>
                <SectionHeader icon={Users} title="Select User" color="bg-blue-100 text-blue-600" />
                {loadingUsers ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin w-6 h-6 border-3 border-emerald-600 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-gray-600">
                        User <span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <select
                        value={form.userId}
                        onChange={(e) => set("userId")(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">— Select a user —</option>
                        {availableUsers.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {getUserName(u)} ({getUserEmail(u)}) — {getUserPhone(u)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedUser && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
                        <Avatar className="w-10 h-10 bg-blue-100">
                          <AvatarFallback className="text-blue-700 text-sm font-semibold">
                            {getInitials(getUserName(selectedUser))}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{getUserName(selectedUser)}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{getUserPhone(selectedUser)}</span>
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{getUserEmail(selectedUser)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {stepIndex === 1 && (
            <>
              <div>
                <SectionHeader icon={MapPin} title="Commute Route" color="bg-emerald-100 text-emerald-600" />
                <LocationPicker
                  from={{ address: form.residenceAddress, lat: Number(form.residenceLat), lng: Number(form.residenceLng) }}
                  to={{ address: form.workplaceAddress, lat: Number(form.workplaceLat), lng: Number(form.workplaceLng) }}
                  onFromChange={(loc) => setForm((f) => ({ ...f, residenceAddress: loc.address, residenceLat: String(loc.lat), residenceLng: String(loc.lng) }))}
                  onToChange={(loc) => setForm((f) => ({ ...f, workplaceAddress: loc.address, workplaceLat: String(loc.lat), workplaceLng: String(loc.lng) }))}
                  height="320px"
                  fromLabel="Residence"
                  toLabel="Workplace"
                />
              </div>
            </>
          )}

          {stepIndex === 2 && (
            <>
              {/* ── Subscription ── */}
              <div>
                <SectionHeader icon={DollarSign} title="Monthly Subscription" color="bg-green-100 text-green-600" />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Monthly Fee (PKR)"
                    value={form.monthlyFee}
                    onChange={set("monthlyFee")}
                    type="number"
                    placeholder="4500"
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-600">Assign Captain (optional)</label>
                    <select
                      value={form.assignedCaptain}
                      onChange={(e) => set("assignedCaptain")(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">— Unmatched (no captain yet) —</option>
                      {activeCaptains.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.fullName} ({c.routeFrom?.address} → {c.routeTo?.address})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Summary ── */}
              <div>
                <SectionHeader icon={CheckCircle} title="Registration Summary" color="bg-emerald-100 text-emerald-600" />
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">User:</span>
                    <span>{selectedUser ? getUserName(selectedUser) : "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium">Residence:</span>
                    <span>{form.residenceAddress || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Workplace:</span>
                    <span>{form.workplaceAddress || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Monthly Fee:</span>
                    <span>{form.monthlyFee ? `PKR ${Number(form.monthlyFee).toLocaleString()}` : "—"}</span>
                  </div>
                  {form.assignedCaptain && (
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">Captain:</span>
                      <span>{activeCaptains.find((c) => c._id === form.assignedCaptain)?.fullName ?? "—"}</span>
                    </div>
                  )}
                </div>
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
              Step {stepIndex + 1} of {addPassengerSteps.length} <span className="text-gray-300 mx-1">/</span>
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
                    <><Plus className="w-4 h-4" />Add Passenger</>
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

// ─── Main Passengers Page ─────────────────────────────────────────────────────
type TabKey = "all" | "matched" | "unmatched" | "on-hold";

export function Passengers() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const [mapCenter, setMapCenter] = useState({ lat: 35.9208, lng: 74.3145, radius: 50 });
  const [clusteringEnabled, setClusteringEnabled] = useState(false);
  const [mapMatchFilter, setMapMatchFilter] = useState<MatchStatusFilter>("all");
  const [mapCaptainStatusFilter, setMapCaptainStatusFilter] = useState<CaptainStatusFilter>("all");

  const createPassenger = useCreatePassenger();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const tabFilter = activeTab === "all" ? undefined : activeTab;
  const { data: firebasePassengers = [], isLoading: loading, error, refetch } = useFirebasePassengers();

  // Transform Firebase users to match passenger structure with match status
  const passengers = firebasePassengers.map((user: any) => ({
    _id: user.id,
    id: user.id,
    userId: {
      _id: user.id,
      fullName: user.fullName || user.name || user.displayName || "Unknown",
      email: user.email || "",
      phoneNo: user.phoneNo || user.phone || user.phoneNumber || "",
    },
    fullName: user.fullName || user.name || user.displayName || "Unknown",
    email: user.email || "",
    phoneNo: user.phoneNo || user.phone || user.phoneNumber || "",
    matchStatus: (user.matchStatus || "unmatched") as "matched" | "unmatched" | "on-hold",
    assignedCaptain: user.assignedCaptain || null,
    residence: user.residence || { coordinates: [0, 0], address: "" },
    workplace: user.workplace || { coordinates: [0, 0], address: "" },
    monthlyFee: user.monthlyFee || 0,
    subscriptionStartDate: user.subscriptionStartDate || null,
    registeredAt: user.createdAt || user.registeredAt || new Date().toISOString(),
    createdAt: user.createdAt || user.registeredAt || new Date().toISOString(),
    updatedAt: user.updatedAt || user.createdAt || new Date().toISOString(),
  })) as Passenger[];

  // Apply tab filter for match status
  const statusFilteredPassengers = activeTab === "all"
    ? passengers
    : passengers.filter((p) => p.matchStatus === activeTab);

  // Client-side search filtering
  const filteredPassengers = debouncedSearch.trim()
    ? statusFilteredPassengers.filter((p) => {
      const re = new RegExp(debouncedSearch, "i");
      const name = getUserFullName(p.userId);
      const email = getUserEmail(p.userId);
      const phone = getUserPhone(p.userId);
      const captainName =
        typeof p.assignedCaptain === "object" && p.assignedCaptain
          ? p.assignedCaptain.fullName
          : "";
      return re.test(name) || re.test(email) || re.test(phone) || re.test(captainName);
    })
    : statusFilteredPassengers;

  const stats = [
    {
      title: "Total Passengers",
      value: filteredPassengers.length,
      icon: Users,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Matched",
      value: filteredPassengers.filter((p) => p.matchStatus === "matched").length,
      icon: UserCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Unmatched",
      value: filteredPassengers.filter((p) => p.matchStatus === "unmatched").length,
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "On Hold",
      value: filteredPassengers.filter((p) => p.matchStatus === "on-hold").length,
      icon: Clock,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  const handleAddPassenger = async (data: Record<string, unknown>) => {
    await createPassenger.mutateAsync(data);
    setShowAddForm(false);
    toast.success("Passenger registered successfully!");
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {showAddForm && <AddPassengerForm onSave={handleAddPassenger} onClose={() => setShowAddForm(false)} />}
      {selectedPassenger && (
        <PassengerDetailModal
          passenger={selectedPassenger}
          onClose={() => setSelectedPassenger(null)}
          onUpdated={() => setSelectedPassenger(null)}
          onDeleted={() => setSelectedPassenger(null)}
        />
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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

      {/* Tabs & Table */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid grid-cols-4 max-w-lg">
            <TabsTrigger value="all" className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />All
            </TabsTrigger>
            <TabsTrigger value="matched" className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />Matched
            </TabsTrigger>
            <TabsTrigger value="unmatched" className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />Unmatched
            </TabsTrigger>
            <TabsTrigger value="on-hold" className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />On Hold
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
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
                <MapIcon className="w-4 h-4" />
                Map
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, phone, captain…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-56"
              />
            </div>
            <Button onClick={() => setShowAddForm(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="w-4 h-4" /> Add Passenger
            </Button>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        </div>

        {/* Map View */}
        {viewMode === "map" && (
          <div className="space-y-4">
            <MapControls
              onLocationChange={(lat, lng, radius) => setMapCenter({ lat, lng, radius })}
              matchStatusFilter={mapMatchFilter}
              onMatchStatusChange={setMapMatchFilter}
              captainStatusFilter={mapCaptainStatusFilter}
              onCaptainStatusChange={setMapCaptainStatusFilter}
              clusteringEnabled={clusteringEnabled}
              onClusteringToggle={setClusteringEnabled}
            />
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <LiveCaptainMap
                centerLat={mapCenter.lat}
                centerLng={mapCenter.lng}
                radiusKm={mapCenter.radius}
                height="500px"
                showCaptains={false}
                showRoutes={false}
                showConnections={false}
                compactLegend={false}
                enableClustering={clusteringEnabled}
                matchStatusFilter={mapMatchFilter}
                captainStatusFilter={mapCaptainStatusFilter}

              />
            </div>
          </div>
        )}

        {/* Table View — shared across tabs */}
        {viewMode === "table" && (
          <TabsContent value={activeTab} className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-5 h-5 text-emerald-600" />
                  Daily Rides Passengers
                  <span className="text-sm font-normal text-gray-400">({filteredPassengers.length})</span>
                </CardTitle>
                <CardDescription>
                  Manage passenger subscriptions, captain assignments, and routes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
                  </div>
                ) : error ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error instanceof Error ? error.message : "Failed to load passengers"}
                  </div>
                ) : filteredPassengers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm">{debouncedSearch ? "No passengers match your search" : "No passengers registered yet"}</p>
                    <p className="text-xs text-gray-300 mt-1">Passengers will appear here once they register for a daily commute</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Passenger</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Assigned Captain</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Monthly Fee</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPassengers.map((p) => {
                        const config = matchStatusConfig[p.matchStatus] ?? matchStatusConfig.unmatched;
                        const captain =
                          typeof p.assignedCaptain === "object" && p.assignedCaptain
                            ? p.assignedCaptain
                            : null;

                        return (
                          <TableRow
                            key={p._id}
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setSelectedPassenger(p)}
                          >
                            {/* Passenger */}
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="w-9 h-9 bg-emerald-100">
                                  <AvatarFallback className="text-emerald-700 text-xs font-semibold">
                                    {getInitials(getUserFullName(p.userId))}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm text-gray-900">{getUserFullName(p.userId)}</p>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{getUserPhone(p.userId)}</span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Route */}
                            <TableCell>
                              <div className="flex flex-col max-w-[180px]">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="text-[11px] text-gray-500 leading-tight truncate" title={`${p.residence?.address ?? "—"}\n${p.residence?.coordinates?.[1]?.toFixed(4) ?? "0"}, ${p.residence?.coordinates?.[0]?.toFixed(4) ?? "0"}`}>{p.residence?.address ?? "—"}</span>
                                </div>
                                <div className="flex items-center gap-1.5 ml-0.5">
                                  <svg className="w-2 h-2.5 text-gray-300 shrink-0" viewBox="0 0 8 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 0v8M1.5 6L4 8.5 6.5 6" /></svg>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                  <span className="text-[11px] text-gray-500 leading-tight truncate" title={`${p.workplace?.address ?? "—"}\n${p.workplace?.coordinates?.[1]?.toFixed(4) ?? "0"}, ${p.workplace?.coordinates?.[0]?.toFixed(4) ?? "0"}`}>{p.workplace?.address ?? "—"}</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Assigned Captain */}
                            <TableCell>
                              {captain ? (
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-7 h-7 bg-purple-100">
                                    <AvatarFallback className="text-purple-700 text-[10px] font-semibold">
                                      {getInitials(captain.fullName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{captain.fullName}</p>
                                    {captain.routeFrom && captain.routeTo && (
                                      <p className="text-[11px] text-gray-400 truncate max-w-[120px]">
                                        {captain.routeFrom.address} → {captain.routeTo.address}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Unassigned</span>
                              )}
                            </TableCell>

                            {/* Match Status */}
                            <TableCell>
                              <Badge variant={config.variant} className="text-xs capitalize">
                                {config.label}
                              </Badge>
                            </TableCell>

                            {/* Monthly Fee */}
                            <TableCell>
                              <span className="text-sm font-medium text-gray-900">
                                {p.monthlyFee > 0 ? `PKR ${p.monthlyFee.toLocaleString()}` : "—"}
                              </span>
                            </TableCell>

                            {/* Registered */}
                            <TableCell className="text-sm text-gray-500">
                              {p.registeredAt ? new Date(p.registeredAt).toLocaleDateString() : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
