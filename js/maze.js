/**
 * 迷宫生成和渲染模块
 * 使用递归回溯算法生成迷宫
 */

class MazeGenerator {
    constructor(width, height) {
        // 确保宽高为奇数（用于迷宫算法）
        this.width = width % 2 === 0 ? width + 1 : width;
        this.height = height % 2 === 0 ? height + 1 : height;
        this.maze = [];

        // 获取可用屏幕尺寸（考虑 padding）
        const maxWidth = window.innerWidth - 60; // 减去容器内边距
        const maxHeight = window.innerHeight - 300; // 减去头部和底部区域

        // 计算适合的格子大小
        const cellSizeByWidth = Math.floor(maxWidth / this.width);
        const cellSizeByHeight = Math.floor(maxHeight / this.height);

        // 使用较小的值确保迷宫完整显示
        this.cellSize = Math.max(12, Math.min(28, Math.min(cellSizeByWidth, cellSizeByHeight)));
        this.padding = Math.max(10, Math.floor(this.cellSize * 0.5));
    }

    /**
     * 初始化迷宫网格（全是墙）
     */
    initMaze() {
        this.maze = [];
        for (let y = 0; y < this.height; y++) {
            this.maze[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.maze[y][x] = 1; // 1 = 墙
            }
        }
    }

    /**
     * 使用递归回溯算法生成迷宫
     */
    generate() {
        this.initMaze();

        // 从 (1, 1) 开始生成
        const startX = 1;
        const startY = 1;
        this.maze[startY][startX] = 0; // 0 = 路径

        this.carve(startX, startY);

        // 确保起点和终点是路径
        this.maze[1][1] = 0;
        this.maze[this.height - 2][this.width - 2] = 0;

        return this.maze;
    }

