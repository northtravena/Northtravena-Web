import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart3, TrendingUp, TrendingDown, Users, Car, IndianRupee,
  RefreshCw, CheckCircle, Clock, XCircle,
} from "lucide-react";
import { useFirebaseBookings, useFirebaseCaptains, useFirebaseUsers } from "@/lib/queries";

// ─── Firebase types ───────────────────────────────────────────────────────────
interface FbUser {
  id?: string;
  name?: string; fullName?: string; displayName?: string;
  email?: string; phone?: string; phoneNo?: string; phoneNumber?: string;
  role?: string;
  createdAt?: string | number | { _seconds?: number; seconds?: number };
}

interface FbBooking {
  id: string;
  userName?: string; userEmail?: string;
  _user?: FbUser; user?: FbUser; customer?: FbUser;
  source?: string; pickup?: string; pickupLocation?: string;
  destination?: string; dropoff?: string; dropLocation?: string;
  pickupDate?: string; date?: string;
  tripType?: string;
  totalAmount?: number; amount?: number; fare?: number; price?: number;
  status: string;
  createdAt?: string | { _seconds: number; _nanoseconds: number };
}

interface FbCaptain {
  id: string;
  fullName?: string; name?: string;
  phone?: string; phoneNumber?: string; phoneNo?: string;
  vehicle?: { brand?: string; model?: string; seats?: string };
  vehicleType?: string; vehicleModel?: string;
  routeFrom?: { address?: string; coordinates?: [number, number] };
  routeTo?: { address?: string; coordinates?: [number, number] };
  status?: string;
  rating?: number;
}

// ─── Field resolvers ──────────────────────────────────────────────────────────
const fbAmount = (b: FbBooking) => b.totalAmount ?? b.amount ?? b.fare ?? b.price ?? 0;
const fbDate = (b: FbBooking) => b.pickupDate ?? b.date ?? "—";
const fbSource = (b: FbBooking) => b.source ?? b.pickup ?? b.pickupLocation ?? "—";
const fbDest = (b: FbBooking) => b.destination ?? b.dropoff ?? b.dropLocation ?? "—";
const fbName = (b: FbBooking) => {
  const u = b._user ?? b.user ?? b.customer;
  return b.userName ?? u?.fullName ?? u?.name ?? "—";
};
const fbTripType = (b: FbBooking) => {
  const t = (b.tripType ?? "").toLowerCase().replace(/[_\s-]/g, "");
  if (t === "oneway") return "One Way";
  if (t === "roundtrip") return "Round Trip";
  if (t === "monthly") return "Monthly";
  return b.tripType ?? "—";
};
const fbTripTypeKey = (b: FbBooking) => (b.tripType ?? "").toLowerCase().replace(/[_\s-]/g, "");

const captainName = (c: FbCaptain) => c.fullName ?? c.name ?? "—";
const captainPhone = (c: FbCaptain) => c.phone ?? c.phoneNumber ?? c.phoneNo ?? "—";
const captainVehicle = (c: FbCaptain) => {
  if (c.vehicle?.brand && c.vehicle?.model) return `${c.vehicle.brand} ${c.vehicle.model}`;
  return c.vehicleModel ?? c.vehicleType ?? "—";
};

