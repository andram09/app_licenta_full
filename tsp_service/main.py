from fastapi import FastAPI
from pydantic import BaseModel, field_validator
from typing import List, Optional
import math
import time

app = FastAPI(
    title="TSP Optimizer",
    description="Microserviciu de optimizare traseu",
    version="1.0.0"
)

# ─── Modele de date 
class ObjectivePoint(BaseModel):
    id: int | str
    lat: float
    lng: float

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, v):
        if not (-90 <= v <= 90):
            raise ValueError("Latitudinea trebuie sa fie intre -90 si 90")
        return v

    @field_validator("lng")
    @classmethod
    def validate_lng(cls, v):
        if not (-180 <= v <= 180):
            raise ValueError("Longitudinea trebuie sa fie intre -180 si 180")
        return v

class StartPoint(BaseModel):
    lat: float
    lng: float

    @field_validator("lat")
    @classmethod
    def validate_lat(cls, v):
        if not (-90 <= v <= 90):
            raise ValueError("Latitudinea trebuie sa fie intre -90 si 90")
        return v

    @field_validator("lng")
    @classmethod
    def validate_lng(cls, v):
        if not (-180 <= v <= 180):
            raise ValueError("Longitudinea trebuie sa fie intre -180 si 180")
        return v

class OptimizeRequest(BaseModel):
    objectives: List[ObjectivePoint]
    start_point: Optional[StartPoint] = None

class OptimizeResponse(BaseModel):
    ordered_ids: List[int | str]
    total_distance_km: float
    algorithm: str
    execution_time_ms: float

# ─── Utilitare geometrice 

EARTH_RADIUS_KM = 6371.0

# distanta in km pe suprafata pamantului

def haversine(lat1, lng1, lat2, lng2):
    to_rad = math.pi / 180
    d_lat = (lat2 - lat1) * to_rad
    d_lng = (lng2 - lng1) * to_rad
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(lat1 * to_rad) * math.cos(lat2 * to_rad) * math.sin(d_lng / 2) ** 2)
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

# matricea de distante haversine n x n
# calculeaza distanta intre fiecare pereche posibila de obiective si o stocheaza intr-un tabel (matrice patrata n×n)
def build_distance_matrix(points):
    n = len(points)
    dist = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            d = haversine(points[i].lat, points[i].lng, points[j].lat, points[j].lng)
            dist[i][j] = d
            dist[j][i] = d
    return dist

# costul total al unui tur = suma distantelor consecutive
def tour_cost(tour, dist):
    return sum(dist[tour[i]][tour[i + 1]] for i in range(len(tour) - 1))

# ─── Held-Karp (solutie exacta pentru n <= 12)

# algoritm DP pe submultimi - Held & Karp (1962)
# open-path TSP: nu ne intoarcem la punctul de start
def held_karp(dist):
    n = len(dist)
    if n == 1:
        return [0], 0.0
    if n == 2:
        return [0, 1], dist[0][1]

    INF = float('inf')
    FULL = (1 << n) - 1

    # dp[S][i] = costul minim al drumului care porneste din 0,
    #viziteaza submultimea S si se termina in i
    
    dp = [[INF] * n for _ in range(FULL + 1)]
    parent = [[-1] * n for _ in range(FULL + 1)]

    # starea initiala: suntem in nodul 0, am vizitat doar {0}
    dp[1][0] = 0.0

    for S in range(1, FULL + 1):
        # S trebuie sa contina nodul 0 (bitul 0 setat)
        if not (S & 1):
            continue
        for u in range(n):
            if not (S & (1 << u)):
                continue
            if dp[S][u] == INF:
                continue
            # extindere spre un nod nevizitat v
            for v in range(n):
                if S & (1 << v):
                    continue
                new_S = S | (1 << v)
                new_cost = dp[S][u] + dist[u][v]
                if new_cost < dp[new_S][v]:
                    dp[new_S][v] = new_cost
                    parent[new_S][v] = u

    # gasim cel mai bun nod final (nu ne intoarcem la 0)
    best_cost = INF
    best_last = -1
    for u in range(1, n):
        if dp[FULL][u] < best_cost:
            best_cost = dp[FULL][u]
            best_last = u

    # reconstructam drumul
    order = []
    S = FULL
    u = best_last
    while u != -1:
        order.append(u)
        prev = parent[S][u]
        S ^= (1 << u)
        u = prev
    order.reverse()

    return order, best_cost

# ─── Nearest Neighbour (fallback pentru n > 12)

def nearest_neighbour(dist, start=0):
    # greedy: la fiecare pas merg la cel mai apropiat nod nevizitat
    n = len(dist)
    visited = [False] * n
    order = [start]
    visited[start] = True

    for _ in range(n - 1):
        last = order[-1]
        best_next = -1
        best_d = float('inf')
        for j in range(n):
            if not visited[j] and dist[last][j] < best_d:
                best_d = dist[last][j]
                best_next = j
        visited[best_next] = True
        order.append(best_next)

    return order, tour_cost(order, dist)

# ─── 2-opt (imbunatatire peste nearest neighbour)

def two_opt_open_path(initial_order, dist):
    tour = list(initial_order)
    n = len(tour)

    if n < 4:
        return tour, tour_cost(tour, dist)

    improved = True
    while improved:
        improved = False

        for i in range(n - 2):
            for j in range(i + 2, n):
                a, b = tour[i], tour[i + 1]
                c, d = tour[j - 1], tour[j]

                if dist[a][c] + dist[b][d] < dist[a][b] + dist[c][d] - 1e-10:
                    tour[i + 1:j] = reversed(tour[i + 1:j])
                    improved = True

    return tour, tour_cost(tour, dist)

# ─── Endpoint principal

HELD_KARP_LIMIT = 12

@app.post("/optimize", response_model=OptimizeResponse)
def optimize_route(request: OptimizeRequest):
    objectives = request.objectives
    n = len(objectives)

    if n == 0:
        return OptimizeResponse(
            ordered_ids=[],
            total_distance_km=0.0,
            algorithm="none",
            execution_time_ms=0.0
        )

    if n == 1:
        return OptimizeResponse(
            ordered_ids=[objectives[0].id],
            total_distance_km=0.0,
            algorithm="trivial",
            execution_time_ms=0.0
        )

    points_for_algo = list(objectives)
    using_external_start = False

    if request.start_point is not None:
        using_external_start = True
        start_node = ObjectivePoint(
            id="__START__",
            lat=request.start_point.lat,
            lng=request.start_point.lng
        )
        points_for_algo = [start_node] + points_for_algo + [start_node]

    dist = build_distance_matrix(points_for_algo)

    start_time = time.perf_counter()

    algo_n = len(points_for_algo)

    if algo_n <= HELD_KARP_LIMIT:
        order, cost = held_karp(dist)
        algorithm = "held-karp"
    else:
        nn_order, _ = nearest_neighbour(dist, start=0)
        order, cost = two_opt_open_path(nn_order, dist)
        algorithm = "nearest-neighbour+2opt"

    elapsed_ms = (time.perf_counter() - start_time) * 1000

    ordered_ids = []
    for i in order:
        point_id = points_for_algo[i].id
        if point_id != "__START__":
            ordered_ids.append(point_id)

    return OptimizeResponse(
        ordered_ids=ordered_ids,
        total_distance_km=round(cost, 3),
        algorithm=algorithm,
        execution_time_ms=round(elapsed_ms, 2)
    )

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "tsp-optimizer"}