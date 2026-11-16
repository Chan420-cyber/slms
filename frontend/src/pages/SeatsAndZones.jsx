import { useEffect, useState, useRef, useMemo } from "react";
import api from "../services/api";
import { 
  LayoutGrid, List, Map, Plus, Search, RefreshCw, X, 
  Loader2, CheckCircle2, AlertCircle, Trash2, Edit, MoreVertical
} from "lucide-react";

export default function SeatsAndZones() {
  const [activeTab, setActiveTab] = useState("floorplan"); // floorplan, zones, seats
  
  // Data
  const [zones, setZones] = useState([]);
  const [seats, setSeats] = useState([]);
  const [allocations, setAllocations] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  // Floor Plan State
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [draggedSeat, setDraggedSeat] = useState(null);
  
  // Modals
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  
  // Form State
  const [zoneForm, setZoneForm] = useState({ zone_name: "", description: "" });
  const [seatForm, setSeatForm] = useState({ zone_id: "", seat_number: "", seat_type: "FIXED" });
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [zonesRes, seatsRes, allocationsRes] = await Promise.all([
        api.get("/zones"),
        api.get("/seats"),
        api.get("/allocations?status=ACTIVE")
      ]);
      setZones(zonesRes.data.zones);
      setSeats(seatsRes.data.seats);
      setAllocations(allocationsRes.data.allocations);
      
      // Auto-select first zone for floor plan
      if (zonesRes.data.zones.length > 0 && !selectedZoneId) {
        setSelectedZoneId(zonesRes.data.zones[0].zone_id);
      }
    } catch (err) {
      setError("Failed to load layout data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // --- Derived Data ---
  const stats = useMemo(() => {
    const occupiedSeatIds = new Set(allocations.map(a => a.seat_id));
    const available = seats.filter(s => s.status === "AVAILABLE" && !occupiedSeatIds.has(s.seat_id)).length;
    const occupied = seats.filter(s => occupiedSeatIds.has(s.seat_id)).length;
    return { zones: zones.length, seats: seats.length, available, occupied };
  }, [zones, seats, allocations]);

  const activeFloorPlanSeats = useMemo(() => {
    return seats.filter(s => s.zone_id.toString() === selectedZoneId.toString());
  }, [seats, selectedZoneId]);

  // --- Drag and Drop Logic ---
  const handleDragStart = (e, seat) => {
    setDraggedSeat(seat);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = async (e, targetSeat) => {
    e.preventDefault();
    if (!draggedSeat || draggedSeat.seat_id === targetSeat.seat_id) return;
    if (draggedSeat.zone_id !== targetSeat.zone_id) return; // Prevent cross-zone dragging

    // Optimistic UI Update
    const updatedSeats = seats.map(s => {
      if (s.seat_id === draggedSeat.seat_id) {
        return { ...s, pos_x: targetSeat.pos_x, pos_y: targetSeat.pos_y };
      }
      if (s.seat_id === targetSeat.seat_id) {
        return { ...s, pos_x: draggedSeat.pos_x, pos_y: draggedSeat.pos_y };
      }
      return s;
    });
    setSeats(updatedSeats);

    // Save to Database
    try {
      await api.patch(`/seats/${draggedSeat.seat_id}/position`, { 
        pos_x: targetSeat.pos_x, 
        pos_y: targetSeat.pos_y 
      });
      await api.patch(`/seats/${targetSeat.seat_id}/position`, { 
        pos_x: draggedSeat.pos_x, 
        pos_y: draggedSeat.pos_y 
      });
    } catch (err) {
      showToast("Failed to save new positions", "error");
      fetchData(); // Revert on failure
    }
    setDraggedSeat(null);
  };

  // --- Actions ---
  const handleCreateZone = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await api.post("/zones", zoneForm);
      setIsZoneModalOpen(false);
      setZoneForm({ zone_name: "", description: "" });
      showToast("Zone created successfully");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create zone", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateSeat = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      // Find max grid bounds to place new seat
      const maxX = Math.max(...activeFloorPlanSeats.map(s => s.pos_x || 0), 0);
      await api.post("/seats", { ...seatForm, pos_x: maxX + 1, pos_y: 0 }); // Auto-place at end
      setIsSeatModalOpen(false);
      setSeatForm({ zone_id: selectedZoneId, seat_number: "", seat_type: "FIXED" });
      showToast("Seat created successfully");
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to create seat", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div>
      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Seats & Zones</h3>
          <p className="text-sm text-slate-500">Manage layout, availability, and allocations.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-sm text-slate-500 font-medium">Total Zones</p><h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.zones}</h3></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-sm text-slate-500 font-medium">Total Seats</p><h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.seats}</h3></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-sm text-emerald-600 font-medium">Available</p><h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.available}</h3></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-sm text-red-600 font-medium">Occupied</p><h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.occupied}</h3></div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button onClick={() => setActiveTab("floorplan")} className={`px-6 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'floorplan' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Map size={16} /> Floor Plan</button>
        <button onClick={() => setActiveTab("zones")} className={`px-6 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'zones' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={16} /> Zones</button>
        <button onClick={() => setActiveTab("seats")} className={`px-6 py-3 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'seats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><List size={16} /> Seats</button>
      </div>

      {/* --- FLOOR PLAN TAB --- */}
      {activeTab === "floorplan" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 relative overflow-hidden">
          
          {/* Controls & Legend */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <select value={selectedZoneId} onChange={(e) => setSelectedZoneId(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
                {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
              </select>
              <button onClick={() => { setSeatForm({ ...seatForm, zone_id: selectedZoneId }); setIsSeatModalOpen(true); }} className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-700"><Plus size={16} className="inline mr-1"/> Add Seat</button>
            </div>
            <div className="flex gap-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Available</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Occupied</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Maintenance</div>
            </div>
          </div>

          {/* The Grid */}
          {activeFloorPlanSeats.length === 0 ? (
             <div className="text-center py-20 text-slate-500">No seats in this zone yet. Add one to start designing the layout.</div>
          ) : (
            <div className="overflow-auto border border-slate-100 rounded-lg bg-slate-50 p-4 min-h-[500px]">
              <div className="relative" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(...activeFloorPlanSeats.map(s => s.pos_x || 0), 3) + 2}, minmax(80px, 1fr))`, gap: '12px' }}>
                {activeFloorPlanSeats.map(seat => {
                  const allocation = allocations.find(a => a.seat_id === seat.seat_id);
                  const isOccupied = !!allocation;
                  
                  let bgColor = "bg-emerald-100 border-emerald-300 text-emerald-800"; // Available
                  if (isOccupied) bgColor = "bg-blue-100 border-blue-300 text-blue-800";
                  if (seat.status === "MAINTENANCE") bgColor = "bg-amber-100 border-amber-300 text-amber-800";
                  if (seat.status === "INACTIVE") bgColor = "bg-slate-200 border-slate-300 text-slate-500";

                  return (
                    <div
                      key={seat.seat_id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, seat)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, seat)}
                      onClick={() => setSelectedSeat({ ...seat, allocation })}
                      className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:shadow-md transition ${bgColor}`}
                    >
                      <span className="font-bold text-sm">{seat.seat_number}</span>
                      <span className="text-[10px] opacity-70 uppercase tracking-wider">{seat.seat_type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seat Detail Popup (Absolute within the floorplan card) */}
          {selectedSeat && (
            <div className="absolute top-4 right-4 w-80 bg-white border border-slate-200 shadow-2xl rounded-xl z-20 animate-in slide-in-from-right-8">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <h4 className="font-bold text-slate-900">Seat {selectedSeat.seat_number}</h4>
                <button onClick={() => setSelectedSeat(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Zone:</span> <span className="font-medium">{selectedSeat.zone_name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Type:</span> <span className="font-medium">{selectedSeat.seat_type}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status:</span> 
                  <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${selectedSeat.allocation ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {selectedSeat.allocation ? "OCCUPIED" : selectedSeat.status}
                  </span>
                </div>
                {selectedSeat.allocation && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Assigned To:</p>
                    <p className="font-medium text-slate-900">{selectedSeat.allocation.full_name}</p>
                    <p className="text-xs text-slate-500 mt-2">Allocated on: {selectedSeat.allocation.start_date}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- ZONES TAB --- */}
      {activeTab === "zones" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Zones</h3>
            <button onClick={() => setIsZoneModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Create Zone</button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th className="px-5 py-4">Name</th><th className="px-5 py-4">Description</th><th className="px-5 py-4">Seats</th><th className="px-5 py-4">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zones.map(z => (
                <tr key={z.zone_id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">{z.zone_name}</td>
                  <td className="px-5 py-4 text-slate-500">{z.description || "—"}</td>
                  <td className="px-5 py-4 text-slate-900 font-medium">{z.total_seats}</td>
                  <td className="px-5 py-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${z.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{z.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- SEATS TAB --- */}
      {activeTab === "seats" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">All Seats</h3>
            <button onClick={() => setIsSeatModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Add Seat</button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th className="px-5 py-4">Seat</th><th className="px-5 py-4">Zone</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Assigned To</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {seats.map(seat => {
                const alloc = allocations.find(a => a.seat_id === seat.seat_id);
                return (
                  <tr key={seat.seat_id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold text-slate-900">{seat.seat_number}</td>
                    <td className="px-5 py-4 text-slate-500">{seat.zone_name}</td>
                    <td className="px-5 py-4 text-slate-500">{seat.seat_type}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${alloc ? "bg-blue-50 text-blue-700" : seat.status === "AVAILABLE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {alloc ? "OCCUPIED" : seat.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-900">{alloc ? alloc.full_name : "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODALS --- */}
      {/* Create Zone Modal */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Create Zone</h3>
            <form onSubmit={handleCreateZone} className="space-y-4">
              <div><label className="text-sm font-medium">Name</label><input required value={zoneForm.zone_name} onChange={e => setZoneForm({...zoneForm, zone_name: e.target.value})} className="w-full border rounded-lg p-2 mt-1" /></div>
              <div><label className="text-sm font-medium">Description</label><textarea value={zoneForm.description} onChange={e => setZoneForm({...zoneForm, description: e.target.value})} className="w-full border rounded-lg p-2 mt-1" /></div>
              <div className="flex justify-end gap-2 mt-6"><button type="button" onClick={() => setIsZoneModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button><button type="submit" disabled={submitLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{submitLoading ? "Saving..." : "Save"}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Create Seat Modal */}
      {isSeatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Add Seat</h3>
            <form onSubmit={handleCreateSeat} className="space-y-4">
              <div><label className="text-sm font-medium">Zone</label>
                <select value={seatForm.zone_id} onChange={e => setSeatForm({...seatForm, zone_id: e.target.value})} className="w-full border rounded-lg p-2 mt-1">
                  {zones.map(z => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
                </select>
              </div>
              <div><label className="text-sm font-medium">Seat Number</label><input required value={seatForm.seat_number} onChange={e => setSeatForm({...seatForm, seat_number: e.target.value})} className="w-full border rounded-lg p-2 mt-1" /></div>
              <div><label className="text-sm font-medium">Type</label>
                <select value={seatForm.seat_type} onChange={e => setSeatForm({...seatForm, seat_type: e.target.value})} className="w-full border rounded-lg p-2 mt-1">
                  <option value="FIXED">FIXED</option><option value="FLEXIBLE">FLEXIBLE</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6"><button type="button" onClick={() => setIsSeatModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button><button type="submit" disabled={submitLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{submitLoading ? "Saving..." : "Save"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}