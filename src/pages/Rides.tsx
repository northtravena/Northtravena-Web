import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, MapPin, Clock, CheckCircle, XCircle, RefreshCw, Route,
  X, Car, Calendar, IndianRupee, Star, Phone, User,
} from "lucide-react";
import { useFirebaseRideBookings } from "@/lib/queries";
import { usePagination } from "@/lib/usePagination";
import { Pagination } from "@/components/Pagination";

// ─── Firebase ride booking shape (matches actual Firestore data) ──────────────
interface FbRideBooking {
  id: string;
  customerName?: string;
  customerEmail?: string;
  customerId?: string;
  captainId?: string;
  rideId?: string;
  route?: { origin?: string; destination?: string };
  rideSnapshot?: {
    captainName?: string;
    captainPhone?: string;
    captainRating?: number;
    vehicleModel?: string;
    vehiclePlate?: string;
    origin?: string;
    destination?: string;
    departureAt?: { _seconds: number; _nanoseconds: number };
    notes?: string;
    seats?: number;
    seatsTaken?: number;
  };
  seats?: number;
  seatFare?: number;
  pricePerSeat?: number;
  totalAmount?: number;
  platformFee?: number;
  status: string;
  departureAt?: { _seconds: number; _nanoseconds: number };
  createdAt?: { _seconds: number; _nanoseconds: number };
  approvedAt?: { _seconds: number; _nanoseconds: number };
  rejectedAt?: { _seconds: number; _nanoseconds: number };
  cancelledAt?: { _seconds: number; _nanoseconds: number };
  completedAt?: { _seconds: number; _nanoseconds: number };
  cancelledBy?: string;
}

// ─── Field resolvers ──────────────────────────────────────────────────────────
const fbCustomerName = (b: FbRideBooking) => b.customerName ?? "—";
const fbCustomerEmail = (b: FbRideBooking) => b.customerEmail ?? "—";
const fbOrigin = (b: FbRideBooking) => b.route?.origin ?? b.rideSnapshot?.origin ?? "—";
const fbDestination = (b: FbRideBooking) => b.route?.destination ?? b.rideSnapshot?.destination ?? "—";
const fbCaptainName = (b: FbRideBooking) => b.rideSnapshot?.captainName ?? "—";
const fbCaptainPhone = (b: FbRideBooking) => b.rideSnapshot?.captainPhone ?? "—";
const fbVehicle = (b: FbRideBooking) => b.rideSnapshot?.vehicleModel ?? "—";
const fbVehiclePlate = (b: FbRideBooking) => b.rideSnapshot?.vehiclePlate ?? "—";
const fbSeats = (b: FbRideBooking) => b.seats ?? 0;
const fbSeatFare = (b: FbRideBooking) => b.seatFare ?? b.pricePerSeat ?? 0;
const fbTotalAmount = (b: FbRideBooking) => b.totalAmount ?? 0;
const fbNotes = (b: FbRideBooking) => b.rideSnapshot?.notes ?? "";

function resolveTimestamp(ts: { _seconds: number; _nanoseconds: number } | undefined): string {
  if (!ts) return "—";
  return new Date(ts._seconds * 1000).toLocaleString();
}

function resolveDate(ts: { _seconds: number; _nanoseconds: number } | undefined): string {
  if (!ts) return "—";
  return new Date(ts._seconds * 1000).toLocaleDateString();
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const isPending = (s: string) => s === "requested" || s === "Pending" || s === "pending";
const isApproved = (s: string) => s === "approved" || s === "Approved";
const isCompleted = (s: string) => s === "Complete" || s === "completed";
const isCancelled = (s: string) => s === "cancelled" || s === "Canceled" || s === "canceled";
const isRejected = (s: string) => s === "rejected" || s === "Rejected";

type TabKey = "all" | "pending" | "matched" | "completed" | "cancelled";

const TABS: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: "all",       label: "All",       icon: Route,      color: "text-emerald-600" },
  { key: "pending",   label: "Pending",   icon: Clock,      color: "text-amber-600" },
  { key: "matched",   label: "Matched",   icon: Users,      color: "text-blue-600" },
  { key: "completed", label: "Completed", icon: CheckCircle, color: "text-green-600" },
  { key: "cancelled", label: "Cancelled", icon: XCircle,    color: "text-red-600" },
];

