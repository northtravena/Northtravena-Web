import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Car, RefreshCw, Search, X, User, Layers,
  CheckCircle, Clock, XCircle, Wrench, Tag, Palette,
  Fuel, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { useFirebaseUserServices, useUpdateFirebaseUserService } from "@/lib/queries";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FirebaseUser {
  id?: string;
  name?: string; fullName?: string; displayName?: string;
  email?: string;
  phone?: string; phoneNo?: string; phoneNumber?: string;
}

// Catalog service document (from "services" collection)
interface ServiceCatalog {
  id?: string;
  vehicle_name?: string;
  vehicle_label?: string;
  vehicle_image?: string;
  type?: string;
  color?: string;
  oil?: string;
  seats?: string | number;
  service_name?: string;
  service_type?: string;
  service_description?: string;
  amount?: number;
}

// User service booking (from "user_services" collection)
interface UserService {
  id: string;
  user_id?: string;
  service_id?: string;
  // may be stored flat on the booking itself
  vehicle_name?: string;
  vehicle_label?: string;
  vehicle_image?: string;
  type?: string;
  color?: string;
  oil?: string;
  seats?: string | number;
  service_name?: string;
  service_type?: string;
  service_description?: string;
  amount?: number;
  // enriched by backend
  userName?: string; userEmail?: string; userPhone?: string;
  _user?: FirebaseUser;
  _service?: ServiceCatalog;
  // status & dates
  status?: string;
  created_at?: { _seconds: number; _nanoseconds: number } | string;
  updated_at?: { _seconds: number; _nanoseconds: number } | string;
}

// ─── Field resolvers — prefer _service catalog, fall back to flat fields ──────
const getVehicleName  = (s: UserService) => s._service?.vehicle_name  ?? s.vehicle_name  ?? null;
const getVehicleLabel = (s: UserService) => s._service?.vehicle_label ?? s.vehicle_label ?? null;
const getVehicleImage = (s: UserService) => s._service?.vehicle_image ?? s.vehicle_image ?? null;
const getVehicleType  = (s: UserService) => s._service?.type          ?? s.type          ?? null;
const getVehicleColor = (s: UserService) => s._service?.color         ?? s.color         ?? null;
const getVehicleOil   = (s: UserService) => s._service?.oil           ?? s.oil           ?? null;
const getVehicleSeats = (s: UserService) => s._service?.seats         ?? s.seats         ?? null;
const getServiceName  = (s: UserService) => s._service?.service_name  ?? s.service_name  ?? null;
const getServiceType  = (s: UserService) => s._service?.service_type  ?? s.service_type  ?? null;
const getServiceDesc  = (s: UserService) => s._service?.service_description ?? s.service_description ?? null;
const getAmount       = (s: UserService) => s._service?.amount        ?? s.amount        ?? null;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getName  = (s: UserService) =>
  s.userName ?? s._user?.name ?? s._user?.fullName ?? s._user?.displayName ?? "—";
const getEmail = (s: UserService) => s.userEmail ?? s._user?.email ?? "";
const getPhone = (s: UserService) =>
  s.userPhone ?? s._user?.phone ?? s._user?.phoneNo ?? s._user?.phoneNumber ?? "";

