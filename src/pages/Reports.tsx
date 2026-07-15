import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  IndianRupee,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Booking, Captain, AdminUser } from "@/types/api";
import { LiveCaptainMap } from "@/components/LiveCaptainMap";
import { Flame } from "lucide-react";

export function Reports() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allBookings, allCaptains, allUsers] = await Promise.all([
        api.get<Booking[]>("/admin/bookings"),
        api.get<Captain[]>("/admin/captains"),
        api.get<AdminUser[]>("/admin/users"),
      ]);
      setBookings(allBookings);
      setCaptains(allCaptains);
      setUsers(allUsers);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalRevenue = bookings
    .filter((b) => b.status === "Completed")
    .reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

  const bookingsByStatus = {
    Pending:   bookings.filter((b) => b.status === "Pending").length,
    Approved:  bookings.filter((b) => b.status === "Approved").length,
    Completed: bookings.filter((b) => b.status === "Completed").length,
    Canceled:  bookings.filter((b) => b.status === "Canceled").length,
  };

  const captainsByStatus = {
    active:   captains.filter((c) => c.status === "active").length,
    pending:  captains.filter((c) => c.status === "pending").length,
    rejected: captains.filter((c) => c.status === "rejected").length,
    inactive: captains.filter((c) => c.status === "inactive").length,
  };

  // Group bookings by trip type
  const byTripType = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.tripType] = (acc[b.tripType] ?? 0) + 1;
    return acc;
  }, {});

  // Revenue by trip type (completed only)
  const revenueByTripType = bookings
    .filter((b) => b.status === "Completed")
    .reduce<Record<string, number>>((acc, b) => {
      acc[b.tripType] = (acc[b.tripType] ?? 0) + (b.totalAmount ?? 0);
      return acc;
    }, {});

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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
        <Button onClick={fetchAll} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-end">
        <Button onClick={fetchAll} variant="outline" size="sm" className="gap-2">
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

      {/* ── Passenger Density Heatmap ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Passenger Density Heatmap
          </CardTitle>
          <p className="text-sm text-gray-500 -mt-2">
            Visual concentration of passenger residences and workplaces — orange/red areas have high demand
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <LiveCaptainMap
            height="450px"
            showCaptains={true}
            showPassengers={true}
            showRoutes={false}
            showConnections={false}
            showSearch={true}
            showHeatmap={true}
            enableClustering={false}
            centerLocked={false}
            radiusKm={100}
          />
        </CardContent>
      </Card>

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
                { key: "oneWay",    label: "One Way" },
                { key: "roundTrip", label: "Round Trip" },
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
                      {bookings.filter((b) => b.tripType === key && b.status === "Completed").length}
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
                {[...bookings]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 10)
                  .map((b) => (
                    <TableRow key={b._id}>
                      <TableCell className="font-medium">{b.userId?.fullName ?? "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-[160px] truncate">
                        {b.source} → {b.destination}
                      </TableCell>
                      <TableCell className="text-xs capitalize">
                        {b.tripType === "oneWay" ? "One Way" : b.tripType === "roundTrip" ? "Round Trip" : "Monthly"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{b.pickupDate}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-3 h-3 text-gray-500" />
                          {b.totalAmount.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          b.status === "Completed" ? "bg-green-100 text-green-700" :
                          b.status === "Approved"  ? "bg-blue-100 text-blue-700" :
                          b.status === "Pending"   ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>
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
                  <TableRow key={c._id} className="animate-fade-in-up" style={{ animationDelay: `${index * 40}ms` }}>
                    <TableCell className="font-medium">{c.fullName}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-gray-400" />
                        {c.vehicleModel || c.vehicleType}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 max-w-[160px] truncate">
                      {c.routeFrom?.address} → {c.routeTo?.address}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {c.rating > 0
                          ? <><TrendingUp className="w-4 h-4 text-amber-500" />{c.rating.toFixed(1)}</>
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
                        {c.status}
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
                {users.slice(0, 20).map((u) => (
                  <TableRow key={u._id}>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell className="text-sm text-gray-600">{u.email}</TableCell>
                    <TableCell className="text-sm text-gray-600">{u.phoneNo}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
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
