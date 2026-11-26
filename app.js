// ===== SEED DATA - From PRD =====
const SEED = {
  patients: [
    { id: "p_101", name: "Ramesh Kumar", dob: "1978-05-12", condition: "Hypertension", phone: "98XXX XXXXX", history: "BP: 140/90, On Amlodipine 5mg" },
    { id: "p_102", name: "Priya Sharma", dob: "1995-08-20", condition: "Diabetes Type 2", phone: "98XXX XXXXX", history: "HbA1c: 7.2, On Metformin" },
    { id: "p_103", name: "Amit Verma", dob: "1988-11-02", condition: "Asthma", phone: "98XXX XXXXX", history: "Uses inhaler, Allergic to dust" }
  ],
  doctors: [
    { id: "d_201", name: "Dr. Anjali Mehta", specialty: "Cardiology" },
    { id: "d_202", name: "Dr. Rohan Gupta", specialty: "General Medicine" }
  ],
  grants: [
    { id: "g_301", patientId: "p_101", doctorId: "d_201", status: "approved", grantedAt: "2026-11-15T10:00:00" }
  ],
  requests: [],
  prescriptions: [],
  audit: []
};

let DB = JSON.parse(localStorage.getItem("carehub_db")) || structuredClone(SEED);
let currentUser = null;
let selectedPatientId = null;

function save() { localStorage.setItem("carehub_db", JSON.stringify(DB)); renderAll(); }
function resetData() { localStorage.removeItem("carehub_db"); DB = structuredClone(SEED); location.reload(); }

// ===== AUDIT LOG - FR-06 =====
function addAudit(actorId, actorRole, action, targetId, result) {
  DB.audit.unshift({ timestamp: new Date().toISOString(), actorId, actorRole, action, targetId, result });
  save();
}

// ===== LOGIN - FR-01 =====
function populateUsers() {
  const role = document.getElementById("roleSelect").value;
  const sel = document.getElementById("userSelect");
  const list = role === "patient" ? DB.patients : DB.doctors;
  sel.innerHTML = list.map(u => `<option value="${u.id}">${u.name} (${u.id})</option>`).join("");
}
document.getElementById("roleSelect").addEventListener("change", populateUsers);
populateUsers();

function login() {
  const role = document.getElementById("roleSelect").value;
  const id = document.getElementById("userSelect").value;
  const user = (role === "patient" ? DB.patients : DB.doctors).find(u => u.id === id);
  currentUser = { ...user, role };
  document.getElementById("currentUserBadge").innerText = `${user.name} - ${role}`;
  addAudit(id, role, "LOGIN", "system", "SUCCESS");
  renderAll();
}

// ===== ACCESS CHECK - FR-02 =====
function hasAccess(doctorId, patientId) {
  return DB.grants.some(g => g.doctorId === doctorId && g.patientId === patientId && g.status === "approved");
}

function viewRecord(patientId) {
  selectedPatientId = patientId;
  const patient = DB.patients.find(p => p.id === patientId);

  if (currentUser?.role === "doctor" && !hasAccess(currentUser.id, patientId)) {
    document.getElementById("recordViewer").innerHTML = `
      <div class="denied"><h5>403 - Access Denied</h5>
      <p>You do not have permission to view ${patient.name}'s record.</p>
      <button class="btn btn-warning btn-sm" onclick="requestAccess('${patientId}')">Request Access</button></div>`;
    addAudit(currentUser.id, "doctor", "VIEW_RECORD_DENIED", patientId, "403_DENIED");
    return;
  }
  document.getElementById("recordViewer").innerHTML = `
    <div class="granted"><h5>${patient.name} (${patient.id})</h5>
    <p><b>DOB:</b> ${patient.dob} | <b>Condition:</b> ${patient.condition}</p>
    <p><b>History:</b> ${patient.history}</p>
    <p><b>Prescriptions:</b><br>${DB.prescriptions.filter(p=>p.patientId===patientId).map(p=>`• ${p.medicine} - ${p.dosage} - ${p.instructions} (by ${p.doctorId} on ${p.date})`).join("<br>") || "No prescriptions yet"}</p></div>`;
  if (currentUser) addAudit(currentUser.id, currentUser.role, "VIEW_RECORD", patientId, "SUCCESS");
  renderPrescriptionPanel();
}

// ===== ACCESS DELEGATION - FR-03 =====
function requestAccess(patientId) {
  if (DB.requests.some(r => r.doctorId === currentUser.id && r.patientId === patientId && r.status === "pending")) {
    alert("Already requested!"); return;
  }
  DB.requests.push({ id: "r_" + Date.now(), doctorId: currentUser.id, patientId, status: "pending", requestedAt: new Date().toISOString() });
  addAudit(currentUser.id, "doctor", "REQUEST_ACCESS", patientId, "PENDING");
}