function formatDate(ts: UserService["created_at"]): string {
  if (!ts) return "—";
  if (typeof ts === "object" && "_seconds" in ts)
    return new Date(ts._seconds * 1000).toLocaleDateString();
  const d = new Date(ts as string);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function statusConfig(s?: string) {
  const k = (s ?? "").toLowerCase();
  if (k === "approved" || k === "active")
    return { label: "Approved",  dot: "bg-emerald-500", color: "bg-emerald-100 text-emerald-700" };
  if (k === "pending")
    return { label: "Pending",   dot: "bg-amber-500",   color: "bg-amber-100 text-amber-700"     };
  if (k === "cancelled" || k === "canceled" || k === "rejected")
    return { label: "Cancelled", dot: "bg-red-500",     color: "bg-red-100 text-red-700"         };
  if (k === "completed")
    return { label: "Completed", dot: "bg-blue-500",    color: "bg-blue-100 text-blue-700"       };
  return { label: s ?? "—",     dot: "bg-gray-400",    color: "bg-gray-100 text-gray-600"       };
}

function StatusPill({ status }: { status?: string }) {
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
    "bg-emerald-100 text-emerald-700", "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",   "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",       "bg-teal-100 text-teal-700",
  ];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function ServiceDrawer({
  service, open, onClose, onUpdateStatus, updatingId,
}: {
  service: UserService | null;
  open: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, status: FbStatus) => void;
  updatingId: string | null;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!service) return null;

  const name      = getName(service);
  const email     = getEmail(service);
  const phone     = getPhone(service);
  const avCol     = avatarColor(name);
  const cfg       = statusConfig(service.status);
  const imgSrc    = getVehicleImage(service);
  const showImg   = imgSrc && !imgSrc.startsWith("assets/");
  const amount    = getAmount(service);

  const status = (service.status ?? "").toLowerCase();

  const drawer = (
    <>
      <style>{`
        @keyframes nt-bd-in  { from{opacity:0} to{opacity:1} }
        @keyframes nt-bd-out { from{opacity:1} to{opacity:0} }
        @keyframes nt-dr-in  { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes nt-dr-out { from{transform:translateX(0)} to{transform:translateX(100%)} }
        .nt-bd-in  { animation: nt-bd-in  340ms cubic-bezier(0.32,0.72,0,1) forwards; }
        .nt-bd-out { animation: nt-bd-out 340ms cubic-bezier(0.32,0.72,0,1) forwards; }
        .nt-dr-in  { animation: nt-dr-in  360ms cubic-bezier(0.32,0.72,0,1) forwards; }
        .nt-dr-out { animation: nt-dr-out 360ms cubic-bezier(0.32,0.72,0,1) forwards; }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} className={open ? "nt-bd-in" : "nt-bd-out"}
        style={{ position:"fixed", inset:0, zIndex:40,
          backgroundColor:"rgba(15,23,42,0.45)", backdropFilter:"blur(3px)" }} />

      {/* Panel */}
      <div className={open ? "nt-dr-in" : "nt-dr-out"}
        style={{ position:"fixed", top:0, right:0, bottom:0, zIndex:50,
          width:"100%", maxWidth:"440px", backgroundColor:"#fff",
          boxShadow:"-8px 0 48px rgba(0,0,0,0.18)", display:"flex", flexDirection:"column" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-[#0D2955] to-[#1a4080] px-5 pt-5 pb-6 flex-shrink-0">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>

          {/* Customer */}
          <div className="flex items-center gap-3 pr-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${avCol}`}>
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">{name}</h2>
              {email && <p className="text-xs text-blue-200 truncate">{email}</p>}
              {phone && <p className="text-xs text-blue-200">{phone}</p>}
            </div>
          </div>

          {/* Status + service type */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            {getServiceType(service) && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                {getServiceType(service)}
              </span>
            )}
          </div>

          {/* Amount */}
          {amount != null && (
            <div className="mt-3 bg-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-blue-200 text-xs">Amount</span>
              <span className="text-white text-xl font-bold">{Number(amount).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Vehicle image */}
          {showImg && (
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <img src={imgSrc!} alt="Vehicle"
                className="w-full h-44 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
            </div>
          )}

          {/* Vehicle Details */}
          <DrawerSection title="Vehicle Details">
            <div className="grid grid-cols-2 gap-2 p-3">
              {getVehicleName(service) && (
                <InfoCard icon={<Car      className="w-3.5 h-3.5 text-orange-500" />} label="Vehicle Name"  value={getVehicleName(service)!} />
              )}
              {getVehicleLabel(service) && (
                <InfoCard icon={<Tag      className="w-3.5 h-3.5 text-blue-500"   />} label="Vehicle Label" value={getVehicleLabel(service)!} />
              )}
              {getVehicleType(service) && (
                <InfoCard icon={<Car      className="w-3.5 h-3.5 text-orange-400" />} label="Type"          value={getVehicleType(service)!} />
              )}
              {getVehicleColor(service) && (
                <InfoCard icon={<Palette  className="w-3.5 h-3.5 text-pink-400"   />} label="Color"         value={getVehicleColor(service)!} />
              )}
              {getVehicleSeats(service) != null && (
                <InfoCard icon={<User     className="w-3.5 h-3.5 text-teal-500"   />} label="Seats"         value={String(getVehicleSeats(service))} />
              )}
              {getVehicleOil(service) && (
                <InfoCard icon={<Fuel     className="w-3.5 h-3.5 text-yellow-500" />} label="Oil / Fuel"    value={getVehicleOil(service)!} />
              )}
            </div>
          </DrawerSection>

          {/* Service Details */}
          <DrawerSection title="Service Details">
            <div className="px-4 py-3 space-y-3">
              {getServiceName(service) && (
                <div className="flex items-start gap-2">
                  <Wrench className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Service Name</p>
                    <p className="text-sm font-semibold text-gray-800">{getServiceName(service)}</p>
                  </div>
                </div>
              )}
              {getServiceType(service) && (
                <div className="flex items-start gap-2">
                  <Settings2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400">Service Type</p>
                    <p className="text-sm font-semibold text-gray-800">{getServiceType(service)}</p>
                  </div>
                </div>
              )}
              {getServiceDesc(service) && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Description</p>
                  <p className="text-sm text-gray-700">{getServiceDesc(service)}</p>
                </div>
              )}
            </div>
          </DrawerSection>

          {/* Customer */}
          <DrawerSection title="Customer">
            <div className="px-4 py-3 space-y-2">
              <MetaRow label="Name"  value={name} />
              {email && <MetaRow label="Email" value={email} />}
              {phone && <MetaRow label="Phone" value={phone} />}
              {service.user_id && service.user_id !== "currentUserId" && (
                <MetaRow label="User ID" value={service.user_id} mono />
              )}
            </div>
          </DrawerSection>

          {/* Booking Info */}
          <DrawerSection title="Booking Info">
            <div className="px-4 py-3 space-y-2">
              <MetaRow label="Service ID"  value={service.id} mono />
              {service.service_id && <MetaRow label="Catalog ID" value={service.service_id} mono />}
              <MetaRow label="Booked On"   value={formatDate(service.created_at)} />
              {service.updated_at && (
                <MetaRow label="Updated" value={formatDate(service.updated_at)} />
              )}
            </div>
          </DrawerSection>
        </div>

        {/* ── Footer actions ──────────────────────────────────────────────── */}
        {(status === "pending" || status === "approved") && (
          <div className="flex-shrink-0 px-5 py-4 border-t bg-gray-50 flex gap-2">
            {status === "pending" && (
              <>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl h-10 text-sm"
                  disabled={updatingId === service.id}
                  onClick={() => { onUpdateStatus(service.id, "approved"); onClose(); }}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Approve
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-red-600 hover:bg-red-50 border-red-200 rounded-xl h-10 text-sm"
                  disabled={updatingId === service.id}
                  onClick={() => { onUpdateStatus(service.id, "cancelled"); onClose(); }}
                >
                  <XCircle className="w-4 h-4 mr-1.5" /> Decline
                </Button>
              </>
            )}
            {status === "approved" && (
              <Button
                variant="outline"
                className="flex-1 text-orange-600 hover:bg-orange-50 border-orange-200 rounded-xl h-10 text-sm"
                disabled={updatingId === service.id}
                onClick={() => { onUpdateStatus(service.id, "cancelled"); onClose(); }}
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Cancel Service
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );

  return createPortal(drawer, document.body);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
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
      <span className={`text-xs text-gray-700 text-right break-all ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
    </div>
  );
}

type FbStatus = "pending" | "approved" | "completed" | "cancelled";

// ─── Main Page ────────────────────────────────────────────────────────────────
type StatusTab = "all" | "pending" | "approved" | "completed" | "cancelled";

const STATUS_TABS: { key: StatusTab; label: string; icon: React.ElementType; color: string }[] = [
  { key: "all",       label: "All",       icon: Layers,      color: "text-gray-600"   },
  { key: "pending",   label: "Pending",   icon: Clock,       color: "text-amber-600"  },
  { key: "approved",  label: "Approved",  icon: CheckCircle, color: "text-emerald-600" },
  { key: "completed", label: "Completed", icon: XCircle,     color: "text-blue-600"   },
  { key: "cancelled", label: "Cancelled", icon: XCircle,     color: "text-red-600"    },
];

export function AppServices() {
  const [search, setSearch]         = useState("");
  const [statusTab, setStatusTab]   = useState<StatusTab>("all");
  const [selected, setSelected]     = useState<UserService | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: rawServices = [], isLoading: loading, error, refetch } = useFirebaseUserServices();
  const updateService = useUpdateFirebaseUserService();
  const services = rawServices as UserService[];

  const openDrawer = (s: UserService) => {
    setSelected(s);
    requestAnimationFrame(() => setDrawerOpen(true));
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelected(null), 380);
  };

  const updateStatus = async (id: string, status: FbStatus) => {
    setUpdatingId(id);
    try {
      await updateService.mutateAsync({ id, status });
      const label = status === "approved" ? "Approved" : status === "cancelled" ? "Cancelled" : status;
      toast.success(`Service ${label.toLowerCase()} successfully`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter by status tab + client-side search
  const tabFiltered = statusTab === "all"
    ? services
    : services.filter((s) => (s.status ?? "").toLowerCase() === statusTab);

  const filtered = tabFiltered.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (getVehicleName(s)  ?? "").toLowerCase().includes(q) ||
      (getServiceName(s)  ?? "").toLowerCase().includes(q) ||
      (getServiceType(s)  ?? "").toLowerCase().includes(q) ||
      (getName(s)             ).toLowerCase().includes(q) ||
      (getEmail(s)            ).toLowerCase().includes(q) ||
      (s.status           ?? "").toLowerCase().includes(q)
    );
  });

  const count = (st: string) =>
    services.filter((s) => (s.status ?? "").toLowerCase() === st.toLowerCase()).length;

  const stats = [
    { title: "Total Services", value: services.length,    icon: Wrench,      color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Pending",        value: count("Pending"),   icon: Clock,       color: "text-amber-600",   bg: "bg-amber-50"   },
    { title: "Approved",       value: count("Approved"),  icon: CheckCircle, color: "text-blue-600",    bg: "bg-blue-50"    },
    { title: "Completed",      value: count("Completed"), icon: XCircle,     color: "text-purple-600",  bg: "bg-purple-50"  },
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error instanceof Error ? error.message : "Failed to load services"}</div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <ServiceDrawer
        service={selected}
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
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          {STATUS_TABS.map(({ key, label, icon: Icon, color }) => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-1.5">
              <Icon className={`w-4 h-4 ${color === "text-gray-600" ? "text-gray-500" : color}`} />
              {/* {label} ({key === "all" ? services.length : services.filter((s) => (s.status ?? "").toLowerCase() === key).length}) */}
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map(({ key, label, icon: Icon, color }) => (
          <TabsContent key={key} value={key} className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${color}`} />
                  {label} Services
                  <span className="text-xs font-normal text-gray-400 ml-1">— click a row for details</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vehicle, service, customer…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-60"
                    />
                  </div>
                  <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>{search ? "No services match your search" : "No user services found"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Booked On</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const name  = getName(s);
                  const email = getEmail(s);
                  const ac    = avatarColor(name);
                  const img   = getVehicleImage(s);
                  const showImg = img && !img.startsWith("assets/");
                  return (
                    <TableRow key={s.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => openDrawer(s)}>
                      {/* Customer */}
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
                      {/* Vehicle */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {showImg ? (
                            <img src={img!} alt=""
                              className="w-8 h-8 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                              <Car className="w-4 h-4 text-orange-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-800">{getVehicleName(s) ?? "—"}</p>
                            {getVehicleLabel(s) && <p className="text-xs text-gray-400">{getVehicleLabel(s)}</p>}
                          </div>
                        </div>
                      </TableCell>
                      {/* Service */}
                      <TableCell>
                        <p className="text-sm text-gray-700">{getServiceName(s) ?? "—"}</p>
                      </TableCell>
                      {/* Type */}
                      <TableCell>
                        {getServiceType(s) ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            {getServiceType(s)}
                          </span>
                        ) : "—"}
                      </TableCell>
                      {/* Status */}
                      <TableCell>
                        <StatusPill status={s.status} />
                      </TableCell>
                      {/* Date */}
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(s.created_at)}
                      </TableCell>
                      {/* Actions */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {(s.status ?? "").toLowerCase() === "pending" && (
                            <>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs px-2 h-7"
                                disabled={updatingId === s.id}
                                onClick={() => updateStatus(s.id, "approved")}>
                                <CheckCircle className="w-3 h-3 mr-1" />Approve
                              </Button>
                              <Button size="sm" variant="outline"
                                className="text-red-600 hover:bg-red-50 text-xs px-2 h-7"
                                disabled={updatingId === s.id}
                                onClick={() => updateStatus(s.id, "cancelled")}>
                                <XCircle className="w-3 h-3 mr-1" />Decline
                              </Button>
                            </>
                          )}
                          {(s.status ?? "").toLowerCase() === "approved" && (
                            <Button size="sm" variant="outline"
                              className="text-orange-600 hover:bg-orange-50 text-xs px-2 h-7"
                              disabled={updatingId === s.id}
                              onClick={() => updateStatus(s.id, "cancelled")}>
                              <XCircle className="w-3 h-3 mr-1" />Cancel
                            </Button>
                          )}
                          {((s.status ?? "").toLowerCase() === "cancelled" ||
                            (s.status ?? "").toLowerCase() === "completed") && (
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
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
