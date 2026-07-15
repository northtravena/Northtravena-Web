import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Car, Tag, IndianRupee, Plus, Pencil, Trash2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import type { Service, ServiceType, VehicleRate } from "@/types/api";
import { toast } from "sonner";
import {
  useAdminServices,
  useServiceTypes,
  useVehicleRates,
  useCreateService,
  useUpdateService,
  useDeactivateService,
  useCreateServiceType,
  useUpsertVehicleRate,
} from "@/lib/queries";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TRIP_LABELS: Record<string, string> = {
  one_way: "One Way",
  round: "Round Trip",
  monthly: "Monthly",
};

// ─── Service Form Modal ───────────────────────────────────────────────────────
interface ServiceFormProps {
  initial?: Partial<Service>;
  serviceTypes: ServiceType[];
  onSave: (data: Record<string, string | number>) => Promise<void>;
  onClose: () => void;
}

function ServiceForm({ initial, serviceTypes, onSave, onClose }: ServiceFormProps) {
  const [form, setForm] = useState({
    vehicleName: initial?.vehicleName ?? "",
    vehicleLabel: initial?.vehicleLabel ?? "",
    brand: initial?.brand ?? "",
    color: initial?.color ?? "",
    seats: initial?.seats ?? "",
    oil: initial?.oil ?? "",
    transmissionType: initial?.transmissionType ?? "",
    serviceType: initial?.serviceType ?? "",
    serviceName: initial?.serviceName ?? "",
    serviceDescription: initial?.serviceDescription ?? "",
    amount: String(initial?.amount ?? ""),
    status: initial?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...form, amount: Number(form.amount) });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">{initial?._id ? "Edit Vehicle" : "Add Vehicle"}</h2>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {field("Vehicle Name *", "vehicleName")}
          {field("Vehicle Label", "vehicleLabel")}
          {field("Brand", "brand")}
          {field("Color", "color")}
          {field("Seats", "seats")}
          {field("Oil Type", "oil")}
          {field("Transmission", "transmissionType")}
          {field("Amount (PKR) *", "amount", "number")}
          {field("Service Name", "serviceName")}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Service Type</label>
            <select
              value={form.serviceType}
              onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Select --</option>
              {serviceTypes.map((st) => (
                <option key={st._id} value={st.name}>{st.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Service Description</label>
            <textarea
              rows={2}
              value={form.serviceDescription}
              onChange={(e) => setForm((f) => ({ ...f, serviceDescription: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}
        <div className="p-6 pt-0 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Save Vehicle"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Fleet Page ──────────────────────────────────────────────────────────
export function Fleet() {
  const [tab, setTab] = useState("vehicles");

  // ── Query hooks ─────────────────────────────────────────────────────────────
  const { data: services = [], isLoading: loading, error, refetch: refetchServices } = useAdminServices();
  const { data: serviceTypes = [], refetch: refetchTypes } = useServiceTypes();
  const { data: vehicleRates = [], refetch: refetchRates } = useVehicleRates();

  // Mutations
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deactivateService = useDeactivateService();
  const createServiceType = useCreateServiceType();
  const upsertVehicleRate = useUpsertVehicleRate();

  // ── Modals/forms ────────────────────────────────────────────────────────────
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Service | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Service Type form ────────────────────────────────────────────────────────
  const [newTypeName, setNewTypeName] = useState("");
  const [typeError, setTypeError] = useState<string | null>(null);

  // ── Vehicle Rate editor ──────────────────────────────────────────────────────
  const [rateTab, setRateTab] = useState("one_way");
  const [rateEdits, setRateEdits] = useState<Record<string, Record<string, string>>>({});
  const [newRateKey, setNewRateKey] = useState<Record<string, string>>({});
  const [newRateVal, setNewRateVal] = useState<Record<string, string>>({});

  // Sync rateEdits when vehicleRates data loads/changes
  useEffect(() => {
    const edits: Record<string, Record<string, string>> = {};
    for (const r of vehicleRates) {
      edits[r.tripType] = Object.fromEntries(
        Object.entries(r.rates).map(([k, v]) => [k, String(v)])
      );
    }
    setRateEdits(edits);
  }, [vehicleRates]);

  // ── Vehicle CRUD ─────────────────────────────────────────────────────────────
  const handleAddVehicle = async (data: Record<string, string | number>) => {
    await createService.mutateAsync(data);
    setShowAddVehicle(false);
  };

  const handleEditVehicle = async (data: Record<string, string | number>) => {
    if (!editingVehicle) return;
    await updateService.mutateAsync({ id: editingVehicle._id, data });
    setEditingVehicle(null);
  };

  const handleDeactivate = async (id: string) => {
    setDeletingId(id);
    try {
      await deactivateService.mutateAsync(id);
      toast.success("Vehicle deactivated successfully");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Deactivate failed");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Service Type CRUD ─────────────────────────────────────────────────────────
  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    setTypeError(null);
    try {
      await createServiceType.mutateAsync(newTypeName.trim());
      setNewTypeName("");
    } catch (e: unknown) {
      setTypeError(e instanceof Error ? e.message : "Failed to create service type");
    }
  };

  // ── Vehicle Rate upsert ───────────────────────────────────────────────────────
  const handleSaveRates = async (tripType: string) => {
    try {
      const edits = rateEdits[tripType] ?? {};
      const rates: Record<string, number> = {};
      for (const [k, v] of Object.entries(edits)) {
        if (k.trim()) rates[k.trim()] = Number(v);
      }
      await upsertVehicleRate.mutateAsync({ tripType, rates });
      toast.success(`${TRIP_LABELS[tripType] ?? tripType} rates saved successfully`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save rates");
    }
  };

  const addRateRow = (tripType: string) => {
    const key = (newRateKey[tripType] ?? "").trim();
    const val = (newRateVal[tripType] ?? "").trim();
    if (!key || !val) return;
    setRateEdits((prev) => ({
      ...prev,
      [tripType]: { ...(prev[tripType] ?? {}), [key]: val },
    }));
    setNewRateKey((p) => ({ ...p, [tripType]: "" }));
    setNewRateVal((p) => ({ ...p, [tripType]: "" }));
  };

  const removeRateRow = (tripType: string, key: string) => {
    setRateEdits((prev) => {
      const copy = { ...(prev[tripType] ?? {}) };
      delete copy[key];
      return { ...prev, [tripType]: copy };
    });
  };

  // ── Loading / Error ───────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
    </div>
  );

  if (error) return (
    <div className="space-y-4">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error instanceof Error ? error.message : "Failed to load fleet data"}</div>
      <Button onClick={() => refetchServices()} variant="outline" className="gap-2"><RefreshCw className="w-4 h-4" /> Retry</Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Modals */}
      {showAddVehicle && (
        <ServiceForm
          serviceTypes={serviceTypes}
          onSave={handleAddVehicle}
          onClose={() => setShowAddVehicle(false)}
        />
      )}
      {editingVehicle && (
        <ServiceForm
          initial={editingVehicle}
          serviceTypes={serviceTypes}
          onSave={handleEditVehicle}
          onClose={() => setEditingVehicle(null)}
        />
      )}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="vehicles" className="flex items-center gap-2">
            <Car className="w-4 h-4" />Vehicles ({services.length})
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-2">
            <Tag className="w-4 h-4" />Service Types ({serviceTypes.length})
          </TabsTrigger>
          <TabsTrigger value="rates" className="flex items-center gap-2">
            <IndianRupee className="w-4 h-4" />Vehicle Rates
          </TabsTrigger>
        </TabsList>

        {/* ── Vehicles Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="vehicles" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-600" />Fleet Vehicles
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={() => { refetchServices(); refetchTypes(); refetchRates(); }} variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="w-4 h-4" />Refresh
                </Button>
                <Button onClick={() => setShowAddVehicle(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                  <Plus className="w-4 h-4" />Add Vehicle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p>No vehicles yet. Add your first vehicle.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Brand / Color</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{s.vehicleName}</p>
                            <p className="text-xs text-gray-400">{s.vehicleLabel}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {s.brand}{s.color ? ` · ${s.color}` : ""}
                          </div>
                        </TableCell>
                        <TableCell><span className="text-sm">{s.serviceType}</span></TableCell>
                        <TableCell><span className="text-sm">{s.seats}</span></TableCell>
                        <TableCell className="text-right font-medium">PKR {s.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === "active" ? "success" : "secondary"} className="text-xs">
                            {s.status === "active"
                              ? <><CheckCircle className="w-3 h-3 mr-1" />Active</>
                              : <><XCircle className="w-3 h-3 mr-1" />Inactive</>
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => setEditingVehicle(s)}
                            >
                              <Pencil className="w-3 h-3 mr-1" />Edit
                            </Button>
                            {s.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                                disabled={deletingId === s._id}
                                onClick={() => handleDeactivate(s._id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />Deactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Service Types Tab ────────────────────────────────────────────────── */}
        <TabsContent value="types" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-600" />Service Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceTypes.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No service types yet</p>
                ) : (
                  <div className="space-y-2">
                    {serviceTypes.map((st) => (
                      <div key={st._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-800">{st.name}</span>
                        <Badge variant="outline" className="text-xs">{st._id.slice(-6)}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-600" />Add Service Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Type Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Luxury, Economy, SUV"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddType()}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {typeError && (
                  <p className="text-sm text-red-600">{typeError}</p>
                )}
                <Button
                  onClick={handleAddType}
                  disabled={createServiceType.isPending || !newTypeName.trim()}                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  {createServiceType.isPending ? "Creating…" : "Create Service Type"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Vehicle Rates Tab ────────────────────────────────────────────────── */}
        <TabsContent value="rates" className="mt-6">
          <div className="mb-4 flex gap-2">
            {["one_way", "round", "monthly"].map((tt) => (
              <button
                key={tt}
                onClick={() => setRateTab(tt)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${rateTab === tt
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                {TRIP_LABELS[tt]}
              </button>
            ))}
          </div>

          {["one_way", "round", "monthly"].map((tt) =>
            rateTab !== tt ? null : (
              <Card key={tt}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-emerald-600" />
                    {TRIP_LABELS[tt]} Rates (PKR)
                  </CardTitle>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={upsertVehicleRate.isPending}
                    onClick={() => handleSaveRates(tt)}
                  >
                    {upsertVehicleRate.isPending ? "Saving…" : "Save Rates"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Existing rows */}
                  {Object.entries(rateEdits[tt] ?? {}).length === 0 ? (
                    <p className="text-sm text-gray-400">No rates set. Add a vehicle below.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vehicle Label</TableHead>
                          <TableHead>Rate (PKR)</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(rateEdits[tt] ?? {}).map(([key, val]) => (
                          <TableRow key={key}>
                            <TableCell className="font-medium">{key}</TableCell>
                            <TableCell>
                              <input
                                type="number"
                                value={val}
                                onChange={(e) =>
                                  setRateEdits((prev) => ({
                                    ...prev,
                                    [tt]: { ...(prev[tt] ?? {}), [key]: e.target.value },
                                  }))
                                }
                                className="w-32 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={() => removeRateRow(tt, key)}
                                className="text-red-400 hover:text-red-600 text-xs"
                              >
                                Remove
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {/* Add new row */}
                  <div className="flex gap-2 items-end pt-2 border-t">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Vehicle Label</label>
                      <input
                        type="text"
                        placeholder="e.g. TZ, V8"
                        value={newRateKey[tt] ?? ""}
                        onChange={(e) => setNewRateKey((p) => ({ ...p, [tt]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Rate (PKR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 400"
                        value={newRateVal[tt] ?? ""}
                        onChange={(e) => setNewRateVal((p) => ({ ...p, [tt]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 h-9"
                      onClick={() => addRateRow(tt)}
                    >
                      <Plus className="w-3 h-3" />Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
