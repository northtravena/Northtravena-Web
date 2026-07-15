import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Car, MapPin, Calendar, RefreshCw, Clock, CheckCircle, XCircle,
} from "lucide-react";
import { useFirebaseBookingsByRideType } from "@/lib/queries";

type RideTypeFilter = "all" | "one_way" | "round_trip" | "monthly" | "daily";

const RIDE_TYPE_TABS: {
    key: RideTypeFilter;
    label: string;
    icon: React.ElementType;
    color: string;
}[] = [
        { key: "all", label: "All Rides", icon: Car, color: "text-gray-600" },
        { key: "monthly", label: "Monthly", icon: Calendar, color: "text-blue-600" },
        { key: "daily", label: "Daily", icon: MapPin, color: "text-green-600" },
        { key: "one_way", label: "One Way", icon: MapPin, color: "text-emerald-600" },
        { key: "round_trip", label: "Round Trip", icon: MapPin, color: "text-purple-600" },
    ];

function formatRideType(type?: string) {
    if (!type) return "—";
    const t = type.toLowerCase().replace(/[_\s-]/g, "");
    if (t === "oneway" || t === "daily") return "Daily";
    if (t === "roundtrip") return "Round Trip";
    if (t === "monthly") return "Monthly";
    return type;
}

function rideTypeBadge(type?: string) {
    const formatted = formatRideType(type);
    if (formatted === "One Way") {
        return <Badge variant="success" className="text-xs">{formatted}</Badge>;
    }
    if (formatted === "Round Trip") {
        return <Badge variant="info" className="text-xs">{formatted}</Badge>;
    }
    if (formatted === "Monthly") {
        return <Badge variant="secondary" className="text-xs">{formatted}</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">{formatted}</Badge>;
}

function statusBadge(status?: string) {
    if (!status) return <Badge variant="secondary" className="text-xs">Unknown</Badge>;

    switch (status.toLowerCase()) {
        case "pending":
            return <Badge variant="warning" className="text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
        case "accepted":
            return <Badge variant="info" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>;
        case "arriving_pickup":
            return <Badge variant="info" className="text-xs">Arriving</Badge>;
        case "in_progress":
            return <Badge variant="info" className="text-xs">In Progress</Badge>;
        case "completed":
            return <Badge variant="success" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
        case "cancelled":
        case "canceled":
            return <Badge variant="error" className="text-xs"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
        default:
            return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
}

function formatDate(value: unknown): string {
    if (!value) return "—";

    try {
        // Handle Firestore timestamp object
        if (typeof value === "object" && value !== null && "_seconds" in value) {
            const timestamp = value as { _seconds: number; _nanoseconds: number };
            const date = new Date(timestamp._seconds * 1000);
            return date.toLocaleDateString();
        }

        // Handle string date
        if (typeof value === "string") {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString();
            }
            return value;
        }

        return String(value);
    } catch {
        return "—";
    }
}

function formatTime(value: unknown): string {
    if (!value) return "—";

    try {
        // Handle Firestore timestamp object
        if (typeof value === "object" && value !== null && "_seconds" in value) {
            const timestamp = value as { _seconds: number; _nanoseconds: number };
            const date = new Date(timestamp._seconds * 1000);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Handle string time
        if (typeof value === "string") {
            return value;
        }

        return String(value);
    } catch {
        return "—";
    }
}

export function FirebaseBookings() {
    const [activeTab, setActiveTab] = useState<RideTypeFilter>("all");

    // Query based on selected filter
    const queryRideType = activeTab === "all" ? undefined : activeTab;
    const { data: bookingsData = [], isLoading, error, refetch } = useFirebaseBookingsByRideType(queryRideType);

    // Cast to proper type
    const bookings = bookingsData as Array<Record<string, unknown>>;

    // Count bookings by type
    const counts = {
        all: bookings.length,
        monthly: bookings.filter(b => {
            const type = (b.rideType as string)?.toLowerCase();
            return type === "monthly";
        }).length,
        daily: bookings.filter(b => {
            const type = (b.rideType as string)?.toLowerCase().replace(/[_\s-]/g, "");
            return type === "daily" || type === "oneway";
        }).length,
        one_way: bookings.filter(b => {
            const type = (b.rideType as string)?.toLowerCase();
            return type === "one_way";
        }).length,
        round_trip: bookings.filter(b => {
            const type = (b.rideType as string)?.toLowerCase();
            return type === "round_trip" || type === "roundtrip";
        }).length,
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
                    {error instanceof Error ? error.message : "Failed to load bookings"}
                </div>
                <Button onClick={() => refetch()} variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Firebase Bookings</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage One Way, Round Trip, and Monthly rides from Firebase
                    </p>
                </div>
                <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RideTypeFilter)} className="w-full">
                <TabsList className="grid w-full max-w-3xl grid-cols-5">
                    {RIDE_TYPE_TABS.map(({ key, label, icon: Icon }) => (
                        <TabsTrigger key={key} value={key} className="flex items-center gap-1.5">
                            <Icon className="w-4 h-4" />
                            {label} ({counts[key]})
                        </TabsTrigger>
                    ))}
                </TabsList>

                {RIDE_TYPE_TABS.map(({ key, label, icon: Icon, color }) => (
                    <TabsContent key={key} value={key} className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Icon className={`w-5 h-5 ${color}`} />
                                    {label}
                                    <span className="ml-auto text-sm font-normal text-gray-400">
                                        {counts[key]} total
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {counts[key] === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p>No {label.toLowerCase()} rides</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Passenger</TableHead>
                                                    <TableHead>Route</TableHead>
                                                    <TableHead>Ride Type</TableHead>
                                                    <TableHead>Pickup Date/Time</TableHead>
                                                    <TableHead>Vehicle</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Assigned Captain</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {bookings.map((b, idx) => {
                                                    const user = b._user as Record<string, unknown> | undefined;
                                                    const vehicle = b._vehicle as Record<string, unknown> | undefined;

                                                    return (
                                                        <TableRow key={b.id as string || idx}>
                                                            <TableCell>
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {(b.passengerName as string) ||
                                                                            (user?.fullName as string) ||
                                                                            (user?.name as string) ||
                                                                            "—"}
                                                                    </p>
                                                                    <p className="text-xs text-gray-400">
                                                                        {(b.passengerPhone as string) ||
                                                                            (user?.phoneNo as string) ||
                                                                            (user?.phone as string) ||
                                                                            ""}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-start gap-1 text-sm text-gray-600">
                                                                    <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                                                    <div className="min-w-0">
                                                                        <div className="truncate max-w-[200px]">
                                                                            {(b.pickupLocation as string) || (b.source as string) || "—"}
                                                                        </div>
                                                                        <div className="text-xs text-gray-400">→</div>
                                                                        <div className="truncate max-w-[200px]">
                                                                            {(b.dropLocation as string) || (b.destination as string) || "—"}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{rideTypeBadge(b.rideType as string)}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                                                    <Calendar className="w-3 h-3" />
                                                                    <span>{formatDate(b.pickupDateTime || b.pickupDate)}</span>
                                                                </div>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {formatTime(b.pickupDateTime || b.pickupTime)}
                                                                </p>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                                                    {(b.vehicleType as string) ||
                                                                        (vehicle?.name as string) ||
                                                                        (vehicle?.label as string) ||
                                                                        "—"}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>{statusBadge(b.status as string)}</TableCell>
                                                            <TableCell>
                                                                <div>
                                                                    <p className="text-sm font-medium">
                                                                        {(b.acceptedCaptainName as string) ||
                                                                            (b.assignedCaptainName as string) ||
                                                                            "—"}
                                                                    </p>
                                                                    {(b.acceptedCaptainId || b.assignedCaptainId) && (
                                                                        <p className="text-xs text-gray-400">
                                                                            ID: {((b.acceptedCaptainId || b.assignedCaptainId) as string).substring(0, 8)}...
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
