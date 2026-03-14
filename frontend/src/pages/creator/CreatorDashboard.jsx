import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/layout/AppShell";
import Panel from "../../components/common/Panel";
import StatCard from "../../components/common/StatCard";
import LoadingState from "../../components/common/LoadingState";
import SeatGrid from "../../components/seat/SeatGrid";
import SeatLegend from "../../components/seat/SeatLegend";
import { creatorService } from "../../services/creatorService";
import { bookingService } from "../../services/bookingService";
import { connectSocket } from "../../services/socket";
import { useAuth } from "../../context/AuthContext";

const simulationOptions = [
  { value: "single_success", label: "Single booking success" },
  { value: "same_seat_race", label: "Two students same seat" },
  { value: "same_student_multiple", label: "One student multiple bookings" },
  { value: "block_during_booking", label: "Admin blocks during booking" },
  { value: "multiple_different_seats", label: "Multiple students different seats" },
];

const initialStudentForm = {
  register_number: "",
  student_name: "",
  year_of_study: 1,
  gender: "male",
  password: "",
};

const initialMappingForm = {
  seat_label: "L1",
  system_id: "",
  ip_address: "",
};

const CreatorDashboard = () => {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [seatStatus, setSeatStatus] = useState(null);
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [mappingForm, setMappingForm] = useState(initialMappingForm);
  const [simulationForm, setSimulationForm] = useState({
    scenario: "same_seat_race",
    seat_id: "L1",
    secondary_seat_id: "W1",
  });
  const [editingStudentId, setEditingStudentId] = useState("");
  const [simulationResult, setSimulationResult] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    const [studentData, mappingData, seatData] = await Promise.all([
      creatorService.listStudents(),
      creatorService.getMappings(),
      bookingService.getSeatStatus(),
    ]);

    setStudents(studentData.students || []);
    setMappings(mappingData.mappings || []);
    setSeatStatus(seatData);
  };

  useEffect(() => {
    loadData()
      .catch((requestError) => {
        setError(requestError.response?.data?.message || "Unable to load creator panel.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = connectSocket(token);

    const handleSeatStatus = (payload) => setSeatStatus(payload);
    const handleReconnect = async () => {
      try {
        const seatData = await bookingService.getSeatStatus();
        setSeatStatus(seatData);
      } catch (_error) {
        // Keep current state and wait for next live event.
      }
    };

    socket.on("seat-status-updated", handleSeatStatus);
    socket.on("connect", handleReconnect);

    return () => {
      socket.off("seat-status-updated", handleSeatStatus);
      socket.off("connect", handleReconnect);
    };
  }, [token]);

  const unmappedCount = useMemo(
    () => (seatStatus?.summary?.total || 0) - mappings.length,
    [mappings.length, seatStatus?.summary?.total],
  );

  const handleStudentSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (editingStudentId) {
        const payload = {
          student_name: studentForm.student_name,
          year_of_study: Number(studentForm.year_of_study),
          gender: studentForm.gender,
        };

        if (studentForm.password) {
          payload.password = studentForm.password;
        }

        await creatorService.updateStudent(editingStudentId, payload);
        setMessage("Student updated successfully.");
      } else {
        await creatorService.createStudent({
          ...studentForm,
          year_of_study: Number(studentForm.year_of_study),
        });
        setMessage("Student created successfully.");
      }

      setStudentForm(initialStudentForm);
      setEditingStudentId("");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudentId(student._id);
    setStudentForm({
      register_number: student.register_number,
      student_name: student.student_name,
      year_of_study: student.year_of_study,
      gender: student.gender || "male",
      password: "",
    });
  };

  const handleDeleteStudent = async (id) => {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await creatorService.deleteStudent(id);
      setMessage("Student deleted successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete student.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeatSelect = (seat) => {
    const mapping = mappings.find((entry) => entry.seat_label === seat.seat_id);
    setMappingForm({
      seat_label: seat.seat_id,
      system_id: mapping?.system_id || "",
      ip_address: mapping?.ip_address || "",
    });
  };

  const handleMappingSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await creatorService.saveMapping(mappingForm);
      setMessage(`Mapping saved for ${mappingForm.seat_label}.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save mapping.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMapping = async (seatLabel) => {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      await creatorService.deleteMapping(seatLabel);
      setMessage(`Mapping removed for ${seatLabel}.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete mapping.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleFemaleProtection = async () => {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await creatorService.updateFemaleSeatProtection(
        !seatStatus?.female_seat_protection_enabled,
      );
      setMessage(response.message);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update girls seat protection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulation = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const result = await creatorService.simulate(simulationForm);
      setSimulationResult(result);
      setMessage("Simulation completed.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to run simulation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading creator panel..." />;
  }

  return (
    <AppShell
      title="Creator Panel"
      subtitle="Manage student credentials, map lab computers to seat labels and IP addresses, and run controlled concurrency simulations."
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={students.length} helper="Managed student accounts" tone="cyan" />
        <StatCard label="Mapped Systems" value={mappings.length} helper="Seat to device/IP mappings" tone="green" />
        <StatCard label="Unmapped" value={unmappedCount} helper="Systems still needing mapping" tone="amber" />
        <StatCard label="Protected Rows" value={seatStatus?.row_reservations?.length || 0} helper="Active female-only row protections" tone="red" />
      </div>

      {message ? <p className="rounded-2xl border border-moss-400/30 bg-moss-400/10 px-4 py-3 text-sm text-moss-200">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}

      <Panel
        title="Girls Seat Protection"
        eyebrow="Feature Toggle"
        actions={
          <button type="button" className="btn-primary" onClick={handleToggleFemaleProtection} disabled={submitting}>
            {seatStatus?.female_seat_protection_enabled ? "Disable Protection" : "Enable Protection"}
          </button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[0.8fr,1.2fr]">
          <div className="panel-muted p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-pink-200">Current Status</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">
              {seatStatus?.female_seat_protection_enabled ? "Enabled" : "Disabled"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              When enabled, remaining seats in a row become female-only if any female student holds an active booking there.
            </p>
          </div>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Active Seats</th>
                </tr>
              </thead>
              <tbody>
                {seatStatus?.row_reservations?.length ? (
                  seatStatus.row_reservations.map((row) => (
                    <tr key={row.row_id}>
                      <td>{row.row_label}</td>
                      <td>Reserved for female students</td>
                      <td>{row.active_seats.join(", ")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center text-slate-400">
                      No active female-protected rows.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <Panel title={editingStudentId ? "Edit Student" : "Add Student"} eyebrow="Identity Management">
          <form className="space-y-4" onSubmit={handleStudentSubmit}>
            <div>
              <label className="mb-2 block text-sm text-slate-300" htmlFor="register_number">
                Register Number
              </label>
              <input
                id="register_number"
                className="input-base"
                value={studentForm.register_number}
                disabled={Boolean(editingStudentId)}
                onChange={(event) => setStudentForm((current) => ({ ...current, register_number: event.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300" htmlFor="student_name">
                Student Name
              </label>
              <input
                id="student_name"
                className="input-base"
                value={studentForm.student_name}
                onChange={(event) => setStudentForm((current) => ({ ...current, student_name: event.target.value }))}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300" htmlFor="year_of_study">
                  Year of Study
                </label>
                <input
                  id="year_of_study"
                  type="number"
                  min="1"
                  max="8"
                  className="input-base"
                  value={studentForm.year_of_study}
                  onChange={(event) => setStudentForm((current) => ({ ...current, year_of_study: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300" htmlFor="gender">
                  Gender
                </label>
                <select
                  id="gender"
                  className="input-base"
                  value={studentForm.gender}
                  onChange={(event) => setStudentForm((current) => ({ ...current, gender: event.target.value }))}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300" htmlFor="password">
                Password {editingStudentId ? "(leave empty to keep current password)" : ""}
              </label>
              <input
                id="password"
                type="password"
                className="input-base"
                value={studentForm.password}
                onChange={(event) => setStudentForm((current) => ({ ...current, password: event.target.value }))}
                required={!editingStudentId}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {editingStudentId ? "Update Student" : "Create Student"}
              </button>
              {editingStudentId ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingStudentId("");
                    setStudentForm(initialStudentForm);
                  }}
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </Panel>

        <Panel title="Student Directory" eyebrow="Creator Controls">
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Register Number</th>
                  <th>Year</th>
                  <th>Gender</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length ? (
                  students.map((student) => (
                    <tr key={student._id}>
                      <td>{student.student_name}</td>
                      <td>{student.register_number}</td>
                      <td>{student.year_of_study}</td>
                      <td className="capitalize">{student.gender}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => handleEditStudent(student)}>
                            Edit
                          </button>
                          <button type="button" className="btn-danger !px-3 !py-2" onClick={() => handleDeleteStudent(student._id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center text-slate-400">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Panel title="System Mapping Grid" eyebrow="Seat to Device Mapping">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SeatLegend />
            <p className="text-sm text-slate-300">Click a seat to load or edit its device mapping. Pink seats indicate active female-only rows.</p>
          </div>
          <SeatGrid
            sections={seatStatus?.sections || []}
            selectedSeat={mappingForm.seat_label}
            onSelect={handleSeatSelect}
            selectableStatuses={["available", "booked", "blocked", "female_reserved"]}
          />
        </Panel>

        <Panel title="Mapping Editor" eyebrow="IP Assignment">
          <form className="space-y-4" onSubmit={handleMappingSubmit}>
            <div>
              <label className="mb-2 block text-sm text-slate-300" htmlFor="seat_label">
                Seat Label
              </label>
              <input id="seat_label" className="input-base" value={mappingForm.seat_label} readOnly />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300" htmlFor="system_id">
                System ID
              </label>
              <input
                id="system_id"
                className="input-base"
                value={mappingForm.system_id}
                onChange={(event) => setMappingForm((current) => ({ ...current, system_id: event.target.value }))}
                placeholder="SYS-2313"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300" htmlFor="ip_address">
                IP Address
              </label>
              <input
                id="ip_address"
                className="input-base"
                value={mappingForm.ip_address}
                onChange={(event) => setMappingForm((current) => ({ ...current, ip_address: event.target.value }))}
                placeholder="192.168.1.21"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              Save Mapping
            </button>
          </form>

          <div className="mt-6 table-shell">
            <table>
              <thead>
                <tr>
                  <th>Seat</th>
                  <th>System ID</th>
                  <th>IP Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mappings.slice(0, 12).map((mapping) => (
                  <tr key={mapping._id}>
                    <td>{mapping.seat_label}</td>
                    <td>{mapping.system_id}</td>
                    <td>{mapping.ip_address}</td>
                    <td>
                      <button type="button" className="btn-danger !px-3 !py-2" onClick={() => handleDeleteMapping(mapping.seat_label)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="Concurrency Test Tool" eyebrow="Simulation Harness">
        <form className="grid gap-4 xl:grid-cols-[1fr,1fr,1fr,auto]" onSubmit={handleSimulation}>
          <select
            className="input-base"
            value={simulationForm.scenario}
            onChange={(event) => setSimulationForm((current) => ({ ...current, scenario: event.target.value }))}
          >
            {simulationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            className="input-base"
            value={simulationForm.seat_id}
            onChange={(event) => setSimulationForm((current) => ({ ...current, seat_id: event.target.value.toUpperCase() }))}
            placeholder="Primary seat"
          />
          <input
            className="input-base"
            value={simulationForm.secondary_seat_id}
            onChange={(event) => setSimulationForm((current) => ({ ...current, secondary_seat_id: event.target.value.toUpperCase() }))}
            placeholder="Secondary seat"
          />
          <button type="submit" className="btn-primary" disabled={submitting}>
            Run Simulation
          </button>
        </form>

        {simulationResult ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr,1.2fr]">
            <div className="panel-muted p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyanlab-300">Summary</p>
              <p className="mt-3 font-display text-2xl font-semibold text-white">{simulationResult.summary}</p>
              {simulationResult.test_credentials ? (
                <p className="mt-3 text-sm text-slate-300">
                  Test login: {simulationResult.test_credentials.register_number} / {simulationResult.test_credentials.password}
                </p>
              ) : null}
            </div>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Actor</th>
                    <th>Outcome</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {simulationResult.results?.map((entry, index) => (
                    <tr key={`${entry.actor}-${index}`}>
                      <td>{entry.actor}</td>
                      <td className="capitalize">{entry.outcome}</td>
                      <td>{entry.message || entry.seat_id || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Panel>
    </AppShell>
  );
};

export default CreatorDashboard;