function approveRequest(reqId, approve) {
  const req = DB.requests.find(r => r.id === reqId);
  req.status = approve ? "approved" : "denied";
  if (approve) DB.grants.push({ id: "g_" + Date.now(), patientId: req.patientId, doctorId: req.doctorId, status: "approved", grantedAt: new Date().toISOString() });
  addAudit(currentUser.id, "patient", approve ? "GRANT_ACCESS" : "DENY_ACCESS", req.doctorId, approve ? "APPROVED" : "DENIED");
}

// ===== PRESCRIPTION - FR-05 =====
function renderPrescriptionPanel() {
  const el = document.getElementById("prescriptionPanel");
  if (!currentUser || !selectedPatientId) { el.innerHTML = "<p class='text-muted'>Select a patient first.</p>"; return; }
  if (currentUser.role !== "doctor") { el.innerHTML = "<p>Only doctors can write prescriptions. Patients can view them above.</p>"; return; }
  if (!hasAccess(currentUser.id, selectedPatientId)) { el.innerHTML = "<div class='denied'>You need approved access to prescribe.</div>"; return; }
  el.innerHTML = `
    <input id="med" class="form-control mb-2" placeholder="Medicine name e.g. Amlodipine">
    <input id="dose" class="form-control mb-2" placeholder="Dosage e.g. 5mg once daily">
    <input id="instr" class="form-control mb-2" placeholder="Instructions e.g. After food">
    <button class="btn btn-primary" onclick="savePrescription()">Save Prescription</button>`;
}
function savePrescription() {
  const medicine = document.getElementById("med").value;
  const dosage = document.getElementById("dose").value;
  const instructions = document.getElementById("instr").value;
  if (!medicine || !dosage) { alert("Fill medicine and dosage"); return; }
  DB.prescriptions.push({ id: "rx_" + Date.now(), patientId: selectedPatientId, doctorId: currentUser.id, medicine, dosage, instructions, date: new Date().toISOString().split("T")[0] });
  addAudit(currentUser.id, "doctor", "CREATE_PRESCRIPTION", selectedPatientId, "SUCCESS");
  viewRecord(selectedPatientId);
}

// ===== RENDER ALL =====
function renderAll() {
  document.getElementById("patientList").innerHTML = DB.patients.map(p => {
    let accessInfo = "";
    if (currentUser?.role === "doctor") {
      accessInfo = hasAccess(currentUser.id, p.id) ? `<span class="badge bg-success">Approved</span>` : `<span class="badge bg-danger">No Access</span>`;
    }
    return `<div class="d-flex justify-content-between align-items-center border-bottom py-2">
      <div><b>${p.name}</b><br><small>${p.condition} - ${p.id}</small></div>
      <div>${accessInfo} <button class="btn btn-sm btn-outline-primary" onclick="viewRecord('${p.id}')">View</button></div></div>`;
  }).join("");

  document.getElementById("requestPanel").innerHTML = DB.requests.length === 0 ? "<p class='text-muted'>No requests.</p>" : DB.requests.map(r => {
    const doc = DB.doctors.find(d => d.id === r.doctorId);
    const pat = DB.patients.find(p => p.id === r.patientId);
    let btns = "";
    if (currentUser?.role === "patient" && currentUser.id === r.patientId && r.status === "pending") {
      btns = `<button class="btn btn-success btn-sm" onclick="approveRequest('${r.id}', true)">Approve</button> <button class="btn btn-danger btn-sm" onclick="approveRequest('${r.id}', false)">Deny</button>`;
    }
    return `<div class="border-bottom py-2">${doc?.name} → ${pat?.name} : <b>${r.status}</b> ${btns}</div>`;
  }).join("");

  document.getElementById("auditLog").innerHTML = DB.audit.map(a => `<div class="small border-bottom py-1">[${new Date(a.timestamp).toLocaleString()}] <b>${a.actorId} (${a.actorRole})</b> ${a.action} → ${a.targetId} : <b>${a.result}</b></div>`).join("") || "No logs yet";
  renderPrescriptionPanel();
}
function exportAudit() {
  const blob = new Blob([JSON.stringify(DB.audit, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "audit-log.json"; a.click();
}
renderAll();

// ===== VIDEO - FR-04 WebRTC via PeerJS =====
let peer = new Peer();
let localStream = null;
peer.on("open", id => document.getElementById("myPeerId").innerText = id);
peer.on("call", call => {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(s => {
    localStream = s; document.getElementById("localVideo").srcObject = s;
    call.answer(s);
    call.on("stream", rs => document.getElementById("remoteVideo").srcObject = rs);
    if (currentUser) addAudit(currentUser.id, currentUser.role, "VIDEO_CALL_JOIN", "room", "SUCCESS");
  });
});
async function startCall() {
  const remoteId = document.getElementById("remotePeerId").value;
  if (!remoteId) return alert("Enter remote Peer ID");
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  document.getElementById("localVideo").srcObject = localStream;
  const call = peer.call(remoteId, localStream);
  call.on("stream", rs => document.getElementById("remoteVideo").srcObject = rs);
  if (currentUser) addAudit(currentUser.id, currentUser.role, "VIDEO_CALL_START", remoteId, "SUCCESS");
}
function endCall() { if (localStream) localStream.getTracks().forEach(t => t.stop()); }