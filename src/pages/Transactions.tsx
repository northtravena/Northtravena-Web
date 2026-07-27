import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  IndianRupee, Car, MapPin, CheckCircle, TrendingUp, TrendingDown, RefreshCw, XCircle, Clock,
} from "lucide-react";
import { useFirebaseBookings } from "@/lib/queries";
import { usePagination } from "@/lib/usePagination";
import { Pagination } from "@/components/Pagination";

// ─── Firebase booking shape ───────────────────────────────────────────────────
interface FbUser {
  name?: string; fullName?: string; displayName?: string;
  email?: string;
}

interface FbBooking {
  id: string;
  userId?: string;
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
const fbTripTypeRaw = (b: FbBooking) => (b.tripType ?? "").toLowerCase().replace(/[_\s-]/g, "");

// ─── Status helpers ───────────────────────────────────────────────────────────
const isCompleted = (s: string) => s === "completed" || s === "Complete";
const isPending = (s: string) => s === "Pending" || s === "pending";
const isApproved = (s: string) => s === "Approved" || s === "accepted" || s === "approved";
const isCanceled = (s: string) => s === "Canceled" || s === "Cancelled" || s === "cancelled" || s === "canceled";

const PLATFORM_FEE_PCT = 0.10; // 10%

function fmt(amount: number) {
  return `Rs. ${Math.abs(amount).toLocaleString()}`;
}

export function Transactions() {
  const [activeTab, setActiveTab] = useState("completed");
  const pagination = usePagination();

  const { data: rawFbBookings = [], isLoading: loading, error, refetch } = useFirebaseBookings();
  const fbBookings = rawFbBookings as FbBooking[];

  const completed = fbBookings.filter((b) => isCompleted(b.status));
  const pending = fbBookings.filter((b) => isPending(b.status));
  const approved = fbBookings.filter((b) => isApproved(b.status));
  const canceled = fbBookings.filter((b) => isCanceled(b.status));

  // Get current tab's data and paginate
  const currentTabData = activeTab === "completed" ? completed :
                          activeTab === "approved" ? approved :
                          activeTab === "pending" ? pending : canceled;

  const paginatedData = pagination.slice(currentTabData);

  // Update pagination total when tab changes
  const tabCount = currentTabData.length;
  const [prevCount, setPrevCount] = useState(0);
  if (tabCount !== prevCount) {
    setPrevCount(tabCount);
    pagination.setTotal(tabCount);
  }

  const totalRevenue = completed.reduce((s, b) => s + fbAmount(b), 0);
  const totalFees = Math.round(totalRevenue * PLATFORM_FEE_PCT);
  const totalNet = totalRevenue - totalFees;

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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error instanceof Error ? error.message : "Failed to load transactions"}</div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Revenue", value: fmt(totalRevenue), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Platform Fees", value: fmt(totalFees), icon: IndianRupee, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Net Payouts", value: fmt(totalNet), icon: TrendingDown, color: "text-blue-600", bg: "bg-blue-50" },
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
              <p className="text-xs text-gray-400 mt-1">From {completed.length} completed bookings</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        pagination.setPage(1);
      }} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />Completed ({completed.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />Approved ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="canceled" className="flex items-center gap-2">
            <XCircle className="w-4 h-4" />Canceled ({canceled.length})
          </TabsTrigger>
        </TabsList>

        {/* Completed — Revenue */}
        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Completed Bookings — Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completed.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No completed bookings yet</div>
              ) : (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Passenger</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Trip Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Platform Fee (10%)</TableHead>
                      <TableHead>Net Payout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((b) => {
                      const amount = fbAmount(b);
                      const fee = Math.round(amount * PLATFORM_FEE_PCT);
                      const net = amount - fee;
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{fbName(b)}</TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-[140px] truncate">
                            {fbSource(b)} → {fbDest(b)}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                              {fbTripType(b)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{fbDate(b)}</TableCell>
                          <TableCell className="font-medium">{fmt(amount)}</TableCell>
                          <TableCell className="text-gray-500">- {fmt(fee)}</TableCell>
                          <TableCell className="font-medium text-emerald-600">{fmt(net)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <Pagination
                  page={pagination.page}
                  limit={pagination.limit}
                  total={completed.length}
                  totalPages={pagination.totalPages}
                  onPageChange={pagination.setPage}
                  onLimitChange={pagination.setLimit}
                />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approved */}
        <TabsContent value="approved" className="mt-6">
          <BookingTable bookings={approved} title="Approved Bookings" icon={<TrendingUp className="w-5 h-5 text-blue-600" />} pagination={pagination} />
        </TabsContent>

        {/* Pending */}
        <TabsContent value="pending" className="mt-6">
          <BookingTable bookings={pending} title="Pending Bookings" icon={<Clock className="w-5 h-5 text-amber-600" />} pagination={pagination} />
        </TabsContent>

        {/* Canceled */}
        <TabsContent value="canceled" className="mt-6">
          <BookingTable bookings={canceled} title="Canceled Bookings" icon={<XCircle className="w-5 h-5 text-red-600" />} pagination={pagination} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Shared booking table ─────────────────────────────────────────────────────
function BookingTable({
  bookings,
  title,
  icon,
  pagination,
}: {
  bookings: FbBooking[];
  title: string;
  icon: React.ReactNode;
  pagination: ReturnType<typeof usePagination>;
}) {
  const paginatedBookings = pagination.slice(bookings);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No bookings in this category</div>
        ) : (
          <>
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
              {paginatedBookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{fbName(b)}</TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-[140px] truncate">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {fbSource(b)} → {fbDest(b)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {fbTripType(b)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{fbDate(b)}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-3 h-3 text-gray-500" />
                      {fbAmount(b).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        isCompleted(b.status) ? "success" :
                          isApproved(b.status) ? "info" :
                            isPending(b.status) ? "warning" : "error"
                      }
                      className="text-xs"
                    >
                      {b.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={bookings.length}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onLimitChange={pagination.setLimit}
          />
          </>
        )}
      </CardContent>
    </Card>
  );
}
