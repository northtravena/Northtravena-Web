// src/lib/queries.ts — Centralised React Query hooks for every data-fetching page.
// staleTime is set globally to 2 min in main.jsx, so switching tabs won't re-fetch
// unless data is actually stale.

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "./api";
import type { Booking, Captain, UserService, Service, ServiceType, VehicleRate, AdminUser, Passenger, PassengerLocation, Complaint, PaginatedResponse } from "@/types/api";

// ─── Users (for dropdowns) ───────────────────────────────────────────────────
export function useAllUsers() {
  return useQuery({
    queryKey: ["admin", "users", "all"],
    queryFn: () => api.get<AdminUser[]>("/admin/users"),
  });
}

// ─── Query Keys ────────────────────────────────────────────────────────────────
export const QK = {
  // Admin — bookings (paginated)
  adminBookings: (status?: string, page?: number, limit?: number) =>
    ["admin", "bookings", status ?? "all", page ?? 1, limit ?? 20] as const,
  // Admin — captains (paginated)
  adminCaptains: (status: string, page?: number, limit?: number) =>
    ["admin", "captains", status, page ?? 1, limit ?? 20] as const,
  // Admin — passengers (paginated)
  adminPassengers: (matchStatus?: string, page?: number, limit?: number) =>
    ["admin", "passengers", matchStatus ?? "all", page ?? 1, limit ?? 20] as const,
  adminPassengersUnmatched: () => ["admin", "passengers", "unmatched"] as const,
  // Admin — user-services (paginated)
  adminUserServices: (status?: string, page?: number, limit?: number) =>
    ["admin", "user-services", status ?? "all", page ?? 1, limit ?? 20] as const,
  // Admin — services catalog (paginated)
  adminServices: (page?: number, limit?: number) =>
    ["admin", "services", page ?? 1, limit ?? 20] as const,
  // Public catalog
  serviceTypes: () => ["service-types"] as const,
  vehicleRates: () => ["vehicle-rates"] as const,
  // Admin users / passengers (paginated)
  adminUsers: (role?: string, q?: string, page?: number, limit?: number) =>
    ["admin", "users", role, q, page ?? 1, limit ?? 20] as const,
  // Firebase
  firebaseBookings: () => ["firebase", "bookings"] as const,
  firebaseUserServices: () => ["firebase", "user-services"] as const,
  firebaseUsers: () => ["firebase", "users"] as const,
} as const;

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function useAllBookings(page = 1, limit = 20) {
  return useQuery({
    queryKey: QK.adminBookings(undefined, page, limit),
    queryFn: () => api.get<PaginatedResponse<Booking>>(`/admin/bookings?page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
  });
}

export function useApprovedBookings(page = 1, limit = 20) {
  return useQuery({
    queryKey: QK.adminBookings("Approved", page, limit),
    queryFn: () => api.get<PaginatedResponse<Booking>>(`/admin/bookings?status=Approved&page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
  });
}

export function usePendingUserServices(page = 1, limit = 20) {
  return useQuery({
    queryKey: QK.adminUserServices("Pending", page, limit),
    queryFn: () => api.get<PaginatedResponse<UserService>>(`/admin/user-services?status=Pending&page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
  });
}

export function useActiveCaptains(page = 1, limit = 20) {
  return useQuery({
    queryKey: QK.adminCaptains("active", page, limit),
    queryFn: () => api.get<PaginatedResponse<Captain>>(`/admin/captains?status=active&page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
  });
}

// ─── Captains page ─────────────────────────────────────────────────────────────
export function useCaptainsByStatus(status: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: QK.adminCaptains(status, page, limit),
    queryFn: () => api.get<PaginatedResponse<Captain>>(`/admin/captains?status=${status}&page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
  });
}

// ─── Rides page ────────────────────────────────────────────────────────────────
export function useBookingsByStatus(status: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: QK.adminBookings(status, page, limit),
    queryFn: () => api.get<PaginatedResponse<Booking>>(`/admin/bookings?status=${status}&page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
  });
}

// ─── Fleet page ────────────────────────────────────────────────────────────────
export function useAdminServices(page = 1, limit = 20) {
  return useQuery({
    queryKey: QK.adminServices(page, limit),
    queryFn: () => api.get<PaginatedResponse<Service>>(`/admin/services?page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
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
export function usePassengers(search: string, page = 1, limit = 20) {
  const q = search.trim();
  return useQuery({
    queryKey: QK.adminUsers("user", q, page, limit),
    queryFn: () =>
      api.get<PaginatedResponse<AdminUser>>(
        q
          ? `/admin/users?role=user&q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`
          : `/admin/users?role=user&page=${page}&limit=${limit}`
      ),
    placeholderData: keepPreviousData,
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

export function useDailyRidePassengers(matchStatus?: string, page = 1, limit = 20) {
  const params = new URLSearchParams();
  if (matchStatus && matchStatus !== "all") params.set("matchStatus", matchStatus);
  params.set("page", String(page));
  params.set("limit", String(limit));
  const qs = params.toString();
  return useQuery({
    queryKey: QK.adminPassengers(matchStatus, page, limit),
    queryFn: () => api.get<PaginatedResponse<Passenger>>(`/admin/passengers?${qs}`),
    placeholderData: keepPreviousData,
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

// ─── Firebase Ride Bookings (Ride Sharing) ────────────────────────────────────
export function useFirebaseRideBookings() {
  return useQuery({
    queryKey: ["firebase", "ride-bookings"],
    queryFn: () => api.get<unknown[]>("/firebase/ride-bookings"),
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
