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
  ChevronLeft, ChevronRight, Map, List, Route,
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
interface CaptainDetailModalProps {
  captain: Captain;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

function CaptainDetailModal({ captain, onClose, onUpdated, onDeleted }: CaptainDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const updateCaptain = useUpdateCaptain();
  const deleteCaptain = useDeleteCaptain();

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
    if (!form.routeFromAddress || !form.routeToAddress) {
      setError("Please set both route start and destination on the map.");
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await updateCaptain.mutateAsync({
        id: String(captain._id),
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
          routeFrom: { address: form.routeFromAddress, lat: Number(form.routeFromLat), lng: Number(form.routeFromLng) },
          routeTo: { address: form.routeToAddress, lat: Number(form.routeToLat), lng: Number(form.routeToLng) },
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
      await deleteCaptain.mutateAsync(String(captain._id));
      onDeleted();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete captain");
      setShowDeleteConfirm(false);
    }
  };

  const saving = updateCaptain.isPending;
  const deleting = deleteCaptain.isPending;

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    inactive: "bg-gray-100 text-gray-600",
    rejected: "bg-red-100 text-red-700",
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
                  {getInitials(captain.fullName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-base font-bold text-gray-900">{captain.fullName}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[captain.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {captain.status}
                  </span>
                  <span className="text-xs text-gray-400">{captain.phone}</span>
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
              <SectionHeader icon={User} title="Personal Information" color="bg-blue-100 text-blue-600" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full Name" value={form.fullName} onChange={set("fullName")} required readOnly={!isEditing} />
                <Field label="Phone" value={form.phone} onChange={set("phone")} required readOnly={!isEditing} />
                <Field label="Email" value={(captain as any).email || "N/A"} readOnly />
                <Field label="CNIC" value={form.cnic} onChange={set("cnic")} required readOnly={!isEditing} />
                <Field label="Licence Number" value={form.licenceNumber} onChange={set("licenceNumber")} required readOnly={!isEditing} />
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-600">Verified Status</label>
                  <div className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 rounded-lg border border-gray-100">
                    {(captain as any).isVerified ? (
                      <><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-green-700 font-medium">Verified</span></>
                    ) : (
                      <><XCircle className="w-4 h-4 text-gray-400" /><span className="text-gray-500">Not Verified</span></>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Location Info from Firebase */}
            {((captain as any).location || (captain as any).locationData) && (
              <div>
                <SectionHeader icon={MapPin} title="Location Details" color="bg-indigo-100 text-indigo-600" />
                <div className="grid grid-cols-2 gap-3">
                  {(captain as any).location && (
                    <div className="col-span-2">
                      <Field label="Location" value={(captain as any).location} readOnly />
                    </div>
                  )}
                  {(captain as any).locationData && (
                    <>
                      <div className="col-span-2">
                        <Field label="Address" value={(captain as any).locationData.address || "N/A"} readOnly />
                      </div>
                      <Field label="Latitude" value={String((captain as any).locationData.latitude || 0)} readOnly />
                      <Field label="Longitude" value={String((captain as any).locationData.longitude || 0)} readOnly />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Enhanced Vehicle Info from Firebase */}
            <div>
              <SectionHeader icon={Car} title="Vehicle Information" color="bg-purple-100 text-purple-600" />
              <div className="grid grid-cols-2 gap-3">
                {/* Show Firebase vehicle fields if available */}
                {(captain as any).vehicle && (
                  <>
                    <Field label="Brand" value={(captain as any).vehicle.brand || (captain as any).vehicleBrand || "N/A"} readOnly />
                    <Field label="Model" value={(captain as any).vehicle.model || form.vehicleModel || "N/A"} readOnly />
                    <Field label="Color" value={(captain as any).vehicle.color || (captain as any).vehicleColor || "N/A"} readOnly />
                    <Field label="Engine Type" value={(captain as any).vehicle.engineType || (captain as any).vehicleEngineType || "N/A"} readOnly />
                    <Field label="Transmission" value={(captain as any).vehicle.transmission || (captain as any).vehicleTransmission || "N/A"} readOnly />
                    <Field label="Seats" value={(captain as any).vehicle.seats || String(form.seatCapacity) || "N/A"} readOnly />
                  </>
                )}
                {/* Fallback to original fields if Firebase vehicle not available */}
                {!(captain as any).vehicle && (
                  <>
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-600">Vehicle Type *</label>
                        <select
                          value={form.vehicleType}
                          onChange={(e) => set("vehicleType")(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="car">🚗 Car</option>
                          <option value="van">🚐 Van</option>
                          <option value="other">🚌 Other</option>
                        </select>
                      </div>
                    ) : (
                      <Field label="Vehicle Type" value={form.vehicleType} readOnly />
                    )}
                    <Field label="Vehicle Model" value={form.vehicleModel} onChange={set("vehicleModel")} readOnly={!isEditing} />
                  </>
                )}
                <Field label="Registration Plate" value={form.registrationPlate} onChange={set("registrationPlate")} required readOnly={!isEditing} />
                {!(captain as any).vehicle && (
                  <Field label="Seat Capacity" value={form.seatCapacity} onChange={set("seatCapacity")} type="number" readOnly={!isEditing} />
                )}
              </div>

              {/* Vehicle Image from Firebase */}
              {((captain as any).vehicle?.imageUrl || (captain as any).vehicleImageUrl) && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Vehicle Photo</p>
                  <img
                    src={(captain as any).vehicle?.imageUrl || (captain as any).vehicleImageUrl}
                    alt="Vehicle"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <SectionHeader icon={FileText} title="Status" color="bg-amber-100 text-amber-600" />
              {isEditing ? (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-600">Captain Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => set("status")(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${statusColors[form.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {form.status}
                  </span>
                  {captain.approvedAt && (
                    <span className="text-xs text-gray-400">
                      Approved: {new Date(captain.approvedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Documents */}
            <div>
              <SectionHeader icon={CreditCard} title="Documents" color="bg-green-100 text-green-600" />
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  {
                    label: "CNIC",
                    ok: captain.documentsSubmitted?.cnic || !!(captain.images?.cnicFront || captain.images?.cnicBack) || !!((captain as any).documents?.cnicFrontUrl || (captain as any).documents?.cnicBackUrl),
                  },
                  {
                    label: "Licence",
                    ok: captain.documentsSubmitted?.licence || !!(captain.images?.licenceFront || captain.images?.licenceBack) || !!((captain as any).documents?.licenseFrontUrl || (captain as any).documents?.licenseBackUrl),
                  },
                  {
                    label: "Vehicle Reg",
                    ok: captain.documentsSubmitted?.registration || !!captain.registrationPlate,
                  },
                ].map(({ label, ok }) => (
                  <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                    {ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                    {label}
                  </div>
                ))}
              </div>
              {/* Document images - Show from Firebase or fallback to MongoDB */}
              <div className="space-y-3">
                {/* CNIC images */}
                {(captain.images?.cnicFront || captain.images?.cnicBack || (captain as any).documents?.cnicFrontUrl || (captain as any).documents?.cnicBackUrl) ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">CNIC</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(captain.images?.cnicFront || (captain as any).documents?.cnicFrontUrl) ? (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Front</p>
                          <img src={captain.images?.cnicFront || (captain as any).documents?.cnicFrontUrl} alt="CNIC Front" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                        </div>
                      ) : <div className="h-24 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">Not Uploaded</div>}
                      {(captain.images?.cnicBack || (captain as any).documents?.cnicBackUrl) ? (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Back</p>
                          <img src={captain.images?.cnicBack || (captain as any).documents?.cnicBackUrl} alt="CNIC Back" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                        </div>
                      ) : <div className="h-24 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">Not Uploaded</div>}
                    </div>
                  </div>
                ) : null}

                {/* Licence images */}
                {(captain.images?.licenceFront || captain.images?.licenceBack || (captain as any).documents?.licenseFrontUrl || (captain as any).documents?.licenseBackUrl) ? (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Driving Licence</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(captain.images?.licenceFront || (captain as any).documents?.licenseFrontUrl) ? (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Front</p>
                          <img src={captain.images?.licenceFront || (captain as any).documents?.licenseFrontUrl} alt="Licence Front" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                        </div>
                      ) : <div className="h-24 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">Not Uploaded</div>}
                      {(captain.images?.licenceBack || (captain as any).documents?.licenseBackUrl) ? (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Back</p>
                          <img src={captain.images?.licenceBack || (captain as any).documents?.licenseBackUrl} alt="Licence Back" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
                        </div>
                      ) : <div className="h-24 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">Not Uploaded</div>}
                    </div>
                  </div>
                ) : null}

                {/* Vehicle picture */}
                {(captain.images?.vehiclePicture || (captain as any).vehicle?.imageUrl) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Vehicle Photo</p>
                    <img src={captain.images?.vehiclePicture || (captain as any).vehicle?.imageUrl} alt="Vehicle" className="w-full h-32 object-cover rounded-lg border border-gray-200" />
                  </div>
                )}

                {/* Show message if no documents */}
                {!captain.images?.cnicFront && !captain.images?.cnicBack && !(captain as any).documents?.cnicFrontUrl && !(captain as any).documents?.cnicBackUrl &&
                  !captain.images?.licenceFront && !captain.images?.licenceBack && !(captain as any).documents?.licenseFrontUrl && !(captain as any).documents?.licenseBackUrl &&
                  !captain.images?.vehiclePicture && !(captain as any).vehicle?.imageUrl && (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No documents uploaded</p>
                    </div>
                  )}
              </div>
            </div>

            {/* Route */}
            <div>
              <SectionHeader icon={Navigation} title="Route Information" color="bg-emerald-100 text-emerald-600" />
              {isEditing ? (
                <LocationPicker
                  from={{ address: form.routeFromAddress, lat: Number(form.routeFromLat), lng: Number(form.routeFromLng) }}
                  to={{ address: form.routeToAddress, lat: Number(form.routeToLat), lng: Number(form.routeToLng) }}
                  onFromChange={(loc) => setForm((f) => ({ ...f, routeFromAddress: loc.address, routeFromLat: String(loc.lat), routeFromLng: String(loc.lng) }))}
                  onToChange={(loc) => setForm((f) => ({ ...f, routeToAddress: loc.address, routeToLat: String(loc.lat), routeToLng: String(loc.lng) }))}
                  height="280px"
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700 uppercase">From</span>
                    </div>
                    <Field label="Address" value={form.routeFromAddress} readOnly />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Lat" value={form.routeFromLat} type="number" readOnly />
                      <Field label="Lng" value={form.routeFromLng} type="number" readOnly />
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-xs font-semibold text-red-700 uppercase">To</span>
                    </div>
                    <Field label="Address" value={form.routeToAddress} readOnly />
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Lat" value={form.routeToLat} type="number" readOnly />
                      <Field label="Lng" value={form.routeToLng} type="number" readOnly />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rating & meta */}
            <div>
              <SectionHeader icon={Star} title="Performance & Timestamps" color="bg-amber-100 text-amber-600" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Rating</p>
                  {renderStars(captain.rating)}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Created At</p>
                  <p className="text-sm text-gray-700">
                    {new Date(captain.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(captain.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                {(captain as any).updatedAt && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Updated At</p>
                    <p className="text-sm text-gray-700">
                      {new Date((captain as any).updatedAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date((captain as any).updatedAt).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer — Save | Edit | Delete */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
            <div className="flex items-center justify-between gap-3">
              {/* Delete — always visible */}
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
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => { setIsEditing(false); setError(null); }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2 min-w-[110px]"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                      ) : (
                        <><Save className="w-4 h-4" />Save</>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="rounded-xl" onClick={onClose}>
                      Close
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 rounded-xl gap-2"
                      onClick={() => { setIsEditing(true); setSuccess(null); setError(null); }}
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
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

// ─── Captain Card ─────────────────────────────────────────────────────────────
function CaptainCard({ captain, onClick }: { captain: Captain; onClick: () => void }) {
  const statusVariant: Record<string, "success" | "warning" | "secondary" | "error"> = {
    active: "success", pending: "warning", inactive: "secondary", rejected: "error",
  };
  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all duration-200 animate-fade-in-up"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 bg-emerald-100">
              <AvatarFallback className="text-emerald-700 font-semibold">{getInitials(captain.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{captain.fullName}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs">
                <Phone className="w-3 h-3" />{captain.phone}
              </CardDescription>
            </div>
          </div>
          <Badge variant={statusVariant[captain.status] ?? "secondary"} className="text-xs capitalize">
            {captain.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Car className="w-4 h-4 text-emerald-600" />
          <span>{captain.vehicleModel || captain.vehicleType}</span>
          <span className="text-gray-400 text-xs">· {captain.registrationPlate}</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[11px] text-gray-500 leading-tight truncate" title={`${captain.routeFrom?.address ?? "—"}\n${captain.routeFrom?.coordinates?.[1]?.toFixed(4) ?? "0"}, ${captain.routeFrom?.coordinates?.[0]?.toFixed(4) ?? "0"}`}>{captain.routeFrom?.address ?? "—"}</span>
          </div>
          <div className="flex items-center gap-1.5 ml-0.5">
            <svg className="w-1.5 h-2 text-gray-300 shrink-0" viewBox="0 0 6 8" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M3 0v6M1 4.5L3 6.5 5 4.5" /></svg>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[11px] text-gray-500 leading-tight truncate" title={`${captain.routeTo?.address ?? "—"}\n${captain.routeTo?.coordinates?.[1]?.toFixed(4) ?? "0"}, ${captain.routeTo?.coordinates?.[0]?.toFixed(4) ?? "0"}`}>{captain.routeTo?.address ?? "—"}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-gray-500">Seats: {captain.seatCapacity}</span>
          {renderStars(captain.rating)}
        </div>
        <p className="text-xs text-emerald-600 font-medium pt-1">Click to view details →</p>
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
    location: captain.location || "",
    locationData: captain.locationData || null,
    routeFrom: captain.routeFrom || (captain.locationData ? {
      coordinates: [captain.locationData.longitude || 0, captain.locationData.latitude || 0],
      address: captain.locationData.address || captain.location || ""
    } : { coordinates: [0, 0], address: "" }),
    routeTo: captain.routeTo || { coordinates: [0, 0], address: "" },
    currentLocation: captain.currentLocation || undefined,

    // Status and verification from Firebase
    // Handle missing status field: check status, then accountStatus, then approved flag
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

    // Timestamps
    rating: captain.rating || 0,
    createdAt: captain.createdAt ? (typeof captain.createdAt === 'object' && captain.createdAt.toDate ?
      captain.createdAt.toDate().toISOString() :
      captain.createdAt) : new Date().toISOString(),
    updatedAt: captain.updatedAt || captain.createdAt || new Date().toISOString(),
    approvedAt: captain.approvedAt || undefined,
  })) as any[];

  // Filter captains by status (client-side)
  const activeCaptains = allCaptains.filter((c) => c.status === "active");
  const pendingCaptains = allCaptains.filter((c) => c.status === "pending");
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
              showPassengers={false}
              showConnections={false}
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
            <div className="grid gap-4 md:grid-cols-2">
              {pendingCaptains.map((c) => (
                <Card key={c.id || c._id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedCaptain(c)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 bg-amber-100">
                          <AvatarFallback className="text-amber-700 font-semibold">{getInitials(c.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{c.fullName}</CardTitle>
                          <CardDescription className="flex items-center gap-1 text-xs">
                            <Phone className="w-3 h-3" />{c.phone}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="warning" className="text-xs">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Car className="w-4 h-4" /><span className="font-medium">{c.vehicleModel || c.vehicleType}</span>
                        <span className="text-gray-400 text-xs">· {c.registrationPlate}</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-[11px] text-gray-500 leading-tight truncate">{c.routeFrom?.address ?? "—"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-0.5">
                          <svg className="w-1.5 h-2 text-gray-300 shrink-0" viewBox="0 0 6 8" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M3 0v6M1 4.5L3 6.5 5 4.5" /></svg>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-[11px] text-gray-500 leading-tight truncate">{c.routeTo?.address ?? "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={updatingId === (c.id || c._id)} onClick={() => approveCaptain(c.id || c._id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" disabled={updatingId === (c.id || c._id)} onClick={() => rejectCaptain(c.id || c._id)}>
                        <XCircle className="w-4 h-4 mr-1" />Reject
                      </Button>
                    </div>
                    <p className="text-xs text-blue-500 font-medium">Click card to view full details →</p>
                  </CardContent>
                </Card>
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
