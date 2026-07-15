import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserCheck, RefreshCw, Search, Mail, Phone } from "lucide-react";
import { useFirebaseUsers } from "@/lib/queries";

// ─── Firebase user shape ──────────────────────────────────────────────────────
interface FirebaseUser {
  id: string;
  uid?: string;
  name?: string;
  fullName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  phoneNo?: string;
  phoneNumber?: string;
  createdAt?: string | number | { _seconds?: number; seconds?: number };
  createdTime?: string;
  registeredAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getName = (u: FirebaseUser) =>
  u.fullName || u.name || u.displayName || "Unknown";

const getPhone = (u: FirebaseUser) =>
  u.phoneNo || u.phone || u.phoneNumber || "—";

const getDate = (u: FirebaseUser): string => {
  const raw = u.createdAt || u.createdTime || u.registeredAt;
  if (!raw) return "—";
  if (typeof raw === "object" && raw !== null) {
    const secs =
      (raw as { _seconds?: number })._seconds ??
      (raw as { seconds?: number }).seconds;
    if (secs) return new Date(secs * 1000).toLocaleDateString();
  }
  const d = new Date(raw as string | number);
  return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString();
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

// ─── Component ────────────────────────────────────────────────────────────────
export function AllUsers() {
  const [search, setSearch] = useState("");
  const { data: rawUsers = [], isLoading: loading, error, refetch } = useFirebaseUsers();
  const users = rawUsers as FirebaseUser[];

  // Client-side search
  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      getName(u).toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      getPhone(u).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Registered Users
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? "—" : users.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Showing
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50">
              <UserCheck className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? "—" : filtered.length}
            </div>          </CardContent>
        </Card>
      </div>

      {/* ── Table Card ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            All Registered Users
            <span className="text-xs font-normal text-gray-400 bg-gray-100 rounded px-2 py-0.5">
              Flutter App
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-56"
              />
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error instanceof Error ? error.message : "Failed to load users"}
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-3 gap-2">
                <RefreshCw className="w-4 h-4" /> Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>{search ? "No users match your search" : "No users registered yet"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 bg-emerald-100">
                          <AvatarFallback className="text-emerald-700 text-xs font-semibold">
                            {getInitials(getName(user))}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{getName(user)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Mail className="w-3 h-3" />
                        {user.email ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone className="w-3 h-3" />
                        {getPhone(user)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {getDate(user)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
