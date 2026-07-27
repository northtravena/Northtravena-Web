import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, UserCheck, Car, IndianRupee, AlertTriangle,
  MapPin, Clock, ArrowRight, Calendar, Wrench,
} from "lucide-react";
import {
  useFirebaseBookings, useFirebaseUserServices, useFirebaseCaptains,
  usePendingUserServices, useActiveCaptains,
} from "@/lib/queries";
import { LiveCaptainMap } from "@/components/LiveCaptainMap";
import { MapControls, type VehicleTypeFilter, type MatchStatusFilter, type CaptainStatusFilter } from "@/components/MapControls";

// ─── Firebase booking shape (mirrors Services.tsx) ────────────────────────────
interface FbUser {
  name?: string; fullName?: string; displayName?: string;
  email?: string;
  phone?: string; phoneNo?: string; phoneNumber?: string;
}

interface FbBooking {
  id: string;
  userId?: string;
  userName?: string; userEmail?: string; userPhone?: string;
  _user?: FbUser; user?: FbUser; customer?: FbUser;
  source?: string; pickup?: string; pickupLocation?: string; pickupAddress?: string;
  destination?: string; dropoff?: string; dropLocation?: string; dropAddress?: string;
  pickupDate?: string; date?: string;
  pickupTime?: string; time?: string;
  tripType?: string;
  totalAmount?: number; amount?: number; fare?: number; price?: number;
  status: string;
  createdAt?: string | { _seconds: number; _nanoseconds: number };
}

// ─── Firebase user-service shape (mirrors AppServices.tsx) ───────────────────
interface FbServiceCatalog {
  vehicle_name?: string; vehicle_label?: string; vehicle_image?: string;
  type?: string; color?: string; oil?: string; seats?: string | number;
  service_name?: string; service_type?: string; service_description?: string;
  amount?: number;
}

interface FbUserService {
  id: string;
  user_id?: string;
  vehicle_name?: string; vehicle_label?: string; vehicle_image?: string;
  service_name?: string; service_type?: string;
  userName?: string; userEmail?: string;
  _user?: FbUser; _service?: FbServiceCatalog;
  status?: string;
  created_at?: { _seconds: number; _nanoseconds: number } | string;
}

// ─── Booking field resolvers ──────────────────────────────────────────────────
const fbName   = (b: FbBooking) => { const u = b._user ?? b.user ?? b.customer; return b.userName ?? u?.name ?? u?.fullName ?? u?.displayName ?? "—"; };
const fbEmail  = (b: FbBooking) => { const u = b._user ?? b.user ?? b.customer; return b.userEmail ?? u?.email ?? ""; };
const fbSource = (b: FbBooking) => b.source ?? b.pickup ?? b.pickupLocation ?? b.pickupAddress ?? "—";
const fbDest   = (b: FbBooking) => b.destination ?? b.dropoff ?? b.dropLocation ?? b.dropAddress ?? "—";
const fbDate   = (b: FbBooking) => b.pickupDate ?? b.date ?? "—";
const fbTime   = (b: FbBooking) => b.pickupTime ?? b.time ?? "";

// ─── Service field resolvers ──────────────────────────────────────────────────
const svcName    = (s: FbUserService) => s._service?.vehicle_name  ?? s.vehicle_name  ?? "—";
const svcLabel   = (s: FbUserService) => s._service?.vehicle_label ?? s.vehicle_label ?? null;
const svcImg     = (s: FbUserService) => s._service?.vehicle_image ?? s.vehicle_image ?? null;
const svcService = (s: FbUserService) => s._service?.service_name  ?? s.service_name  ?? "—";
const svcType    = (s: FbUserService) => s._service?.service_type  ?? s.service_type  ?? null;
const svcUser    = (s: FbUserService) => { const u = s._user; return s.userName ?? u?.name ?? u?.fullName ?? u?.displayName ?? "—"; };
const svcEmail   = (s: FbUserService) => s.userEmail ?? s._user?.email ?? "";

