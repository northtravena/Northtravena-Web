// src/lib/queries.ts — Centralised React Query hooks for every data-fetching page.
// staleTime is set globally to 2 min in main.jsx, so switching tabs won't re-fetch
// unless data is actually stale.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Booking, Captain, UserService, Service, ServiceType, VehicleRate, AdminUser, Passenger, PassengerLocation, Complaint } from "@/types/api";

// ─── Users (for dropdowns) ───────────────────────────────────────────────────
export function useAllUsers() {
  return useQuery({
    queryKey: ["admin", "users", "all"],
    queryFn: () => api.get<AdminUser[]>("/admin/users"),
  });
}

// ─── Query Keys ────────────────────────────────────────────────────────────────
export const QK = {
  // Admin — bookings
  adminBookings: (status?: string) => ["admin", "bookings", status ?? "all"] as const,
  // Admin — captains
  adminCaptains: (status: string) => ["admin", "captains", status] as const,
  // Admin — passengers
  adminPassengers: (matchStatus?: string) => ["admin", "passengers", matchStatus ?? "all"] as const,
  adminPassengersUnmatched: () => ["admin", "passengers", "unmatched"] as const,
  // Admin — user-services
  adminUserServices: (status?: string) => ["admin", "user-services", status ?? "all"] as const,
  // Admin — services catalog
  adminServices: () => ["admin", "services"] as const,
  // Public catalog
  serviceTypes: () => ["service-types"] as const,
  vehicleRates: () => ["vehicle-rates"] as const,
  // Admin users / passengers
  adminUsers: (role?: string, q?: string) => ["admin", "users", role, q] as const,
  // Firebase
  firebaseBookings: () => ["firebase", "bookings"] as const,
  firebaseUserServices: () => ["firebase", "user-services"] as const,
  firebaseUsers: () => ["firebase", "users"] as const,
} as const;

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function useAllBookings() {
  return useQuery({
    queryKey: QK.adminBookings(),
    queryFn: () => api.get<Booking[]>("/admin/bookings"),
  });
}

export function useApprovedBookings() {
  return useQuery({
    queryKey: QK.adminBookings("Approved"),
    queryFn: () => api.get<Booking[]>("/admin/bookings?status=Approved"),
  });
}

export function usePendingUserServices() {
  return useQuery({
    queryKey: QK.adminUserServices("Pending"),
    queryFn: () => api.get<UserService[]>("/admin/user-services?status=Pending"),
  });
}

export function useActiveCaptains() {
  return useQuery({
    queryKey: QK.adminCaptains("active"),
    queryFn: () => api.get<Captain[]>("/admin/captains?status=active"),
  });
}

// ─── Captains page ─────────────────────────────────────────────────────────────
export function useCaptainsByStatus(status: string) {
  return useQuery({
    queryKey: QK.adminCaptains(status),
    queryFn: () => api.get<Captain[]>(`/admin/captains?status=${status}`),
  });
}

// ─── Rides page ────────────────────────────────────────────────────────────────
export function useBookingsByStatus(status: string) {
  return useQuery({
    queryKey: QK.adminBookings(status),
    queryFn: () => api.get<Booking[]>(`/admin/bookings?status=${status}`),
  });
}

// ─── Fleet page ────────────────────────────────────────────────────────────────
export function useAdminServices() {
  return useQuery({
    queryKey: QK.adminServices(),
    queryFn: () => api.get<Service[]>("/admin/services"),
  });
}

export function useServiceTypes() {
  return useQuery({
    queryKey: QK.serviceTypes(),
    queryFn: () => api.get<ServiceType[]>("/service-types"),
  });
}

export function useVehicleRates() {
  return useQuery({
    queryKey: QK.vehicleRates(),
    queryFn: () => api.get<VehicleRate[]>("/vehicle-rates"),
  });
}

// ─── Passengers page ───────────────────────────────────────────────────────────
export function usePassengers(search: string) {
  const q = search.trim();
  return useQuery({
    queryKey: QK.adminUsers("user", q),
    queryFn: () =>
      api.get<AdminUser[]>(q ? `/admin/users?role=user&q=${encodeURIComponent(q)}` : "/admin/users?role=user"),
  });
}

// ─── Daily Rides — Map ───────────────────────────────────────────────────────
export function usePassengerLocations() {
  return useQuery({
    queryKey: ["admin", "passenger-locations"],
    queryFn: () => api.get<PassengerLocation[]>("/admin/passengers/all-locations"),
    refetchInterval: 30_000, // refresh every 30s for the map
  });
}

// ─── Daily Rides — Passengers ─────────────────────────────────────────────────

export function useDailyRidePassengers(matchStatus?: string) {
  const qs = matchStatus && matchStatus !== "all" ? `?matchStatus=${matchStatus}` : "";
  return useQuery({
    queryKey: QK.adminPassengers(matchStatus),
    queryFn: () => api.get<Passenger[]>(`/admin/passengers${qs}`),
  });
}

export function useUnmatchedPassengers() {
  return useQuery({
    queryKey: QK.adminPassengersUnmatched(),
    queryFn: () => api.get<Passenger[]>("/admin/passengers/unmatched"),
  });
}