function statusBadge(s: string) {
  if (isCompleted(s)) return <Badge variant="success" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
  if (isApproved(s)) return <Badge variant="info" className="text-xs"><Users className="w-3 h-3 mr-1" />Matched</Badge>;
  if (isPending(s)) return <Badge variant="warning" className="text-xs"><Clock className="w-3 h-3 mr-1" />Requested</Badge>;
  if (isRejected(s)) return <Badge variant="error" className="text-xs"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
  if (isCancelled(s)) return <Badge variant="error" className="text-xs"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
  return <Badge variant="secondary" className="text-xs">{s}</Badge>;
}

function isMatchedTab(s: string) { return isApproved(s); }

// ─── Ride Detail Drawer ───────────────────────────────────────────────────────
function RideDrawer({ ride, open, onClose }: { ride: FbRideBooking | null; open: boolean; onClose: () => void }) {
  if (!ride) return null;

  const drawer = createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">Ride Booking Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            {statusBadge(ride.status)}
            <span className="text-sm text-gray-500">ID: {ride.id.slice(0, 12)}…</span>
          </div>

          {/* Customer */}
          <Section title="Customer">
            <InfoRow icon={<User className="w-4 h-4" />} label="Name" value={fbCustomerName(ride)} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Email" value={fbCustomerEmail(ride)} />
          </Section>

          {/* Route */}
          <Section title="Route">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-xs text-gray-400">Origin</p>
                  <p className="text-sm font-medium text-gray-900">{fbOrigin(ride)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div>
                  <p className="text-xs text-gray-400">Destination</p>
                  <p className="text-sm font-medium text-gray-900">{fbDestination(ride)}</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Captain */}
          <Section title="Captain">
            <InfoRow icon={<Car className="w-4 h-4" />} label="Name" value={fbCaptainName(ride)} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={fbCaptainPhone(ride)} />
            <InfoRow icon={<Car className="w-4 h-4" />} label="Vehicle" value={`${fbVehicle(ride)} (${fbVehiclePlate(ride)})`} />
            {ride.rideSnapshot?.captainRating && (
              <InfoRow icon={<Star className="w-4 h-4" />} label="Rating" value={`${ride.rideSnapshot.captainRating}/5`} />
            )}
          </Section>

          {/* Schedule */}
          <Section title="Schedule">
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Departure" value={resolveTimestamp(ride.departureAt)} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="Created" value={resolveTimestamp(ride.createdAt)} />
          </Section>

          {/* Trip Summary */}
          <Section title="Trip Summary">
            <InfoRow icon={<Users className="w-4 h-4" />} label="Seats Booked" value={String(fbSeats(ride))} />
            <InfoRow icon={<IndianRupee className="w-4 h-4" />} label="Seat Fare" value={fbSeatFare(ride) > 0 ? `Rs. ${fbSeatFare(ride).toLocaleString()}` : "—"} />
            <InfoRow icon={<IndianRupee className="w-4 h-4" />} label="Total Amount" value={fbTotalAmount(ride) > 0 ? `Rs. ${fbTotalAmount(ride).toLocaleString()}` : "—"} />
          </Section>

          {/* Notes */}
          {fbNotes(ride) && (
            <Section title="Notes">
              <p className="text-sm text-gray-600">{fbNotes(ride)}</p>
            </Section>
          )}

          {/* Timeline */}
          <Section title="Timeline">
            <div className="space-y-2 text-sm">
              {ride.createdAt && (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                  Created: {resolveTimestamp(ride.createdAt)}
                </div>
              )}
              {ride.approvedAt && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  Approved: {resolveTimestamp(ride.approvedAt)}
                </div>
              )}
              {ride.rejectedAt && (
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Rejected: {resolveTimestamp(ride.rejectedAt)}
                </div>
              )}
              {ride.cancelledAt && (
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  Cancelled: {resolveTimestamp(ride.cancelledAt)}{ride.cancelledBy ? ` by ${ride.cancelledBy}` : ""}
                </div>
              )}
              {ride.completedAt && (
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Completed: {resolveTimestamp(ride.completedAt)}
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>,
    document.body,
  );

  return drawer;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <div className="flex-1">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function Rides() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selected, setSelected] = useState<FbRideBooking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pagination = usePagination();

  const { data: rawRides = [], isLoading, error, refetch } = useFirebaseRideBookings();
  const rides = rawRides as FbRideBooking[];

  const openDrawer = (b: FbRideBooking) => {
    setSelected(b);
    requestAnimationFrame(() => setDrawerOpen(true));
  };

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setTimeout(() => setSelected(null), 380);
  }, []);

  // Filter by tab
  const filteredRides = activeTab === "all"
    ? rides
    : rides.filter((b) => {
        const s = b.status;
        if (activeTab === "pending") return isPending(s);
        if (activeTab === "matched") return isMatchedTab(s);
        if (activeTab === "completed") return isCompleted(s);
        if (activeTab === "cancelled") return isCancelled(s) || isRejected(s);
        return true;
      });

  // Client-side pagination
  const paginatedRides = pagination.slice(filteredRides);

  const filteredCount = filteredRides.length;
  const [prevCount, setPrevCount] = useState(0);
  if (filteredCount !== prevCount) {
    setPrevCount(filteredCount);
    pagination.setTotal(filteredCount);
  }

  const countByTab = (tab: TabKey) => {
    if (tab === "all") return rides.length;
    return rides.filter((b) => {
      const s = b.status;
      if (tab === "pending") return isPending(s);
      if (tab === "matched") return isMatchedTab(s);
      if (tab === "completed") return isCompleted(s);
      if (tab === "cancelled") return isCancelled(s) || isRejected(s);
      return false;
    }).length;
  };

  if (isLoading) {
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
          Failed to load ride bookings: {error instanceof Error ? error.message : "Unknown error"}
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Drawer */}
      <RideDrawer ride={selected} open={drawerOpen} onClose={closeDrawer} />

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Rides", value: rides.length, icon: Route, color: "text-emerald-600", bgColor: "bg-emerald-50" },
          { title: "Pending", value: countByTab("pending"), icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50" },
          { title: "Matched", value: countByTab("matched"), icon: Users, color: "text-blue-600", bgColor: "bg-blue-50" },
          { title: "Completed", value: countByTab("completed"), icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-50" },
        ].map((stat, i) => (
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

      {/* Status Tabs + Table */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v as TabKey);
        pagination.setPage(1);
      }} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-5">
          {TABS.map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-1.5">
              <Icon className="w-4 h-4" />
              {label} ({countByTab(key)})
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ key, label, icon: Icon, color }) => (
          <TabsContent key={key} value={key} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${color}`} />
                  {label} Ride Bookings
                  <span className="ml-auto text-sm font-normal text-gray-400">
                    {countByTab(key)} total — click a row to view details
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paginatedRides.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Route className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>{rides.length === 0 ? "No ride bookings yet" : `No ${label.toLowerCase()} ride bookings`}</p>
                    {rides.length === 0 && (
                      <p className="text-xs text-gray-300 mt-2">Ride sharing data will appear here once passengers use the ride sharing feature</p>
                    )}
                  </div>
                ) : (
                  <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Passenger</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Departure</TableHead>
                        <TableHead>Seats</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Captain</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRides.map((b) => (
                        <TableRow key={b.id}
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => openDrawer(b)}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{fbCustomerName(b)}</p>
                              <p className="text-xs text-gray-400">{fbCustomerEmail(b)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-3 h-3 flex-shrink-0 text-emerald-500" />
                              <span className="truncate max-w-[120px]">{fbOrigin(b)}</span>
                              <span className="text-gray-400">→</span>
                              <span className="truncate max-w-[120px]">{fbDestination(b)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {resolveDate(b.departureAt)}
                          </TableCell>
                          <TableCell className="text-sm">{fbSeats(b)}</TableCell>
                          <TableCell className="font-medium">
                            {fbTotalAmount(b) > 0 ? `Rs. ${fbTotalAmount(b).toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell className="text-sm">{fbCaptainName(b)}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            <div>{fbVehicle(b)}</div>
                            <div className="text-xs text-gray-400">{fbVehiclePlate(b)}</div>
                          </TableCell>
                          <TableCell>{statusBadge(b.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination
                    page={pagination.page}
                    limit={pagination.limit}
                    total={filteredRides.length}
                    totalPages={pagination.totalPages}
                    onPageChange={pagination.setPage}
                    onLimitChange={pagination.setLimit}
                  />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
