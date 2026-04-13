/**
 * Simple A* pathfinding on tile grid.
 */

class MinHeap {
    constructor() {
        this.data = [];
    }
    push(item) {
        this.data.push(item);
        this._bubbleUp(this.data.length - 1);
    }
    pop() {
        const top = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = last;
            this._sinkDown(0);
        }
        return top;
    }
    get size() { return this.data.length; }
    _bubbleUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.data[i].f >= this.data[parent].f) break;
            [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
            i = parent;
        }
    }
    _sinkDown(i) {
        const len = this.data.length;
        while (true) {
            let smallest = i;
            const l = 2 * i + 1;
            const r = 2 * i + 2;
            if (l < len && this.data[l].f < this.data[smallest].f) smallest = l;
            if (r < len && this.data[r].f < this.data[smallest].f) smallest = r;
            if (smallest === i) break;
            [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
            i = smallest;
        }
    }
}

const DIRS = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    // Diagonals
    { dx: 1, dy: -1 },
    { dx: 1, dy: 1 },
    { dx: -1, dy: 1 },
    { dx: -1, dy: -1 }
];

/**
 * Find path from (sx, sy) to (ex, ey) using A*.
 * @param {import('../world/WorldMap.js').WorldMap} worldMap
 * @param {number} sx - Start X (tile)
 * @param {number} sy - Start Y (tile)
 * @param {number} ex - End X (tile)
 * @param {number} ey - End Y (tile)
 * @param {number} maxSteps - Maximum nodes to explore
 * @returns {Array<{x: number, y: number}>|null} Path array or null
 */
export function findPath(worldMap, sx, sy, ex, ey, entity = null, maxSteps = 1500) {
    if (sx === ex && sy === ey) return [];
    if (!worldMap.isWalkable(ex, ey, entity)) return null;

    const open = new MinHeap();
    const closed = new Set();
    const cameFrom = new Map();
    const gScore = new Map();

    const startKey = `${sx},${sy}`;
    gScore.set(startKey, 0);
    open.push({ x: sx, y: sy, f: heuristic(sx, sy, ex, ey) });

    let steps = 0;

    while (open.size > 0 && steps < maxSteps) {
        steps++;
        const current = open.pop();
        const { x, y } = current;
        const key = `${x},${y}`;

        if (x === ex && y === ey) {
            return reconstructPath(cameFrom, ex, ey);
        }

        if (closed.has(key)) continue;
        closed.add(key);

        const currentG = gScore.get(key) || 0;

        for (const dir of DIRS) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;

            if (!worldMap.isWalkable(nx, ny, entity)) continue;

            const nKey = `${nx},${ny}`;
            if (closed.has(nKey)) continue;

            // Diagonal move costs more
            const isDiag = dir.dx !== 0 && dir.dy !== 0;
            const moveCost = isDiag ? 1.414 : 1.0;
            const tentativeG = currentG + moveCost;

            const existingG = gScore.get(nKey);
            if (existingG !== undefined && tentativeG >= existingG) continue;

            gScore.set(nKey, tentativeG);
            cameFrom.set(nKey, key);
            open.push({ x: nx, y: ny, f: tentativeG + heuristic(nx, ny, ex, ey) });
        }
    }

    return null; // No path found
}

function heuristic(ax, ay, bx, by) {
    // Octile distance
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
}

function reconstructPath(cameFrom, ex, ey) {
    const path = [];
    let key = `${ex},${ey}`;
    while (cameFrom.has(key)) {
        const [x, y] = key.split(',').map(Number);
        path.unshift({ x, y });
        key = cameFrom.get(key);
    }
    return path;
}