export function usePassengerById(id: string) {
  return useQuery({
    queryKey: ["admin", "passengers", id],
    queryFn: () => api.get<Passenger>(`/admin/passengers/${id}`),
    enabled: !!id,
  });
}

export function useCreatePassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Passenger>("/admin/passengers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "passengers"] });
      qc.invalidateQueries({ queryKey: ["admin", "passengers", "available-firebase-users"] });
    },
  });
}

export function useUpdatePassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch<Passenger>(`/admin/passengers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "passengers"] }),
  });
}

export function useDeletePassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/passengers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "passengers"] }),
  });
}

// ─── All Users page ────────────────────────────────────────────────────────────
export function useFirebaseUsers() {
  return useQuery({
    queryKey: QK.firebaseUsers(),
    queryFn: () => api.get<unknown[]>("/firebase/users"),
  });
}

// ─── Passengers page — Firebase users ─────────────────────────────────────────
export function useFirebasePassengers() {
  return useQuery({
    queryKey: ["firebase", "passengers"],
    queryFn: () => api.get<unknown[]>("/firebase/users"),
    // Transform Firebase users to match expected passenger structure
    select: (users) => {
      return (users as any[]).filter((user) => {
        const role = String(user.role ?? "user").toLowerCase();
        return role === "user"; // Only return users with role "user"
      });
    },
  });
}

// ─── Update Firebase Passenger (User) ─────────────────────────────────────────
export function useUpdateFirebasePassenger() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/firebase/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firebase", "passengers"] });
    },
  });
}

// ─── Captains page — Firebase captains ────────────────────────────────────────
export function useFirebaseCaptains() {
  return useQuery({
    queryKey: ["firebase", "captains"],
    queryFn: () => api.get<unknown[]>("/firebase/captains"),
    // Returns all captains from Firebase
  });
}

// ─── Available Firebase Users for Passenger Registration ──────────────────────
export function useAvailableFirebaseUsers() {
  return useQuery({
    queryKey: ["admin", "passengers", "available-firebase-users"],
    queryFn: () => api.get<unknown[]>("/admin/passengers/available-firebase-users"),
  });
}

// ─── Services (Firebase bookings) page ────────────────────────────────────────
export function useFirebaseBookings() {
  return useQuery({
    queryKey: QK.firebaseBookings(),
    queryFn: () => api.get<unknown[]>("/firebase/bookings"),
  });
}

// ─── Firebase Bookings with Ride Type Filter ──────────────────────────────────
export function useFirebaseBookingsByRideType(rideType?: string) {
  return useQuery({
    queryKey: ["firebase", "bookings", rideType],
    queryFn: () => {
      const url = rideType
        ? `/firebase/bookings?rideType=${rideType}`
        : "/firebase/bookings";
      return api.get<unknown[]>(url);
    },
  });
}

// ─── App Services (Firebase user-services) page ───────────────────────────────
export function useFirebaseUserServices() {
  return useQuery({
    queryKey: QK.firebaseUserServices(),
    queryFn: () => api.get<unknown[]>("/firebase/user-services"),
  });
}

export function useUpdateFirebaseUserService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/firebase/user-services/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.firebaseUserServices() }),
  });
}

// ─── Transactions page ─────────────────────────────────────────────────────────
// re-uses useAllBookings() — same query key, served from cache

// ─── Mutation helpers — invalidate relevant keys after writes ──────────────────

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/bookings/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bookings"] }),
  });
}

export function useUpdateUserServiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/user-services/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "user-services"] }),
  });
}

export function useUpdateCaptainStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      api.patch(`/admin/captains/${id}/${action}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "captains"] }),
  });
}

// ─── Firebase Captains — Update Status ────────────────────────────────────────
export function useUpdateFirebaseCaptainStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      api.patch(`/firebase/captains/${id}/${action}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["firebase", "captains"] });
    },
  });
}

export function useUpdateCaptain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/admin/captains/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "captains"] }),
  });
}

export function useDeleteCaptain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/captains/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "captains"] }),
  });
}

export function useCreateCaptain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Captain>("/admin/captains", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "captains"] }),
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, string | number>) => api.post<Service>("/admin/services", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.adminServices() }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string | number> }) =>
      api.patch<Service>(`/admin/services/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.adminServices() }),
  });
}

export function useDeactivateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<Service>(`/admin/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.adminServices() }),
  });
}

export function useCreateServiceType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<ServiceType>("/admin/service-types", { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.serviceTypes() }),
  });
}

export function useUpsertVehicleRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tripType, rates }: { tripType: string; rates: Record<string, number> }) =>
      api.put<VehicleRate>(`/admin/vehicle-rates/${tripType}`, { rates }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.vehicleRates() }),
  });
}

export function useUpdateFirebaseBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/firebase/bookings/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.firebaseBookings() }),
  });
}

// ─── Complaints ──────────────────────────────────────────────────────────────
export function useAdminComplaints() {
  return useQuery({
    queryKey: ["admin", "complaints"],
    queryFn: () => api.get<Complaint[]>("/admin/complaints"),
  });
}

export function useUpdateComplaintStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/complaints/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "complaints"] });
    },
  });
}
