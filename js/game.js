/**
 * 游戏主逻辑模块
 */

class MazeGame {
    constructor() {
        this.canvas = document.getElementById('mazeCanvas');
        this.mazeGenerator = null;
        this.mazeRenderer = null;
        this.player = { x: 1, y: 1 };
        this.end = { x: 0, y: 0 };
        this.isPlaying = false;
        this.difficulty = 'easy';
        this.character = 'cat';
        this.fogMode = false;
        this.startTime = 0;
        this.timerInterval = null;

        // 触摸控制
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.minSwipeDistance = 20; // 降低滑动距离，提升响应速度

        this.init();
    }

    /**
     * 初始化游戏
     */
    init() {
        this.bindEvents();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 开始游戏按钮
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());

        // 重新开始按钮
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());

        // 返回按钮
        document.getElementById('backBtn').addEventListener('click', () => this.backToConfig());

        // 键盘控制
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // 触摸控制
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });

        // 再玩一次按钮
        document.getElementById('playAgainBtn').addEventListener('click', () => this.playAgain());

        // 退出游戏按钮
        document.getElementById('exitGameBtn').addEventListener('click', () => this.exitGame());

        // 虚拟方向键
        document.querySelectorAll('.d-pad-btn').forEach(btn => {
            const handleMove = (e) => {
                e.preventDefault();
                if (!this.isPlaying) return;

                const direction = btn.dataset.direction;
                switch (direction) {
                    case 'up':
                        this.movePlayer(0, -1);
                        break;
                    case 'down':
                        this.movePlayer(0, 1);
                        break;
                    case 'left':
                        this.movePlayer(-1, 0);
                        break;
                    case 'right':
                        this.movePlayer(1, 0);
                        break;
                }
            };

            // 支持点击和触摸
            btn.addEventListener('click', handleMove);
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleMove(e);
            }, { passive: false });
        });

        // 窗口大小改变时重新渲染
        window.addEventListener('resize', () => {
            if (this.isPlaying && this.mazeRenderer) {
                this.mazeRenderer.render(this.player, CHARACTERS[this.character].emoji);
            }
        });
    }

    /**
     * 开始游戏
     */
    startGame() {
        // 获取配置
        this.difficulty = document.querySelector('input[name="difficulty"]:checked').value;
        this.character = document.querySelector('input[name="character"]:checked').value;
        this.fogMode = document.querySelector('input[name="fogMode"]:checked').value === 'fog';

        // 生成迷宫
        this.generateMaze();

        // 切换到游戏界面
        this.switchToGame();

        // 开始计时
        this.startTimer();

        this.isPlaying = true;
    }

    /**
     * 生成迷宫
     */
    generateMaze() {
        const config = DIFFICULTIES[this.difficulty];
        this.mazeGenerator = new MazeGenerator(config.width, config.height);
        const maze = this.mazeGenerator.generate();

        // 初始化渲染器（传入迷雾模式）
        this.mazeRenderer = new MazeRenderer(this.canvas, maze, this.mazeGenerator.cellSize, this.fogMode);

        // 设置玩家和终点位置
        this.player = { ...this.mazeGenerator.getStart() };
        this.end = { ...this.mazeGenerator.getEnd() };

        // 渲染
        this.mazeRenderer.render(this.player, CHARACTERS[this.character].emoji);
    }

    /**
     * 切换到游戏界面
     */
    switchToGame() {
        document.getElementById('configPanel').classList.add('hidden');
        document.getElementById('gameArea').classList.remove('hidden');
    }

    /**
     * 切换到配置界面
     */
    switchToConfig() {
        document.getElementById('configPanel').classList.remove('hidden');
        document.getElementById('gameArea').classList.add('hidden');
    }

    /**
     * 返回配置界面
     */
    backToConfig() {
        this.stopTimer();
        this.isPlaying = false;
        this.switchToConfig();
    }

    /**
     * 重新开始游戏
     */
    restartGame() {
        this.stopTimer();
        this.generateMaze();
        this.startTimer();
        this.isPlaying = true;
    }

    /**
     * 再玩一次
     */
    playAgain() {
        document.getElementById('victoryModal').classList.add('hidden');
        // 延迟一小段时间确保模态框完全隐藏
        setTimeout(() => {
            this.restartGame();
        }, 100);
    }

    /**
     * 退出游戏
     */
    exitGame() {
        document.getElementById('victoryModal').classList.add('hidden');
        this.backToConfig();
    }

    /**
     * 处理键盘输入
     */
    handleKeyDown(e) {
        if (!this.isPlaying) return;

        // 支持多种按键格式
        let key = '';
        if (e.key) {
            key = e.key.toLowerCase();
        } else if (e.code) {
            key = e.code.toLowerCase();
        }

        // 方向映射
        const directionMap = {
            'arrowup': [0, -1],
            'w': [0, -1],
            'keyw': [0, -1],  // 标准键码
            'arrowdown': [0, 1],
            's': [0, 1],
            'keys': [0, 1],
            'arrowleft': [-1, 0],
            'a': [-1, 0],
            'keya': [-1, 0],
            'arrowright': [1, 0],
            'd': [1, 0],
            'keyd': [1, 0]
        };

        const direction = directionMap[key];

        if (direction) {
            e.preventDefault();
            this.movePlayer(direction[0], direction[1]);
        }
    }

    /**
     * 处理触摸开始
     */
    handleTouchStart(e) {
        e.preventDefault(); // 阻止默认行为
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }

    /**
     * 处理触摸移动（阻止滚动）
     */
    handleTouchMove(e) {
        e.preventDefault(); // 阻止页面滚动
    }

    /**
     * 处理触摸结束
     */
    handleTouchEnd(e) {
        e.preventDefault(); // 阻止默认行为
        if (!this.isPlaying) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;

        // 判断滑动方向
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // 水平滑动
            if (Math.abs(deltaX) > this.minSwipeDistance) {
                this.movePlayer(deltaX > 0 ? 1 : -1, 0);
            }
        } else {
            // 垂直滑动
            if (Math.abs(deltaY) > this.minSwipeDistance) {
                this.movePlayer(0, deltaY > 0 ? 1 : -1);
            }
        }
    }

    /**
     * 移动玩家
     */
    movePlayer(dx, dy) {
        if (!this.isPlaying) return;

        const newX = this.player.x + dx;
        const newY = this.player.y + dy;

        // 检查是否可以移动
        if (this.mazeGenerator.canMove(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;

            // 重新渲染
            this.mazeRenderer.render(this.player, CHARACTERS[this.character].emoji);

            // 检查是否到达终点
            this.checkVictory();
        }
    }

    /**
     * 检查是否胜利
     */
    checkVictory() {
        if (this.player.x === this.end.x && this.player.y === this.end.y) {
            this.victory();
        }
    }

    /**
     * 胜利处理
     */
    victory() {
        this.isPlaying = false;
        this.stopTimer();

        const elapsedTime = Date.now() - this.startTime;

        // 保存到排行榜
        const rank = leaderboard.addRecord({
            difficulty: this.difficulty,
            character: this.character,
            time: elapsedTime,
            date: new Date().toISOString()
        });

        // 显示胜利弹窗
        this.showVictoryModal(elapsedTime, rank);
    }

    /**
     * 显示胜利弹窗
     */
    showVictoryModal(elapsedTime, rank) {
        document.getElementById('victoryTime').textContent = this.formatTime(elapsedTime);

        const rankDisplay = rank <= 3 ? ['', '🥇 第1名', '🥈 第2名', '🥉 第3名'][rank] : `第${rank}名`;
        document.getElementById('victoryRank').textContent = rankDisplay;

        document.getElementById('victoryModal').classList.remove('hidden');
    }

    /**
     * 开始计时
     */
    startTimer() {
        this.startTime = Date.now();
        this.updateTimerDisplay();

        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();
        }, 50);
    }

    /**
     * 停止计时
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * 更新计时器显示
     */
    updateTimerDisplay() {
        const elapsedTime = Date.now() - this.startTime;
        document.getElementById('timerDisplay').textContent = this.formatTime(elapsedTime);
    }

    /**
     * 格式化时间
     */
    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);

        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
    }
}

// 游戏启动
const game = new MazeGame();