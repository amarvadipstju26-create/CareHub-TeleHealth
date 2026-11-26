# CareHub - Telehealth Portal | PST_PD_158

Demo telehealth portal with Role-Based Access, Access Delegation, Audit Log, WebRTC Video & E-Prescription.

## Tech Stack
HTML, CSS, JavaScript, Bootstrap 5, PeerJS (WebRTC), localStorage

## How to Run
1. Download this folder
2. Open `index.html` in Chrome/Edge
3. No npm / no build needed

## Features (FR-01 to FR-06)
- FR-01: Role Picker - Patient / Doctor login
- FR-02: Patient Record Viewer with 403 Denied if no access
- FR-03: Doctor Request -> Patient Approve/Deny (Access Delegation)
- FR-04: WebRTC Video Room via PeerJS (share Peer ID)
- FR-05: E-Prescription - Only approved doctor can prescribe
- FR-06: Audit Log - Every action logged with timestamp, Export JSON

## Demo Accounts
- Doctor: Dr. Anjali Mehta (d_201) - Already has access to Ramesh Kumar
- Doctor: Dr. Rohan Gupta (d_202) - No access initially, must request
- Patient: Ramesh Kumar (p_101) - Hypertension
- Patient: Priya Sharma (p_102) - Diabetes
- Patient: Amit Verma (p_103) - Asthma

## Demo Flow
1. Login as Dr. Rohan Gupta -> View Ramesh Kumar -> See 403 Denied -> Request Access
2. Login as Ramesh Kumar -> Approve request
3. Login as Dr. Rohan again -> View record -> Success -> Write Prescription
4. Check Audit Log -> Export JSON
5. Video: Copy Peer ID, open in 2 tabs, enter ID, Start Call