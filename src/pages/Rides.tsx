import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Car, Clock, CheckCircle, XCircle, MapPin, IndianRupee, Navigation, RefreshCw, Calendar, Map, List,
} from "lucide-react";
import type { Booking } from "@/types/api";
import { LiveCaptainMap } from "@/components/LiveCaptainMap";
import { MapControls, type MatchStatusFilter, type CaptainStatusFilter } from "@/components/MapControls";
import { toast } from "sonner";
import { useBookingsByStatus, useUpdateBookingStatus } from "@/lib/queries";

type BookingStatus = Booking["status"];

const STATUS_TABS: {
  key: BookingStatus;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { key: "Pending",   label: "Pending",   icon: Clock,       color: "text-amber-600"  },
  { key: "Approved",  label: "Approved",  icon: Navigation,  color: "text-blue-600"   },
  { key: "Completed", label: "Completed", icon: CheckCircle, color: "text-green-600"  },
  { key: "Canceled",  label: "Cancelled", icon: XCircle,     color: "text-red-600"    },
];

function statusBadge(status: BookingStatus) {
  switch (status) {
    case "Pending":   return <Badge variant="warning"   className="text-xs"><Clock       className="w-3 h-3 mr-1" />Pending</Badge>;
    case "Approved":  return <Badge variant="info"      className="text-xs"><Navigation  className="w-3 h-3 mr-1" />Approved</Badge>;
    case "Completed": return <Badge variant="success"   className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
    case "Canceled":  return <Badge variant="error"     className="text-xs"><XCircle     className="w-3 h-3 mr-1" />Cancelled</Badge>;
    default:          return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }
}

function tripTypeLabel(type?: string) {
  if (!type) return "—";
  const t = type.toLowerCase().replace(/[_\s-]/g, "");
  if (t === "oneway")    return "One Way";
  if (t === "roundtrip") return "Round Trip";
  if (t === "monthly")   return "Monthly";
  return type;
}

export function Rides() {
  const [activeTab, setActiveTab] = useState<BookingStatus>("Pending");
  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const [mapCenter, setMapCenter] = useState({ lat: 35.9208, lng: 74.3145, radius: 50 });
  const [clusteringEnabled, setClusteringEnabled] = useState(false);
  const [mapMatchFilter, setMapMatchFilter] = useState<MatchStatusFilter>("all");
  const [captainStatusFilter, setCaptainStatusFilter] = useState<CaptainStatusFilter>("all");

  const { data: pending   = [], isLoading, error, refetch: refetchPending }   = useBookingsByStatus("Pending");
  const { data: approved  = [], refetch: refetchApproved  } = useBookingsByStatus("Approved");
  const { data: completed = [], refetch: refetchCompleted } = useBookingsByStatus("Completed");
  const { data: canceled  = [], refetch: refetchCanceled  } = useBookingsByStatus("Canceled");

  const bookingsByStatus: Record<BookingStatus, Booking[]> = {
    Pending: pending, Approved: approved, Completed: completed, Canceled: canceled,
  };

  const updateStatus = useUpdateBookingStatus();

  const refetchAll = () => {
    refetchPending(); refetchApproved(); refetchCompleted(); refetchCanceled();
  };

  const handleUpdateStatus = async (id: string, status: BookingStatus) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(`Ride ${status.toLowerCase()} successfully`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error instanceof Error ? error.message : "Failed to load rides"}</div>
        <Button onClick={refetchAll} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        {/* View toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === "table"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <List className="w-4 h-4" />
            Table
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === "map"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Map className="w-4 h-4" />
            Map
          </button>
        </div>
        <Button onClick={refetchAll} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Map View */}
      {viewMode === "map" && (
        <div className="space-y-4">
          <MapControls
            onLocationChange={(lat, lng, radius) => setMapCenter({ lat, lng, radius })}
            matchStatusFilter={mapMatchFilter}
            onMatchStatusChange={setMapMatchFilter}
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
              showCaptains={true}
              showPassengers={true}
              showRoutes={true}
              showConnections={true}
              compactLegend={false}
              enableClustering={clusteringEnabled}
              matchStatusFilter={mapMatchFilter}
              captainStatusFilter={captainStatusFilter}
            />
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BookingStatus)} className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          {STATUS_TABS.map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-1.5">
              <Icon className="w-4 h-4" />
              {label} ({bookingsByStatus[key].length})
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map(({ key, label, icon: Icon, color }) => (
          <TabsContent key={key} value={key} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${color}`} />
                  {label} Rides
                  <span className="ml-auto text-sm font-normal text-gray-400">
                    {bookingsByStatus[key].length} total
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bookingsByStatus[key].length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>No {label.toLowerCase()} rides</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Passenger</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Trip Type</TableHead>
                        <TableHead>Pickup</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        {(key === "Pending" || key === "Approved") && (
                          <TableHead>Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingsByStatus[key].map((b) => (
                        <TableRow key={b._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{b.userId?.fullName ?? "—"}</p>
                              <p className="text-xs text-gray-400">{b.userId?.phoneNo ?? ""}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[160px]">
                                {b.source} → {b.destination}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                              {tripTypeLabel(b.tripType)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Calendar className="w-3 h-3" />
                              <span>{b.pickupDate}</span>
                            </div>
                            <p className="text-xs text-gray-400">{b.pickupTime}</p>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1">
                              <IndianRupee className="w-3 h-3 text-gray-500" />
                              {b.totalAmount.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(b.status)}</TableCell>
                          {key === "Pending" && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs px-2 h-7"
                                  disabled={updateStatus.isPending}
                                  onClick={() => handleUpdateStatus(b._id, "Approved")}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 text-xs px-2 h-7"
                                  disabled={updateStatus.isPending}
                                  onClick={() => handleUpdateStatus(b._id, "Canceled")}>
                                  Decline
                                </Button>
                              </div>
                            </TableCell>
                          )}
                          {key === "Approved" && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs px-2 h-7"
                                  disabled={updateStatus.isPending}
                                  onClick={() => handleUpdateStatus(b._id, "Completed")}>
                                  Complete
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 text-xs px-2 h-7"
                                  disabled={updateStatus.isPending}
                                  onClick={() => handleUpdateStatus(b._id, "Canceled")}>
                                  Cancel
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      )}
    </div>
  );
}
