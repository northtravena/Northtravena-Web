// Mock data for North Travena Admin Dashboard

export interface Captain {
  id: string;
  name: string;
  phone: string;
  route: string;
  vehicle: string;
  vehicleReg: string;
  passengers: number;
  rating: number;
  status: 'active' | 'pending' | 'inactive';
  cnic: boolean;
  licence: boolean;
  vehicleRegistration: boolean;
  policeClearance: boolean;
  avatar?: string;
}

export interface Passenger {
  id: string;
  name: string;
  phone: string;
  residence: string;
  workplace: string;
  assignedCaptain: string | null;
  status: 'matched' | 'awaiting';
  avatar?: string;
}

export interface Ride {
  id: string;
  passengerName: string;
  captainName: string;
  route: string;
  pickupTime: string;
  status: 'new' | 'in-progress' | 'completed' | 'cancelled';
  eta?: string;
  amount: number;
}

export interface Service {
  id: string;
  customerName: string;
  serviceType: 'tour' | 'pick-drop' | 'trophy-hunt';
  destination: string;
  bookingDate: string;
  status: 'confirmed' | 'pending' | 'enquiry';
  amount: number;
}

export interface Complaint {
  id: string;
  type: 'passenger-vs-captain' | 'captain-vs-passenger' | 'tourist-booking';
  complainantName: string;
  timestamp: string;
  description: string;
  status: 'open' | 'in-review' | 'resolved';
  relatedCaptain?: string;
  relatedPassenger?: string;
}

export interface Transaction {
  id: string;
  type: 'ride' | 'tourist' | 'payout' | 'refund';
  description: string;
  date: string;
  gross?: number;
  platformFee?: number;
  net?: number;
  amount?: number;
}

export interface ReportData {
  captainName: string;
  rides: number;
  passengers: number;
  revenue: number;
  rating: number;
  complaints: number;
}

export interface MonthlyTrend {
  month: string;
  captainCount: number;
  passengerCount: number;
  revenue: number;
  complaints: number;
}

// Captains Data
export const captains: Captain[] = [
  {
    id: 'C001',
    name: 'Muhammad Nawaz',
    phone: '+92 300 1234567',
    route: 'Danyore → Jutiyal',
    vehicle: 'Toyota Hiace',
    vehicleReg: 'GLT-2021',
    passengers: 12,
    rating: 4.8,
    status: 'active',
    cnic: true,
    licence: true,
    vehicleRegistration: true,
    policeClearance: true,
  },
  {
    id: 'C002',
    name: 'Ali Hassan',
    phone: '+92 311 2345678',
    route: 'Gilgit Centre → Jutiyal',
    vehicle: 'Suzuki Cultus',
    vehicleReg: 'GLT-1845',
    passengers: 4,
    rating: 4.5,
    status: 'active',
    cnic: true,
    licence: true,
    vehicleRegistration: true,
    policeClearance: true,
  },
  {
    id: 'C003',
    name: 'Karim Dad',
    phone: '+92 322 3456789',
    route: 'Danyore → Gilgit Centre',
    vehicle: 'Honda City',
    vehicleReg: 'GLT-2156',
    passengers: 3,
    rating: 4.2,
    status: 'pending',
    cnic: true,
    licence: true,
    vehicleRegistration: false,
    policeClearance: false,
  },
  {
    id: 'C004',
    name: 'Gulsher Khan',
    phone: '+92 333 4567890',
    route: 'Jutiyal → Danyore',
    vehicle: 'Toyota Corolla',
    vehicleReg: 'GLT-1923',
    passengers: 4,
    rating: 4.6,
    status: 'pending',
    cnic: true,
    licence: false,
    vehicleRegistration: true,
    policeClearance: false,
  },
  {
    id: 'C005',
    name: 'Sikandar Hayat',
    phone: '+92 344 5678901',
    route: 'Gilgit Centre → Danyore',
    vehicle: 'Suzuki Alto',
    vehicleReg: 'GLT-2087',
    passengers: 3,
    rating: 4.0,
    status: 'inactive',
    cnic: true,
    licence: true,
    vehicleRegistration: true,
    policeClearance: true,
  },
  {
    id: 'C006',
    name: 'Rahmat Ullah',
    phone: '+92 355 6789012',
    route: 'Jutiyal → Gilgit Centre',
    vehicle: 'Honda Civic',
    vehicleReg: 'GLT-1756',
    passengers: 4,
    rating: 4.7,
    status: 'active',
    cnic: true,
    licence: true,
    vehicleRegistration: true,
    policeClearance: true,
  },
];

