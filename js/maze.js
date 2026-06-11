/**
 * 迷宫生成和渲染模块
 * 使用改良递归回溯算法，支持更多分支和随机终点
 */

class MazeGenerator {
    constructor(width, height) {
        this.width = width % 2 === 0 ? width + 1 : width;
        this.height = height % 2 === 0 ? height + 1 : height;
        this.maze = [];
        this.branchFactor = 0.5; // 更高的岔路概率
        this.minPathRatio = 0.4; // 最短路径至少占迷宫格数的40%

        // 自动适配屏幕
        const maxWidth = window.innerWidth - 60;
        const maxHeight = window.innerHeight - 300;
        const cellSizeByWidth = Math.floor(maxWidth / this.width);
        const cellSizeByHeight = Math.floor(maxHeight / this.height);
        this.cellSize = Math.max(12, Math.min(28, Math.min(cellSizeByWidth, cellSizeByHeight)));
        this.padding = Math.max(10, Math.floor(this.cellSize * 0.5));
    }

    initMaze() {
        this.maze = [];
        for (let y = 0; y < this.height; y++) {
            this.maze[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.maze[y][x] = 1; // 墙
            }
        }
    }

    /**
     * 生成迷宫（确保足够的复杂度）
     */
    generate() {
        let attempts = 0;
        const maxAttempts = 10;
        let pathLength = 0;
        const minPathLen = Math.floor(this.width * this.height * this.minPathRatio);

        do {
            this.initMaze();
            this.carve(1, 1);
            this.setRandomStart();
            this.setRandomEnd();

            // 额外岔路，制造更多死胡同（保持1格宽通道）
            this.addExtraBranches();

            // 验证起点到终点的路径长度
            pathLength = this.bfsPathLength(this.startX, this.startY, this.endX, this.endY);
            attempts++;
        } while (pathLength < minPathLen && attempts < maxAttempts);

        return this.maze;
    }

