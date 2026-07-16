// src/types/api.ts — Backend response types

export interface ApiUser {
  _id?: string;
  id: string;
  email: string;
  fullName: string;
  phoneNo: string;
  role: "admin" | "user";
  createdAt?: string;
}

export interface AdminUser {
  _id: string;
  email: string;
  fullName: string;
  phoneNo: string;
  role: "admin" | "user";
  createdAt: string;
}

export interface Captain {
  _id?: string; // MongoDB ID
  id?: string;  // Firebase ID
  fullName: string;
  phone: string;
  cnic: string;
  licenceNumber: string;
  vehicleType: "car" | "van" | "other";
  vehicleModel: string;
  registrationPlate: string;
  seatCapacity: number;
  // GeoJSON Point — coordinates are [lng, lat]
  routeFrom: { type?: string; coordinates: [number, number]; address: string };
  routeTo: { type?: string; coordinates: [number, number]; address: string };
  currentLocation?: { type?: string; coordinates: [number, number] };
  status: "pending" | "active" | "inactive" | "rejected";
  documentsSubmitted: {
    cnic: boolean;
    licence: boolean;
    registration: boolean;
    policeClearance: boolean;
  };
  images?: {
    cnicFront?: string;
    cnicBack?: string;
    licenceFront?: string;
    licenceBack?: string;
    vehiclePicture?: string;
  };
  rating: number;
  createdAt: string;
  approvedAt?: string;
}

export interface Booking {
  _id: string;
  userId: { _id: string; email: string; fullName: string; phoneNo: string };
  source: string;
  destination: string;
  sourceLocation: { lat: number; lng: number };
  destinationLocation: { lat: number; lng: number };
  pickupDate: string;
  pickupTime: string;
  dropDate?: string;
  dropTime?: string;
  totalAmount: number;
  totalDistance: number;
  totalVehicles: number;
  tripType: "oneWay" | "roundTrip" | "monthly";
  workingDays?: number | null;
  vehicleId?: string;
  vehicleLabel?: string;
  paymentSkipped: boolean;
  status: "Pending" | "Approved" | "Completed" | "Canceled";
  createdAt: string;
  updatedAt: string;
}

export interface UserService {
  _id: string;
  userId: { _id: string; email: string; fullName: string; phoneNo: string };
  vehicleName: string;
  brand: string;
  seats: string;
  oil: string;
  transmissionType: string;
  serviceType: string;
  serviceName: string;
  serviceDescription: string;
  vehicleImage: string;
  amount: number;
  status: "Pending" | "Approved" | "Cancelled" | "Completed";
  createdAt: string;
}

export interface Service {
  _id: string;
  vehicleName: string;
  vehicleLabel: string;
  vehicleImage: string;
  serviceType: string;
  serviceName: string;
  serviceDescription: string;
  amount: number;
  color: string;
  oil: string;
  seats: string;
  transmissionType: string;
  brand: string;
  status: "active" | "inactive";
  createdBy: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface VehicleRate {
  _id: string;
  tripType: string;
  rates: Record<string, number>;
}

export interface ServiceType {
  _id: string;
  name: string;
}

// ─── Daily Rides — Passenger (lightweight for map) ──────────────────────────
export interface PassengerLocation {
  _id: string;
  userId?: { _id: string; fullName: string; phoneNo?: string };
  residence: { type?: string; coordinates: [number, number]; address: string };
  workplace: { type?: string; coordinates: [number, number]; address: string };
  matchStatus: "matched" | "unmatched" | "on-hold";
  assignedCaptain: {
    _id: string;
    fullName: string;
    status?: string;
    routeFrom?: { coordinates: [number, number]; address: string };
    routeTo?: { coordinates: [number, number]; address: string };
  } | string | null;
}

// ─── Daily Rides — Passenger ───────────────────────────────────────────────────
export interface Passenger {
  _id: string;
  passenger_id?: string;
  userId: { _id: string; email: string; fullName: string; phoneNo: string } | string;
  residence: { type?: string; coordinates: [number, number]; address: string };
  workplace: { type?: string; coordinates: [number, number]; address: string };
  matchStatus: "matched" | "unmatched" | "on-hold";
  assignedCaptain: {
    _id: string;
    fullName: string;
    phone: string;
    routeFrom?: { address: string };
    routeTo?: { address: string };
    seatCapacity?: number;
  } | null;
  monthlyFee: number;
  subscriptionStartDate: string | null;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Complaint {
  id: string;
  type: "passenger-vs-captain" | "captain-vs-passenger" | "tourist-booking";
  category?: string;
  complainantName: string;
  timestamp: string;
  description: string;
  status: "open" | "in-review" | "resolved";
  relatedCaptain?: string;
  relatedPassenger?: string;
  bookingId?: string;
}