// ─── Shared helpers ───────────────────────────────────────────────────────────
function tripTypeLabel(t?: string) {
  if (!t) return "—";
  const k = t.toLowerCase().replace(/[_\s-]/g, "");
  if (k === "oneway")    return "One Way";
  if (k === "roundtrip") return "Round Trip";
  if (k === "monthly")   return "Monthly";
  return t;
}

function tripTypePill(t?: string) {
  const k = (t ?? "").toLowerCase().replace(/[_\s-]/g, "");
  const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  if (k === "oneway")    return `${base} bg-blue-100 text-blue-700`;
  if (k === "roundtrip") return `${base} bg-purple-100 text-purple-700`;
  if (k === "monthly")   return `${base} bg-emerald-100 text-emerald-700`;
  return `${base} bg-gray-100 text-gray-600`;
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

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Reusable approved status pill ───────────────────────────────────────────
function ApprovedPill() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Approved
    </span>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function Dashboard() {
  const { data: rawFbBookings = [] }                               = useFirebaseBookings();
  const { data: rawFbServices = [] }                               = useFirebaseUserServices();
  const { data: rawFbCaptains = [] }                               = useFirebaseCaptains();
  const { data: pendingServicesResult, isLoading, error }           = usePendingUserServices(1, 1000);
  const { data: activeCaptainsResult }                              = useActiveCaptains(1, 1000);

  const fbBookings = rawFbBookings as FbBooking[];
  const pendingServices = pendingServicesResult?.data ?? [];
  const activeCaptains = activeCaptainsResult?.data ?? [];

  const fbCaptains = rawFbCaptains as Record<string, any>[];
  const activeFbCaptains = fbCaptains.filter(
    (c) => (c.status ?? "").toLowerCase() === "active" || c.approved === true
  );

  const totalActiveCaptains = activeFbCaptains.length > 0 
    ? activeFbCaptains.length 
    : (activeCaptainsResult?.pagination?.total ?? activeCaptains.length);

  const [mapCenter, setMapCenter] = useState({ lat: 35.9208, lng: 74.3145, radius: 50 });
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<VehicleTypeFilter>("all");
  const [clusteringEnabled, setClusteringEnabled] = useState(false);
  const [matchStatusFilter, setMatchStatusFilter] = useState<MatchStatusFilter>("all");
  const [captainStatusFilter, setCaptainStatusFilter] = useState<CaptainStatusFilter>("all");

  const today = todayStr();

  // Helpers for Firebase booking fields (multiple field names)
  const fbAmount = (b: FbBooking) => b.totalAmount ?? b.amount ?? b.fare ?? b.price ?? 0;
  const fbDate = (b: FbBooking) => b.pickupDate ?? b.date ?? "";

  const PLATFORM_FEE_PCT = 0.20; // 20% platform commission for Rides/Bookings

  const activeBookings = fbBookings.filter(
    (b) => b.status?.toLowerCase() === "approved" && fbDate(b).startsWith(today)
  );

  const activeServices = (rawFbServices as FbUserService[]).filter(
    (s) => (s.status ?? "").toLowerCase() === "approved"
  );

  const bookingsToday = fbBookings.filter((b) => fbDate(b).startsWith(today)).length;

  const isCompleted = (s?: string) => {
    const k = (s ?? "").toLowerCase();
    return k === "completed" || k === "complete";
  };

  // Total Travena earnings = 20% commission on ALL completed bookings
  const totalRevenue = fbBookings
    .filter((b) => isCompleted(b.status))
    .reduce((sum, b) => sum + Math.round(fbAmount(b) * PLATFORM_FEE_PCT), 0);

  const stats = [
    { title: "Active Captains", value: totalActiveCaptains,                                        icon: Users,       color: "text-emerald-600", bgColor: "bg-emerald-50" },
    { title: "Total Bookings",  value: fbBookings.length,                                          icon: UserCheck,   color: "text-blue-600",    bgColor: "bg-blue-50"    },
    { title: "Bookings Today",  value: bookingsToday,                                              icon: Car,         color: "text-purple-600",  bgColor: "bg-purple-50"  },
    { title: "Travena Earnings (PKR)",   value: totalRevenue > 0 ? `Rs. ${totalRevenue.toLocaleString()}` : "—", icon: IndianRupee, color: "text-amber-600",   bgColor: "bg-amber-50"   },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Failed to load dashboard data: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Alert Banner */}
      {(pendingServices.length > 0 || bookingsToday > 0) && (
        <Alert variant="warning" className="border-amber-400 bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-900">
            {pendingServices.length > 0 && (
              <><span className="font-semibold">{pendingServices.length} captain approval{pendingServices.length !== 1 ? "s" : ""}</span>{" "}pending</>
            )}
            {pendingServices.length > 0 && bookingsToday > 0 && " | "}
            {bookingsToday > 0 && (
              <><span className="font-semibold">{bookingsToday} booking{bookingsToday !== 1 ? "s" : ""}</span>{" "}today</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={stat.title} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
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

      {/* Live Captain Tracking Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Live Captain Tracking
            <span className="ml-auto text-xs font-normal text-gray-400 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Updates every 10s
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <MapControls
            onLocationChange={(lat, lng, radius) => setMapCenter({ lat, lng, radius })}
            vehicleTypeFilter={vehicleTypeFilter}
            onVehicleTypeChange={setVehicleTypeFilter}
            captainStatusFilter={captainStatusFilter}
            onCaptainStatusChange={setCaptainStatusFilter}
            clusteringEnabled={clusteringEnabled}
            onClusteringToggle={setClusteringEnabled}
          />
          <LiveCaptainMap
            centerLat={mapCenter.lat}
            centerLng={mapCenter.lng}
            radiusKm={mapCenter.radius}
            height="420px"
            showCaptains={true}
            showRoutes={true}
            vehicleTypeFilter={vehicleTypeFilter}
            enableClustering={clusteringEnabled}
            captainStatusFilter={captainStatusFilter}
          />
        </CardContent>
      </Card>

      {/* Active Bookings / Active Services — tabbed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Live Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bookings">
            <TabsList className="mb-4">
              <TabsTrigger value="bookings" className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" />
                Active Bookings
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                  {activeBookings.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" />
                Active Services
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">
                  {activeServices.length}
                </span>
              </TabsTrigger>
            </TabsList>

            {/* ── Active Bookings tab ─────────────────────────────────────── */}
            <TabsContent value="bookings">
              {activeBookings.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Car className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p>No active bookings for today</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Passenger</TableHead>
                      <TableHead>Trip Type</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Pickup Date / Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeBookings.map((b) => {
                      const name  = fbName(b);
                      const email = fbEmail(b);
                      const ac    = avatarColor(name);
                      const time  = fbTime(b);
                      return (
                        <TableRow key={b.id}>
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
                              <span className="truncate max-w-[120px]">{fbSource(b)}</span>
                              <ArrowRight className="w-3 h-3 flex-shrink-0 text-gray-400" />
                              <span className="truncate max-w-[120px]">{fbDest(b)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {fbDate(b)}
                            </div>
                            {time && <p className="text-xs text-gray-400 mt-0.5">{time}</p>}
                          </TableCell>
                          <TableCell><ApprovedPill /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* ── Active Services tab ─────────────────────────────────────── */}
            <TabsContent value="services">
              {activeServices.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Wrench className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p>No active services right now</p>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeServices.map((s) => {
                      const name    = svcUser(s);
                      const email   = svcEmail(s);
                      const ac      = avatarColor(name);
                      const img     = svcImg(s);
                      const showImg = img && !img.startsWith("assets/");
                      return (
                        <TableRow key={s.id}>
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
                            <div className="flex items-center gap-2">
                              {showImg ? (
                                <img src={img!} alt=""
                                  className="w-7 h-7 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                                  <Car className="w-3.5 h-3.5 text-orange-400" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-800">{svcName(s)}</p>
                                {svcLabel(s) && <p className="text-xs text-gray-400">{svcLabel(s)}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-700">{svcService(s)}</p>
                          </TableCell>
                          <TableCell>
                            {svcType(s) ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                {svcType(s)}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell><ApprovedPill /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

    </div>
  );
}