    /**
     * BFS 计算从起点到终点的最短路径长度
     */
    bfsPathLength(sx, sy, ex, ey) {
        const visited = [];
        for (let y = 0; y < this.height; y++) {
            visited[y] = new Array(this.width).fill(false);
        }

        const queue = [{ x: sx, y: sy, dist: 0 }];
        visited[sy][sx] = true;

        while (queue.length > 0) {
            const { x, y, dist } = queue.shift();
            if (x === ex && y === ey) return dist;

            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [dx, dy] of dirs) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                    this.maze[ny][nx] === 0 && !visited[ny][nx]) {
                    visited[ny][nx] = true;
                    queue.push({ x: nx, y: ny, dist: dist + 1 });
                }
            }
        }
        return 0;
    }

    /**
     * 纯DFS递归雕刻 - 保证唯一路径
     */
    carve(x, y) {
        const directions = [[0, -2], [2, 0], [0, 2], [-2, 0]];
        this.shuffleArray(directions);

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;

            if (newX > 0 && newX < this.width - 1 &&
                newY > 0 && newY < this.height - 1 &&
                this.maze[newY][newX] === 1) {

                this.maze[y + dy / 2][x + dx / 2] = 0;
                this.maze[newY][newX] = 0;
                this.carve(newX, newY);
            }
        }
    }

    /**
     * 检查在(x,y)打开会不会造成2×2空地
     */
    safeToOpen(x, y) {
        if (this.maze[y][x] !== 1) return false;
        // 检查包含(x,y)的4个2×2方块
        const blocks = [
            [[-1,-1],[-1,0],[0,-1],[0,0]],
            [[-1,0],[-1,1],[0,0],[0,1]],
            [[0,-1],[0,0],[1,-1],[1,0]],
            [[0,0],[0,1],[1,0],[1,1]]
        ];
        for (const block of blocks) {
            const cells = block.map(([dx, dy]) => {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) return null;
                return this.maze[ny][nx];
            });
            // 如果(x,y)打开后这个2×2全通，则不安全
            const test = cells.map((c, i) => {
                const [dx, dy] = block[i];
                return (dx === 0 && dy === 0) ? 0 : c; // 假设(x,y)打开
            });
            if (test.every(c => c !== null && c !== 1)) return false;
        }
        return true;
    }

    /**
     * 额外打通死胡同岔路 - 不形成环，保证唯一路径
     */
    addExtraBranches() {
        const branchCount = Math.floor(this.width * this.height * 0.04);
        for (let i = 0; i < branchCount; i++) {
            const x = Math.floor(Math.random() * (this.width - 2)) + 1;
            const y = Math.floor(Math.random() * (this.height - 2)) + 1;

            if (!this.safeToOpen(x, y)) continue;

            // 必须恰好只有1个路径邻居（否则会形成环）
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            let pathNeighbors = [];
            for (const [dx, dy] of dirs) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && this.maze[ny][nx] === 0) {
                    pathNeighbors.push([dx, dy]);
                }
            }

            if (pathNeighbors.length !== 1) continue;

            // 打开
            this.maze[y][x] = 0;

            // 向反方向延伸1-2格（每一步都检查不形成环）
            const [px, py] = pathNeighbors[0];
            const dx = -(px), dy = -(py);
            let cx = x + dx, cy = y + dy, steps = 0;
            const maxSteps = 1 + Math.floor(Math.random() * 2);

            while (steps < maxSteps && cx > 0 && cx < this.width - 1 && cy > 0 && cy < this.height - 1 &&
                   this.maze[cy][cx] === 1 && this.safeToOpen(cx, cy)) {
                // 确保不会连接其他路径
                let otherPaths = 0;
                for (const [ddx, ddy] of dirs) {
                    const nnx = cx + ddx, nny = cy + ddy;
                    if (nnx >= 0 && nnx < this.width && nny >= 0 && nny < this.height && this.maze[nny][nnx] === 0) {
                        otherPaths++;
                    }
                }
                if (otherPaths > 0) break; // 已接触其他路径，停止

                this.maze[cy][cx] = 0;
                cx += dx;
                cy += dy;
                steps++;
            }
        }
    }

    /**
     * 设置随机起点
     */
    setRandomStart() {
        const candidates = [];
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.maze[y][x] !== 0) continue;
                // 起点远离终点候选区
                candidates.push({ x, y });
            }
        }
        if (candidates.length > 0) {
            const pick = candidates[Math.floor(Math.random() * candidates.length)];
            this.startX = pick.x;
            this.startY = pick.y;
        } else {
            this.startX = 1;
            this.startY = 1;
        }
    }

    /**
     * 设置随机终点（离起点足够远）
     */
    setRandomEnd() {
        const minDist = Math.max(3, Math.floor(Math.min(this.width, this.height) / 3));
        const candidates = [];

        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.maze[y][x] !== 0) continue;
                const dist = Math.abs(x - 1) + Math.abs(y - 1);
                if (dist >= minDist) {
                    candidates.push({ x, y, dist });
                }
            }
        }

        if (candidates.length > 0) {
            // 排序取最远的几个中随机选一个
            candidates.sort((a, b) => b.dist - a.dist);
            const topCount = Math.max(1, Math.floor(candidates.length * 0.3));
            const pick = candidates[Math.floor(Math.random() * topCount)];
            this.endX = pick.x;
            this.endY = pick.y;
        } else {
            this.endX = this.width - 2;
            this.endY = this.height - 2;
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    getStart() {
        return { x: this.startX || 1, y: this.startY || 1 };
    }

    getEnd() {
        return { x: this.endX, y: this.endY };
    }

    canMove(x, y) {
        return x >= 0 && x < this.width &&
               y >= 0 && y < this.height &&
               this.maze[y][x] === 0;
    }
}

/**
 * 迷宫渲染器
 */
class MazeRenderer {
    constructor(canvas, maze, cellSize = 25, fogMode = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.maze = maze;
        this.cellSize = cellSize;
        this.padding = Math.max(10, Math.floor(cellSize * 0.5));
        this.fogMode = fogMode;
        this.visibilityRadius = 3;
        this.resizeCanvas();
    }

    resizeCanvas() {
        const width = this.maze[0].length * this.cellSize + this.padding * 2;
        const height = this.maze.length * this.cellSize + this.padding * 2;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        this.ctx.scale(dpr, dpr);
    }

