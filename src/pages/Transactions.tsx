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
import type { Booking } from "@/types/api";
import { useAllBookings } from "@/lib/queries";

const PLATFORM_FEE_PCT = 0.10; // 10%

function fmt(amount: number) {
  return `Rs. ${Math.abs(amount).toLocaleString()}`;
}

export function Transactions() {
  const [activeTab, setActiveTab] = useState("completed");
  const { data: bookings = [], isLoading: loading, error, refetch } = useAllBookings();

  const completed = bookings.filter((b) => b.status === "Completed");
  const pending = bookings.filter((b) => b.status === "Pending");
  const approved = bookings.filter((b) => b.status === "Approved");
  const canceled = bookings.filter((b) => b.status === "Canceled");

  const totalRevenue = completed.reduce((s, b) => s + b.totalAmount, 0);
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                    {completed.map((b) => {
                      const fee = Math.round(b.totalAmount * PLATFORM_FEE_PCT);
                      const net = b.totalAmount - fee;
                      return (
                        <TableRow key={b._id}>
                          <TableCell className="font-medium">{b.userId?.fullName ?? "—"}</TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-[140px] truncate">
                            {b.source} → {b.destination}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                              {b.tripType === "oneWay" ? "One Way" : b.tripType === "roundTrip" ? "Round Trip" : "Monthly"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">{b.pickupDate}</TableCell>
                          <TableCell className="font-medium">{fmt(b.totalAmount)}</TableCell>
                          <TableCell className="text-gray-500">- {fmt(fee)}</TableCell>
                          <TableCell className="font-medium text-emerald-600">{fmt(net)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Totals row */}
                    <TableRow className="bg-emerald-50 font-semibold">
                      <TableCell colSpan={4} className="text-right text-gray-700">Totals</TableCell>
                      <TableCell className="text-gray-900">{fmt(totalRevenue)}</TableCell>
                      <TableCell className="text-gray-500">- {fmt(totalFees)}</TableCell>
                      <TableCell className="text-emerald-700">{fmt(totalNet)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approved */}
        <TabsContent value="approved" className="mt-6">
          <BookingTable bookings={approved} title="Approved Bookings" icon={<TrendingUp className="w-5 h-5 text-blue-600" />} />
        </TabsContent>

        {/* Pending */}
        <TabsContent value="pending" className="mt-6">
          <BookingTable bookings={pending} title="Pending Bookings" icon={<Clock className="w-5 h-5 text-amber-600" />} />
        </TabsContent>

        {/* Canceled */}
        <TabsContent value="canceled" className="mt-6">
          <BookingTable bookings={canceled} title="Canceled Bookings" icon={<XCircle className="w-5 h-5 text-red-600" />} />
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
}: {
  bookings: Booking[];
  title: string;
  icon: React.ReactNode;
}) {
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
              {bookings.map((b) => (
                <TableRow key={b._id}>
                  <TableCell className="font-medium">{b.userId?.fullName ?? "—"}</TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-[140px] truncate">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {b.source} → {b.destination}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {b.tripType === "oneWay" ? "One Way" : b.tripType === "roundTrip" ? "Round Trip" : "Monthly"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{b.pickupDate}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-3 h-3 text-gray-500" />
                      {b.totalAmount.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        b.status === "Completed" ? "success" :
                          b.status === "Approved" ? "info" :
                            b.status === "Pending" ? "warning" : "error"
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
        )}
      </CardContent>
    </Card>
  );
}
