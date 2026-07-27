import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  UserX,
  User,
  Car,
  Clock,
  CheckCircle,
  Eye,
  MessageSquare,
  Gavel,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import { useAdminComplaints, useUpdateComplaintStatus } from "@/lib/queries";
import type { Complaint } from "@/types/api";
import { usePagination } from "@/lib/usePagination";
import { Pagination } from "@/components/Pagination";

export function Complaints() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const { data: complaints = [], isLoading, error, refetch } = useAdminComplaints();
  const updateStatusMutation = useUpdateComplaintStatus();

  const handleResolve = async (id: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: "resolved" });
      if (selectedComplaint?.id === id) {
        setSelectedComplaint((prev) => prev ? { ...prev, status: "resolved" } : null);
      }
    } catch (err) {
      console.error("Failed to resolve complaint:", err);
    }
  };

  const handleSetInReview = async (id: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: "in-review" });
      if (selectedComplaint?.id === id) {
        setSelectedComplaint((prev) => prev ? { ...prev, status: "in-review" } : null);
      }
    } catch (err) {
      console.error("Failed to set complaint in review:", err);
    }
  };

  const pagination = usePagination();

  const filteredComplaints = complaints.filter((complaint) => {
    if (typeFilter !== "all" && complaint.type !== typeFilter) return false;
    if (statusFilter !== "all" && complaint.status !== statusFilter) return false;
    return true;
  });

  // Update pagination total when filtered data changes
  const filteredCount = filteredComplaints.length;
  const [prevCount, setPrevCount] = useState(0);
  if (filteredCount !== prevCount) {
    setPrevCount(filteredCount);
    pagination.setTotal(filteredCount);
  }

  const paginatedComplaints = pagination.slice(filteredComplaints);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "passenger-vs-captain":
        return "Passenger vs Captain";
      case "captain-vs-passenger":
        return "Captain vs Passenger";
      case "tourist-booking":
        return "Tourist & Booking";
      default:
        return type;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "passenger-vs-captain":
        return (
          <Badge variant="error" className="text-xs">
            <UserX className="w-3 h-3 mr-1" />
            Passenger vs Captain
          </Badge>
        );
      case "captain-vs-passenger":
        return (
          <Badge variant="warning" className="text-xs">
            <User className="w-3 h-3 mr-1" />
            Captain vs Passenger
          </Badge>
        );
      case "tourist-booking":
        return (
          <Badge variant="info" className="text-xs">
            <Car className="w-3 h-3 mr-1" />
            Tourist & Booking
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-xs">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="error" className="text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Open
          </Badge>
        );
      case "in-review":
        return (
          <Badge variant="warning" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            In Review
          </Badge>
        );
      case "resolved":
        return (
          <Badge variant="success" className="text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolved
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error instanceof Error ? error.message : "Failed to load complaints"}
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Type:</span>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="passenger-vs-captain">Passenger vs Captain</SelectItem>
                    <SelectItem value="captain-vs-passenger">Captain vs Passenger</SelectItem>
                    <SelectItem value="tourist-booking">Tourist & Booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Complaint Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {paginatedComplaints.map((complaint, index) => (
          <Card key={complaint.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 80}ms` }}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getTypeBadge(complaint.type)}
                  {complaint.category && (
                    <Badge variant="outline" className="text-xs border-slate-200 text-slate-700 bg-slate-50">
                      {complaint.category}
                    </Badge>
                  )}
                  {getStatusBadge(complaint.status)}
                </div>
                <span className="text-xs text-gray-400">{complaint.timestamp}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Complainant</p>
                <p className="font-medium">{complaint.complainantName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-sm text-gray-700 line-clamp-2">{complaint.description}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Car className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Related Captain:</span>
                <span className="font-medium text-gray-800">
                  {complaint.relatedCaptain || "(Not Assigned)"}
                </span>
              </div>
              {complaint.relatedPassenger && (
                <div className="flex items-center gap-2 text-sm">
                  <UserX className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Related Passenger:</span>
                  <span className="font-medium">{complaint.relatedPassenger}</span>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  onClick={() => setSelectedComplaint(complaint)}
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Gavel className="w-4 h-4 mr-1" />
                  Take Action
                </Button>
                {complaint.status !== "resolved" && (
                  <Button
                    onClick={() => handleResolve(complaint.id)}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Mark Resolved
                  </Button>
                )}
                <Button onClick={() => setSelectedComplaint(complaint)} size="sm" variant="outline">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredComplaints.length > 0 && (
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={filteredComplaints.length}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
          onLimitChange={pagination.setLimit}
        />
      )}

      {filteredComplaints.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No complaints found matching your filters</p>
          </CardContent>
        </Card>
      )}

      {/* Modal Dialog Backdrop & Dialog */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedComplaint(null)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getTypeBadge(selectedComplaint.type)}
                {selectedComplaint.category && (
                  <Badge variant="outline" className="text-xs border-slate-200 text-slate-700 bg-slate-50">
                    {selectedComplaint.category}
                  </Badge>
                )}
                {getStatusBadge(selectedComplaint.status)}
              </div>
              <h2 className="text-xl font-bold text-gray-900">Complaint Details</h2>
              <p className="text-xs text-gray-400">ID: {selectedComplaint.id} • {selectedComplaint.timestamp}</p>
            </div>

            <div className="space-y-4 border-y py-4">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Complainant</span>
                <p className="text-sm font-semibold text-gray-800">{selectedComplaint.complainantName}</p>
              </div>

              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</span>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-1 whitespace-pre-line">
                  {selectedComplaint.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Related Captain</span>
                  <p className="text-sm text-gray-800 font-medium">
                    {selectedComplaint.relatedCaptain || "(Not Assigned)"}
                  </p>
                </div>
                {selectedComplaint.relatedPassenger && (
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Related Passenger</span>
                    <p className="text-sm text-gray-800 font-medium">{selectedComplaint.relatedPassenger}</p>
                  </div>
                )}
                {selectedComplaint.bookingId && (
                  <div className="col-span-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Booking ID</span>
                    <p className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit mt-1">
                      {selectedComplaint.bookingId}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedComplaint(null)}
              >
                Close
              </Button>
              {selectedComplaint.status === "open" && (
                <Button
                  variant="outline"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50"
                  onClick={() => handleSetInReview(selectedComplaint.id)}
                  disabled={updateStatusMutation.isPending}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Mark In-Review
                </Button>
              )}
              {selectedComplaint.status !== "resolved" && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleResolve(selectedComplaint.id)}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark Resolved
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}