    render(player, characterEmoji, startX, startY, endX, endY) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 背景
        this.ctx.fillStyle = '#f5faf9';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let y = 0; y < this.maze.length; y++) {
            for (let x = 0; x < this.maze[y].length; x++) {
                // 跳过起点和终点格子
                if ((x === endX && y === endY) || (x === startX && y === startY)) continue;

                const posX = this.padding + x * this.cellSize;
                const posY = this.padding + y * this.cellSize;
                const isVisible = this.fogMode ? this.isCellVisible(player.x, player.y, x, y) : true;

                if (!isVisible) {
                    this.ctx.fillStyle = '#e0f0ed';
                    this.ctx.fillRect(posX, posY, this.cellSize, this.cellSize);
                } else if (this.maze[y][x] === 1) {
                    this.ctx.fillStyle = '#6b9088';
                    this.ctx.fillRect(posX, posY, this.cellSize, this.cellSize);
                    this.ctx.fillStyle = '#588078';
                    this.ctx.fillRect(posX + this.cellSize * 0.08, posY + this.cellSize * 0.08, this.cellSize * 0.84, this.cellSize * 0.84);
                } else {
                    this.ctx.fillStyle = '#fcfefd';
                    this.ctx.fillRect(posX, posY, this.cellSize, this.cellSize);
                }
            }
        }

        // 起点
        this.drawStartPoint(startX, startY, player);

        // 终点
        this.drawEndPoint(endX, endY);

        // 玩家
        this.drawPlayer(player, characterEmoji);

        // 迷雾
        if (this.fogMode) {
            this.drawFogOverlay(player, startX, startY, endX, endY);
        }
    }

    drawStartPoint(startX, startY, player) {
        const fx = this.padding + startX * this.cellSize;
        const fy = this.padding + startY * this.cellSize;
        const w = this.cellSize;
        const visible = this.fogMode ? this.isCellVisible(player.x, player.y, startX, startY) : true;

        this.ctx.fillStyle = '#fcfefd';
        this.ctx.fillRect(fx, fy, w, w);

        if (visible) {
            this.ctx.font = `${w * 0.55}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = '#5cc9b5';
            this.ctx.fillText('▶', fx + w / 2, fy + w / 2);
        }
    }

    drawEndPoint(endX, endY) {
        const fx = this.padding + endX * this.cellSize;
        const fy = this.padding + endY * this.cellSize;
        const w = this.cellSize;
        const cx = fx + w / 2;
        const cy = fy + w / 2;

        // 白底（路径色），始终可见
        this.ctx.fillStyle = '#fcfefd';
        this.ctx.fillRect(fx, fy, w, w);

        // 红色旗杆和红旗
        const flagSize = w * 0.65;
        this.ctx.font = `${flagSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🚩', cx, cy);

        // 红色光晕让红旗在迷雾中也明显
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, w * 0.45, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        this.ctx.fill();
    }

    findOpenSide(endX, endY) {
        const distToTop = endY;
        const distToBottom = this.maze.length - 1 - endY;
        const distToLeft = endX;
        const distToRight = this.maze[0].length - 1 - endX;
        const minDist = Math.min(distToTop, distToBottom, distToLeft, distToRight);

        if (minDist === distToTop) return 'top';
        if (minDist === distToBottom) return 'bottom';
        if (minDist === distToLeft) return 'left';
        return 'right';
    }

    drawPlayer(player, characterEmoji) {
        const x = this.padding + player.x * this.cellSize;
        const y = this.padding + player.y * this.cellSize;

        // 光环
        this.ctx.beginPath();
        this.ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize * 0.4, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(244, 196, 184, 0.25)';
        this.ctx.fill();

        this.ctx.font = `${this.cellSize * 0.7}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(characterEmoji, x + this.cellSize / 2, y + this.cellSize / 2);
    }

    isCellVisible(playerX, playerY, cellX, cellY) {
        const dx = Math.abs(cellX - playerX);
        const dy = Math.abs(cellY - playerY);
        return Math.sqrt(dx * dx + dy * dy) <= this.visibilityRadius;
    }

    drawFogOverlay(player, startX, startY, endX, endY) {
        for (let y = 0; y < this.maze.length; y++) {
            for (let x = 0; x < this.maze[y].length; x++) {
                // 跳过起点和终点格子
                if ((x === endX && y === endY) || (x === startX && y === startY)) continue;

                if (!this.isCellVisible(player.x, player.y, x, y)) {
                    const posX = this.padding + x * this.cellSize;
                    const posY = this.padding + y * this.cellSize;
                    // 与背景同色的迷雾，完全看不到墙
                    this.ctx.fillStyle = '#e8ecf0';
                    this.ctx.fillRect(posX, posY, this.cellSize, this.cellSize);
                }
            }
        }
    }

    updateMaze(newMaze) {
        this.maze = newMaze;
        this.resizeCanvas();
    }
}

// 角色配置
const CHARACTERS = {
    cat: { emoji: '🐱', name: 'Cat' },
    panda: { emoji: '🐼', name: 'Panda' },
    fish: { emoji: '🐟', name: 'Fish' },
    bird: { emoji: '🐦', name: 'Bird' }
};

// 难度配置
const DIFFICULTIES = {
    medium: { width: 15, height: 15, name: '标准' },
    hard: { width: 25, height: 25, name: '困难' },
    expert: { width: 41, height: 41, name: '专家' }
};