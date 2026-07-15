// TODO: Connect to backend API — no complaints model or routes exist in the backend yet
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
} from "lucide-react";
import { complaints } from "@/data/mockData";

export function Complaints() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredComplaints = complaints.filter((complaint) => {
    if (typeFilter !== "all" && complaint.type !== typeFilter) return false;
    if (statusFilter !== "all" && complaint.status !== statusFilter) return false;
    return true;
  });

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

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

      {/* Complaint Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredComplaints.map((complaint, index) => (
          <Card key={complaint.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 80}ms` }}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getTypeBadge(complaint.type)}
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
                <p className="text-sm text-gray-700">{complaint.description}</p>
              </div>
              {complaint.relatedCaptain && (
                <div className="flex items-center gap-2 text-sm">
                  <Car className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Related Captain:</span>
                  <span className="font-medium">{complaint.relatedCaptain}</span>
                </div>
              )}
              {complaint.relatedPassenger && (
                <div className="flex items-center gap-2 text-sm">
                  <UserX className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Related Passenger:</span>
                  <span className="font-medium">{complaint.relatedPassenger}</span>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  <Gavel className="w-4 h-4 mr-1" />
                  Take Action
                </Button>
                {complaint.status !== "resolved" && (
                  <Button size="sm" variant="outline" className="flex-1">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Mark Resolved
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredComplaints.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No complaints found matching your filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}