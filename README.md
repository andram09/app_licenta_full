# Aplicație de planificare a itinerariilor turistice

Aplicație web full-stack pentru planificarea și organizarea călătoriilor. Permite utilizatorilor să creeze călătorii, să descopere obiective turistice, să organizeze activitățile pe zile printr-un board drag-and-drop, să vizualizeze traseul pe hartă, să gestioneze bugetul și să optimizeze ruta de vizitare.


## Arhitectura proiectului

```
app_licenta/
├── client/          # Frontend React + Vite
├── server/          # Backend Node.js + Express + MySQL
└── tsp_service/     # Microserviciu Python (FastAPI) — optimizare traseu
```


## Stack tehnologic

| Frontend | React 19, Vite, React Router, Leaflet, dnd-kit, Recharts, Axios |
| Backend | Node.js, Express 5, Sequelize ORM, MySQL, JWT, bcryptjs, Nodemailer |
| TSP Service | Python, FastAPI, Uvicorn |
| AI | Google Gemini 2.5 Flash / 2.0 Flash (estimare costuri) |
| API-uri externe | Google Places (New), Wikidata SPARQL, OpenTripMap, Nominatim |

---

## Funcționalități principale

- **Autentificare** — înregistrare, login, forgot/reset password prin email
- **Gestionare călătorii** — creare, vizualizare și ștergere călătorii
- **Board interactiv** — organizare obiective pe zile cu drag-and-drop
- **Explorare locuri** — descoperire obiective turistice prin Google Places, cu fallback pe Wikidata și OpenTripMap
- **Hartă interactivă** — vizualizarea traseului zilnic pe Leaflet
- **Optimizare traseu** — algoritm Held-Karp (exact, ≤12 obiective) sau Nearest Neighbour + 2-opt (greedy, >12 obiective)
- **Buget și cheltuieli** — tracking cheltuieli pe categorii + estimare automată costuri cu Gemini AI
- **Căutare hoteluri** — modal dedicat pentru căutarea cazării
- **Panou admin** — gestionarea utilizatorilor și a datelor aplicației
- **Profil utilizator** — vizualizare și editare date personale


## Configurare și rulare

### Cerințe prealabile

- Node.js ≥ 18
- Python ≥ 3.10
- MySQL

### 1. Backend (server)

```bash
cd server
npm install
```

Configurează variabilele de mediu în `server/.env` (baza de date, JWT, email, chei API, URL TSP service).

```bash
npm run dev       # development (nodemon)
# sau
npm start         # producție
```

### 2. TSP Service (microserviciu Python)

```bash
cd tsp_service
python -m venv venv
venv\Scripts\activate        # Windows
pip install fastapi uvicorn
uvicorn main:app --reload --port 8000
```

### 3. Frontend (client)

```bash
cd client
npm install
npm run dev      # development pe http://localhost:5173
```

---

## API — Endpoint-uri principale

| POST | `/api/auth/register` | Înregistrare utilizator |
| POST | `/api/auth/login` | Autentificare |
| GET | `/api/trips` | Lista călătoriilor utilizatorului |
| POST | `/api/trips` | Creare călătorie nouă |
| GET | `/api/trips/:id/objectives` | Obiectivele unei călătorii |
| POST | `/api/objectives` | Adăugare obiectiv |
| GET | `/api/external/places` | Căutare locuri prin API-uri externe |
| POST | `/api/optimize-route` | Optimizare traseu (apelează TSP service) |
| GET | `/api/expenses/:tripId` | Cheltuielile unei călătorii |
| POST | `/api/expenses` | Adăugare cheltuială |


## Modele bază de date

- **User** — utilizatori (cu roluri: user / admin)
- **Trip** — călătorii (destinație, date, coordonate)
- **TripDay** — zilele unei călătorii
- **Objective** — obiective turistice ale unei zile
- **Expense** — cheltuieli ale unei călătorii
- **ExpenseCategory** — categorii de cheltuieli
- **UserToken** — refresh tokens


## Algoritmi de optimizare traseu (TSP Service)

- **Held-Karp** (programare dinamică pe submulțimi) — soluție exactă pentru ≤ 12 obiective, complexitate O(n² · 2ⁿ)
- **Nearest Neighbour + 2-opt** — soluție greedy îmbunătățită pentru > 12 obiective
- Distanțele dintre puncte se calculează cu formula **Haversine** (distanță geodezică pe suprafața Pământului)