// Passengers Data
export const passengers: Passenger[] = [
  {
    id: 'P001',
    name: 'Fatima Bibi',
    phone: '+92 300 1112223',
    residence: 'Danyore',
    workplace: 'Jutiyal',
    assignedCaptain: 'Muhammad Nawaz',
    status: 'matched',
  },
  {
    id: 'P002',
    name: 'Zainab Hussain',
    phone: '+92 311 2223334',
    residence: 'Gilgit Centre',
    workplace: 'Jutiyal',
    assignedCaptain: 'Ali Hassan',
    status: 'matched',
  },
  {
    id: 'P003',
    name: 'Karim Shah',
    phone: '+92 322 3334445',
    residence: 'Danyore',
    workplace: 'Gilgit Centre',
    assignedCaptain: null,
    status: 'awaiting',
  },
  {
    id: 'P004',
    name: 'Nasreen Akhtar',
    phone: '+92 333 4445556',
    residence: 'Jutiyal',
    workplace: 'Danyore',
    assignedCaptain: null,
    status: 'awaiting',
  },
  {
    id: 'P005',
    name: 'Habib Ullah',
    phone: '+92 344 5556667',
    residence: 'Gilgit Centre',
    workplace: 'Danyore',
    assignedCaptain: 'Sikandar Hayat',
    status: 'matched',
  },
  {
    id: 'P006',
    name: 'Shahla Parveen',
    phone: '+92 355 6667778',
    residence: 'Jutiyal',
    workplace: 'Gilgit Centre',
    assignedCaptain: 'Rahmat Ullah',
    status: 'matched',
  },
  {
    id: 'P007',
    name: 'Anwar Jan',
    phone: '+92 366 7778889',
    residence: 'Danyore',
    workplace: 'Jutiyal',
    assignedCaptain: null,
    status: 'awaiting',
  },
];

// Rides Data
export const rides: Ride[] = [
  {
    id: 'R001',
    passengerName: 'Fatima Bibi',
    captainName: 'Muhammad Nawaz',
    route: 'Danyore → Jutiyal',
    pickupTime: '08:00 AM',
    status: 'completed',
    amount: 4500,
  },
  {
    id: 'R002',
    passengerName: 'Zainab Hussain',
    captainName: 'Ali Hassan',
    route: 'Gilgit Centre → Jutiyal',
    pickupTime: '09:30 AM',
    status: 'in-progress',
    eta: '15 min',
    amount: 3200,
  },
  {
    id: 'R003',
    passengerName: 'Habib Ullah',
    captainName: 'Sikandar Hayat',
    route: 'Gilgit Centre → Danyore',
    pickupTime: '11:00 AM',
    status: 'new',
    amount: 2800,
  },
  {
    id: 'R004',
    passengerName: 'Shahla Parveen',
    captainName: 'Rahmat Ullah',
    route: 'Jutiyal → Gilgit Centre',
    pickupTime: '02:00 PM',
    status: 'new',
    amount: 3500,
  },
  {
    id: 'R005',
    passengerName: 'Unknown Passenger',
    captainName: 'Gulsher Khan',
    route: 'Jutiyal → Danyore',
    pickupTime: '04:00 PM',
    status: 'cancelled',
    amount: 0,
  },
];

// Services Data
export const services: Service[] = [
  {
    id: 'S001',
    customerName: 'Ahmad Farooq',
    serviceType: 'tour',
    destination: 'Fairy Meadows',
    bookingDate: '2024-01-15',
    status: 'confirmed',
    amount: 45000,
  },
  {
    id: 'S002',
    customerName: 'Sara Ahmed',
    serviceType: 'pick-drop',
    destination: 'Gilgit Airport → Hotel',
    bookingDate: '2024-01-18',
    status: 'pending',
    amount: 5000,
  },
  {
    id: 'S003',
    customerName: 'Bilal Khan',
    serviceType: 'trophy-hunt',
    destination: 'Chitral Valley',
    bookingDate: '2024-02-01',
    status: 'confirmed',
    amount: 150000,
  },
  {
    id: 'S004',
    customerName: 'Maria Malik',
    serviceType: 'tour',
    destination: 'Rakaposhi Base Camp',
    bookingDate: '2024-01-20',
    status: 'enquiry',
    amount: 35000,
  },
  {
    id: 'S005',
    customerName: 'Usman Tariq',
    serviceType: 'pick-drop',
    destination: 'Hunza → Skardu',
    bookingDate: '2024-01-22',
    status: 'confirmed',
    amount: 12000,
  },
];

// Complaints Data
export const complaints: Complaint[] = [
  {
    id: 'CM001',
    type: 'passenger-vs-captain',
    complainantName: 'Fatima Bibi',
    timestamp: '2024-01-18 10:30 AM',
    description: 'Captain arrived 30 minutes late for pickup. Had to wait in cold weather.',
    status: 'open',
    relatedCaptain: 'Muhammad Nawaz',
  },
  {
    id: 'CM002',
    type: 'captain-vs-passenger',
    complainantName: 'Ali Hassan',
    timestamp: '2024-01-17 03:45 PM',
    description: 'Passenger cancelled at last minute without notice. Wasted fuel and time.',
    status: 'in-review',
    relatedPassenger: 'Karim Shah',
  },
  {
    id: 'CM003',
    type: 'tourist-booking',
    complainantName: 'Ahmad Farooq',
    timestamp: '2024-01-16 11:20 AM',
    description: 'Tour guide was not available at the scheduled time. Had to reschedule.',
    status: 'open',
  },
  {
    id: 'CM004',
    type: 'passenger-vs-captain',
    complainantName: 'Zainab Hussain',
    timestamp: '2024-01-15 09:00 AM',
    description: 'Vehicle was not clean and AC was not working properly.',
    status: 'resolved',
    relatedCaptain: 'Ali Hassan',
  },
  {
    id: 'CM005',
    type: 'passenger-vs-captain',
    complainantName: 'Nasreen Akhtar',
    timestamp: '2024-01-14 02:30 PM',
    description: 'Driver was using phone while driving. Felt unsafe.',
    status: 'open',
    relatedCaptain: 'Rahmat Ullah',
  },
];