const userName = (u: FbUser) => u.fullName ?? u.name ?? u.displayName ?? "—";
const userPhone = (u: FbUser) => u.phoneNo ?? u.phone ?? u.phoneNumber ?? "—";
const userDate = (u: FbUser) => {
  const raw = u.createdAt;
  if (!raw) return "—";
  if (typeof raw === "object" && raw !== null) {
    const secs = (raw as { _seconds?: number })._seconds ?? (raw as { seconds?: number }).seconds;
    if (secs) return new Date(secs * 1000).toLocaleDateString();
  }
  const d = new Date(raw as string | number);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

// ─── Status helpers ───────────────────────────────────────────────────────────
const isCompleted = (s: string) => s === "completed" || s === "Complete";
const isPending = (s: string) => s === "Pending" || s === "pending";
const isApproved = (s: string) => s === "Approved" || s === "accepted" || s === "approved";
const isCanceled = (s: string) => s === "Canceled" || s === "Cancelled" || s === "cancelled" || s === "canceled";

const statusColor = (s: string) => {
  if (isCompleted(s)) return "bg-green-100 text-green-700";
  if (isApproved(s)) return "bg-blue-100 text-blue-700";
  if (isPending(s)) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
};

const PLATFORM_FEE_PCT = 0.20; // 20% commission for Rides/Bookings

export function Reports() {
  const { data: rawFbBookings = [], isLoading: loadingBookings, error: errorBookings, refetch: refetchBookings } = useFirebaseBookings();
  const { data: rawFbCaptains = [], isLoading: loadingCaptains, refetch: refetchCaptains } = useFirebaseCaptains();
  const { data: rawFbUsers = [], isLoading: loadingUsers, refetch: refetchUsers } = useFirebaseUsers();

  const bookings = rawFbBookings as FbBooking[];
  const captains = rawFbCaptains as FbCaptain[];
  const users = rawFbUsers as FbUser[];

  const loading = loadingBookings || loadingCaptains || loadingUsers;
  const error = errorBookings;

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalRevenue = bookings
    .filter((b) => isCompleted(b.status))
    .reduce((sum, b) => sum + fbAmount(b), 0);

  const bookingsByStatus = {
    Pending:   bookings.filter((b) => isPending(b.status)).length,
    Approved:  bookings.filter((b) => isApproved(b.status)).length,
    Completed: bookings.filter((b) => isCompleted(b.status)).length,
    Canceled:  bookings.filter((b) => isCanceled(b.status)).length,
  };

  const captainsByStatus = {
    active:   captains.filter((c) => c.status === "active").length,
    pending:  captains.filter((c) => c.status === "pending").length,
    rejected: captains.filter((c) => c.status === "rejected").length,
    inactive: captains.filter((c) => c.status === "inactive").length,
  };

  // Group bookings by trip type
  const byTripType = bookings.reduce<Record<string, number>>((acc, b) => {
    const key = fbTripTypeKey(b);
    if (key) acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // Revenue by trip type (completed only)
  const revenueByTripType = bookings
    .filter((b) => isCompleted(b.status))
    .reduce<Record<string, number>>((acc, b) => {
      const key = fbTripTypeKey(b);
      if (key) acc[key] = (acc[key] ?? 0) + fbAmount(b);
      return acc;
    }, {});

  const refetchAll = () => {
    refetchBookings();
    refetchCaptains();
    refetchUsers();
  };

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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error instanceof Error ? error.message : "Failed to load reports"}</div>
        <Button onClick={refetchAll} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-end">
        <Button onClick={refetchAll} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Bookings",    value: bookings.length,          icon: Car,       color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Revenue",     value: `Rs. ${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Total Captains",    value: captains.length,          icon: Users,     color: "text-blue-600",    bg: "bg-blue-50" },
          { label: "Registered Users",  value: users.length,             icon: Users,     color: "text-purple-600",  bg: "bg-purple-50" },
        ].map((s, i) => (
          <Card key={s.label} className="animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{s.label}</CardTitle>
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Booking Status Breakdown ───────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Booking Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Pending",   count: bookingsByStatus.Pending,   icon: Clock,        color: "text-amber-600",  bar: "bg-amber-400" },
                { label: "Approved",  count: bookingsByStatus.Approved,  icon: TrendingUp,   color: "text-blue-600",   bar: "bg-blue-400" },
                { label: "Completed", count: bookingsByStatus.Completed, icon: CheckCircle,  color: "text-green-600",  bar: "bg-green-400" },
                { label: "Canceled",  count: bookingsByStatus.Canceled,  icon: XCircle,      color: "text-red-600",    bar: "bg-red-400" },
              ].map(({ label, count, icon: Icon, color, bar }) => {
                const pct = bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className={`flex items-center gap-2 text-sm font-medium ${color}`}>
                        <Icon className="w-4 h-4" />{label}
                      </div>
                      <span className="text-sm text-gray-600">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${bar} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Captain Status Breakdown ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Captain Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Active",   count: captainsByStatus.active,   bar: "bg-emerald-400" },
                { label: "Pending",  count: captainsByStatus.pending,  bar: "bg-amber-400" },
                { label: "Rejected", count: captainsByStatus.rejected, bar: "bg-red-400" },
                { label: "Inactive", count: captainsByStatus.inactive, bar: "bg-gray-400" },
              ].map(({ label, count, bar }) => {
                const pct = captains.length > 0 ? Math.round((count / captains.length) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{label}</span>
                      <span className="text-sm text-gray-600">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`${bar} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Revenue by Trip Type ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-amber-600" />
            Revenue by Trip Type (Completed Bookings)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trip Type</TableHead>
                <TableHead>Total Bookings</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Revenue (PKR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { key: "oneway",    label: "One Way" },
                { key: "roundtrip", label: "Round Trip" },
                { key: "monthly",   label: "Monthly" },
              ].map(({ key, label }) => (
                <TableRow key={key}>
                  <TableCell className="font-medium">{label}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-gray-400" />
                      {byTripType[key] ?? 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {bookings.filter((b) => fbTripTypeKey(b) === key && isCompleted(b.status)).length}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-4 h-4 text-emerald-600" />
                      {(revenueByTripType[key] ?? 0).toLocaleString()}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gray-50 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell>{bookings.length}</TableCell>
                <TableCell>{bookingsByStatus.Completed}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-emerald-700">
                    <IndianRupee className="w-4 h-4" />
                    {totalRevenue.toLocaleString()}
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Recent Bookings ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Recent Bookings (Last 10)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No bookings yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Trip Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.slice(0, 10).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{fbName(b)}</TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[160px] truncate">
                      {fbSource(b)} → {fbDest(b)}
                    </TableCell>
                    <TableCell className="text-xs capitalize">{fbTripType(b)}</TableCell>
                    <TableCell className="text-sm text-gray-500">{fbDate(b)}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        <IndianRupee className="w-3 h-3 text-gray-500" />
                        {fbAmount(b).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(b.status)}`}>
                        {b.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Captain List ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            All Captains
          </CardTitle>
        </CardHeader>
        <CardContent>
          {captains.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No captains registered</div>
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
                {captains.map((c, index) => (
                  <TableRow key={c.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 40}ms` }}>
                    <TableCell className="font-medium">{captainName(c)}</TableCell>
                    <TableCell>{captainPhone(c)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-gray-400" />
                        {captainVehicle(c)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[160px] truncate">
                      {c.routeFrom?.address ?? "—"} → {c.routeTo?.address ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(c.rating ?? 0) > 0
                          ? <><TrendingUp className="w-4 h-4 text-amber-500" />{(c.rating ?? 0).toFixed(1)}</>
                          : <span className="text-gray-400 text-sm">—</span>
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        c.status === "active"   ? "bg-green-100 text-green-700" :
                        c.status === "pending"  ? "bg-amber-100 text-amber-700" :
                        c.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {c.status ?? "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Registered Users ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Registered Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No users registered</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.slice(0, 20).map((u, i) => (
                  <TableRow key={u.id ?? i}>
                    <TableCell className="font-medium">{userName(u)}</TableCell>
                    <TableCell className="text-sm text-gray-600">{u.email ?? "—"}</TableCell>
                    <TableCell className="text-sm text-gray-600">{userPhone(u)}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {u.role ?? "user"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{userDate(u)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