    /**
     * 递归雕刻路径
     */
    carve(x, y) {
        // 定义四个方向：上、右、下、左
        const directions = [
            [0, -2], [2, 0], [0, 2], [-2, 0]
        ];

        // 随机打乱方向
        this.shuffleArray(directions);

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;

            // 检查新位置是否在边界内且是墙
            if (newX > 0 && newX < this.width - 1 &&
                newY > 0 && newY < this.height - 1 &&
                this.maze[newY][newX] === 1) {

                // 打通中间的墙
                this.maze[y + dy / 2][x + dx / 2] = 0;

                // 标记新位置为路径
                this.maze[newY][newX] = 0;

                // 递归处理新位置
                this.carve(newX, newY);
            }
        }
    }

    /**
     * Fisher-Yates 洗牌算法
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * 获取起点位置
     */
    getStart() {
        return { x: 1, y: 1 };
    }

    /**
     * 获取终点位置
     */
    getEnd() {
        return { x: this.width - 2, y: this.height - 2 };
    }

    /**
     * 检查位置是否可以移动
     */
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
    constructor(canvas, maze, cellSize = 30, fogMode = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.maze = maze;
        this.cellSize = cellSize;
        this.padding = 20;
        this.fogMode = fogMode;
        this.visibilityRadius = 3; // 迷雾可见半径

        this.resizeCanvas();
    }

    /**
     * 调整画布大小
     */
    resizeCanvas() {
        const width = this.maze[0].length * this.cellSize + this.padding * 2;
        const height = this.maze.length * this.cellSize + this.padding * 2;

        // 处理高分屏
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        this.ctx.scale(dpr, dpr);
    }

    /**
     * 渲染迷宫
     */
    render(player, characterEmoji, endEmoji = '🚩') {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制背景
        this.ctx.fillStyle = '#f8f9fc';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制迷宫路径和墙壁
        for (let y = 0; y < this.maze.length; y++) {
            for (let x = 0; x < this.maze[y].length; x++) {
                const posX = this.padding + x * this.cellSize;
                const posY = this.padding + y * this.cellSize;

                // 检查是否在可见范围内
                const isVisible = this.fogMode ? this.isCellVisible(player.x, player.y, x, y) : true;

                if (this.maze[y][x] === 1) {
                    // 绘制墙壁
                    this.ctx.fillStyle = isVisible ? '#2d3748' : '#4a5568';
                    this.ctx.fillRect(posX, posY, this.cellSize, this.cellSize);

                    if (isVisible) {
                        // 添加墙壁纹理效果
                        this.ctx.fillStyle = '#1a202c';
                        this.ctx.fillRect(posX + this.cellSize * 0.1, posY + this.cellSize * 0.1, this.cellSize * 0.8, this.cellSize * 0.8);
                    }
                } else {
                    // 绘制路径
                    this.ctx.fillStyle = isVisible ? '#ffffff' : '#e2e8f0';
                    this.ctx.fillRect(posX, posY, this.cellSize, this.cellSize);

                    if (isVisible) {
                        // 添加路径边框
                        this.ctx.strokeStyle = '#e2e8f0';
                        this.ctx.strokeRect(posX, posY, this.cellSize, this.cellSize);
                    }
                }
            }
        }

        // 绘制起点标记
        const startX = this.padding + 1 * this.cellSize;
        const startY = this.padding + 1 * this.cellSize;
        const startVisible = this.fogMode ? this.isCellVisible(player.x, player.y, 1, 1) : true;
        if (startVisible) {
            this.ctx.font = `${this.cellSize * 0.7}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('🏁', startX + this.cellSize / 2, startY + this.cellSize / 2);
        }

        // 绘制终点（迷雾模式下总是可见，带发光效果）
        const endX = this.padding + (this.maze[0].length - 2) * this.cellSize;
        const endY = this.padding + (this.maze.length - 2) * this.cellSize;

        if (this.fogMode) {
            // 迷雾模式：绘制终点发光效果
            this.ctx.beginPath();
            this.ctx.arc(endX + this.cellSize / 2, endY + this.cellSize / 2, this.cellSize * 2, 0, Math.PI * 2);
            const gradient = this.ctx.createRadialGradient(
                endX + this.cellSize / 2, endY + this.cellSize / 2, 0,
                endX + this.cellSize / 2, endY + this.cellSize / 2, this.cellSize * 2
            );
            gradient.addColorStop(0, 'rgba(255, 107, 107, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }

        const endVisible = this.fogMode ? this.isCellVisible(player.x, player.y, this.maze[0].length - 2, this.maze.length - 2) : true;
        if (endVisible || this.fogMode) {
            this.ctx.font = `${this.cellSize * 0.7}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(endEmoji, endX + this.cellSize / 2, endY + this.cellSize / 2);
        }

        // 绘制玩家
        this.drawPlayer(player, characterEmoji);

        // 迷雾模式下绘制遮罩效果
        if (this.fogMode) {
            this.drawFogOverlay(player);
        }
    }

    /**
     * 检查格子是否在可见范围内
     */
    isCellVisible(playerX, playerY, cellX, cellY) {
        const dx = Math.abs(cellX - playerX);
        const dy = Math.abs(cellY - playerY);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.visibilityRadius;
    }

    /**
     * 绘制迷雾遮罩
     */
    drawFogOverlay(player) {
        // 绘制完全黑色的迷雾，看不到任何边界
        for (let y = 0; y < this.maze.length; y++) {
            for (let x = 0; x < this.maze[y].length; x++) {
                if (!this.isCellVisible(player.x, player.y, x, y)) {
                    const posX = this.padding + x * this.cellSize;
                    const posY = this.padding + y * this.cellSize;

                    // 绘制完全迷雾
                    this.ctx.fillStyle = '#000000';
                    this.ctx.fillRect(posX, posY, this.cellSize, this.cellSize);
                }
            }
        }
    }

    /**
     * 绘制玩家
     */
    drawPlayer(player, characterEmoji) {
        const x = this.padding + player.x * this.cellSize;
        const y = this.padding + player.y * this.cellSize;

        // 绘制玩家光环效果
        this.ctx.beginPath();
        this.ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize * 0.4, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
        this.ctx.fill();

        // 绘制角色 emoji
        this.ctx.font = `${this.cellSize * 0.75}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(characterEmoji, x + this.cellSize / 2, y + this.cellSize / 2);
    }

    /**
     * 更新迷宫数据
     */
    updateMaze(newMaze) {
        this.maze = newMaze;
        this.resizeCanvas();
    }
}

// 角色配置
const CHARACTERS = {
    cat: { emoji: '🐱', name: '小猫咪' },
    dog: { emoji: '🐶', name: '小狗狗' },
    rabbit: { emoji: '🐰', name: '小白兔' },
    bear: { emoji: '🐻', name: '小熊熊' },
    fox: { emoji: '🦊', name: '小狐狸' },
    panda: { emoji: '🐼', name: '小熊猫' }
};

// 难度配置
const DIFFICULTIES = {
    easy: { width: 10, height: 10, name: '简单' },
    medium: { width: 15, height: 15, name: '中等' },
    hard: { width: 25, height: 25, name: '困难' },
    expert: { width: 41, height: 41, name: '专家' }  // 41x41 = 1681个格子
};