// Transactions Data
export const transactions: Transaction[] = [
  // Monthly Rides
  { id: 'T001', type: 'ride', description: 'Danyore → Jutiyal Route', date: '2024-01-15', gross: 45000, platformFee: 4500, net: 40500 },
  { id: 'T002', type: 'ride', description: 'Gilgit Centre → Jutiyal Route', date: '2024-01-16', gross: 32000, platformFee: 3200, net: 28800 },
  { id: 'T003', type: 'ride', description: 'Danyore → Gilgit Centre Route', date: '2024-01-17', gross: 28000, platformFee: 2800, net: 25200 },
  // Tourist Bookings
  { id: 'T004', type: 'tourist', description: 'Fairy Meadows Tour', date: '2024-01-15', amount: 45000 },
  { id: 'T005', type: 'tourist', description: 'Rakaposhi Base Camp', date: '2024-01-20', amount: 35000 },
  { id: 'T006', type: 'tourist', description: 'Chitral Trophy Hunt', date: '2024-02-01', amount: 150000 },
  // Captain Payouts
  { id: 'T007', type: 'payout', description: 'Muhammad Nawaz - January', date: '2024-02-05', gross: 45000, platformFee: 4500, net: 40500 },
  { id: 'T008', type: 'payout', description: 'Ali Hassan - January', date: '2024-02-05', gross: 32000, platformFee: 3200, net: 28800 },
  // Refunds
  { id: 'T009', type: 'refund', description: 'Cancelled Tour - Maria Malik', date: '2024-01-20', amount: -5000 },
  { id: 'T010', type: 'refund', description: 'Partial Refund - Ahmad Farooq', date: '2024-01-18', amount: -2000 },
];

// Reports Data
export const reportData: ReportData[] = [
  { captainName: 'Muhammad Nawaz', rides: 120, passengers: 480, revenue: 540000, rating: 4.8, complaints: 2 },
  { captainName: 'Ali Hassan', rides: 95, passengers: 380, revenue: 304000, rating: 4.5, complaints: 3 },
  { captainName: 'Rahmat Ullah', rides: 88, passengers: 352, revenue: 308000, rating: 4.7, complaints: 1 },
  { captainName: 'Gulsher Khan', rides: 45, passengers: 180, revenue: 157500, rating: 4.6, complaints: 2 },
  { captainName: 'Sikandar Hayat', rides: 62, passengers: 248, revenue: 173600, rating: 4.0, complaints: 5 },
];

export const monthlyTrends: MonthlyTrend[] = [
  { month: 'August 2024', captainCount: 4, passengerCount: 28, revenue: 420000, complaints: 3 },
  { month: 'September 2024', captainCount: 5, passengerCount: 35, revenue: 525000, complaints: 4 },
  { month: 'October 2024', captainCount: 5, passengerCount: 42, revenue: 630000, complaints: 2 },
  { month: 'November 2024', captainCount: 6, passengerCount: 38, revenue: 570000, complaints: 5 },
  { month: 'December 2024', captainCount: 6, passengerCount: 45, revenue: 675000, complaints: 3 },
  { month: 'January 2025', captainCount: 6, passengerCount: 48, revenue: 720000, complaints: 4 },
];

// Dashboard Stats
export const dashboardStats = {
  totalCaptains: 6,
  totalPassengers: 48,
  ridesToday: 12,
  revenueToday: 54500,
};

// Settings Configuration
export const platformSettings = {
  platformName: 'North Travena',
  platformFeePercentage: 10,
  currency: 'PKR',
  payoutDay: '5th of each month',
  timezone: 'Asia/Karachi',
  language: 'Urdu / English',
  supportEmail: 'support@northtravena.com',
  supportPhone: '+92 577 123456',
};

export const notificationSettings = {
  emailNotifications: true,
  smsNotifications: true,
  pushNotifications: false,
  complaintAlerts: true,
  newBookingAlerts: true,
  captainApprovalAlerts: true,
  weeklyReports: true,
  monthlyReports: true,
};

// Helper functions
export const getCaptainsByStatus = (status: Captain['status']) => 
  captains.filter(c => c.status === status);

export const getPendingApprovalsCount = () => 
  captains.filter(c => c.status === 'pending').length;

export const getOpenComplaintsCount = () => 
  complaints.filter(c => c.status === 'open').length;

export const getAwaitingPassengersCount = () => 
  passengers.filter(p => p.status === 'awaiting').length;

export const getRidesByStatus = (status: Ride['status']) => 
  rides.filter(r => r.status === status);