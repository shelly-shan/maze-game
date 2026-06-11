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
        this.start = { x: 1, y: 1 };
        this.isPlaying = false;
        this.difficulty = 'medium';
        this.character = 'cat';
        this.fogMode = false;
        this.startTime = 0;
        this.timerInterval = null;
        this.pendingRecord = null;
        this.lightUses = 3;         // 开灯剩余次数
        this.lightTimer = null;      // 开灯计时器
        this.lightActive = false;    // 是否正在开灯

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

        // 开灯按钮
        document.getElementById('lightBtn').addEventListener('click', () => this.toggleLight());

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
                this.mazeRenderer.render(this.player, CHARACTERS[this.character].emoji, this.start.x, this.start.y, this.end.x, this.end.y);
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

        // 重置开灯次数
        this.lightUses = 3;
        this.lightActive = false;
        document.getElementById('lightCount').textContent = '3';
        document.getElementById('lightBtn').classList.toggle('hidden', !this.fogMode);

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

        // 设置玩家、起点和终点位置
        this.player = { ...this.mazeGenerator.getStart() };
        this.start = { ...this.mazeGenerator.getStart() };
        this.end = { ...this.mazeGenerator.getEnd() };

        // 渲染
        this.mazeRenderer.render(this.player, CHARACTERS[this.character].emoji, this.end.x, this.end.y);
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
        if (this.lightTimer) { clearTimeout(this.lightTimer); this.lightTimer = null; }
        this.lightActive = false;
        this.isPlaying = false;
        this.switchToConfig();
    }

    /**
     * 重新开始游戏
     */
    restartGame() {
        this.stopTimer();
        if (this.lightTimer) { clearTimeout(this.lightTimer); this.lightTimer = null; }
        this.lightActive = false;
        this.lightUses = 3;
        document.getElementById('lightCount').textContent = '3';
        document.getElementById('lightBtn').classList.toggle('hidden', !this.fogMode);
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
     * 开灯 - 3秒看清全图
     */
    toggleLight() {
        if (!this.isPlaying || this.lightUses <= 0 || this.lightActive) return;

        this.lightUses--;
        this.lightActive = true;

        // 更新按钮显示
        document.getElementById('lightCount').textContent = this.lightUses;
        if (this.lightUses === 0) {
            document.getElementById('lightBtn').classList.add('hidden');
        }

        // 闪烁动画
        const lightBtn = document.getElementById('lightBtn');
        lightBtn.classList.add('flash');
        setTimeout(() => lightBtn.classList.remove('flash'), 1500);

        // 立即渲染全图
        this.mazeRenderer.fogMode = false;
        this.mazeRenderer.render(this.player, CHARACTERS[this.character].emoji,
            this.start.x, this.start.y, this.end.x, this.end.y);

        // 3秒后恢复迷雾
        if (this.lightTimer) clearTimeout(this.lightTimer);
        this.lightTimer = setTimeout(() => {
            this.lightActive = false;
            if (this.isPlaying) {
                this.mazeRenderer.fogMode = true;
                this.mazeRenderer.render(this.player, CHARACTERS[this.character].emoji,
                    this.start.x, this.start.y, this.end.x, this.end.y);
            }
        }, 3000);
    }

    /**
     * 重新开始游戏
     */

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
            this.mazeRenderer.render(this.player, CHARACTERS[this.character].emoji, this.start.x, this.start.y, this.end.x, this.end.y);

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

        // 暂存成绩，等待用户填写信息
        this.pendingRecord = {
            difficulty: this.difficulty,
            character: this.character,
            mode: this.fogMode ? 'fog' : 'normal',
            time: elapsedTime,
            date: new Date().toISOString()
        };

        // 显示胜利弹窗
        this.showVictoryModal(elapsedTime);
    }

    /**
     * 显示胜利弹窗
     */
    showVictoryModal(elapsedTime) {
        document.getElementById('victoryTime').textContent = this.formatTime(elapsedTime);

        // 预选角色
        const saveChars = document.querySelectorAll('input[name="saveCharacter"]');
        saveChars.forEach(input => {
            input.checked = input.value === this.character;
        });

        const mode = this.fogMode ? 'fog' : 'normal';

        // 检查是否进入前十（与现有记录比较）
        const topRecords = leaderboard.getTopRecords(mode, this.difficulty, 10);
        const isTop10 = topRecords.length < 10 || elapsedTime < topRecords[topRecords.length - 1].time;

        if (isTop10) {
            // 前十名：显示保存表单
            document.getElementById('saveScoreForm').classList.remove('hidden');
            document.getElementById('savePlayerName').value = '';
            document.getElementById('savePrompt').textContent = `🏆 成绩进入前十！是否输入 ID 保存？`;
        } else {
            // 未进前十：隐藏保存表单
            document.getElementById('saveScoreForm').classList.add('hidden');
        }
        document.getElementById('savedMessage').classList.add('hidden');

        // 计算排名
        const rank = leaderboard.getRank({
            ...this.pendingRecord,
            character: this.character,
            mode: mode
        });
        const rankDisplay = rank <= 3 ? ['', '🥇 第1名', '🥈 第2名', '🥉 第3名'][rank] : `第${rank}名`;
        document.getElementById('victoryRank').textContent = rankDisplay;

        document.getElementById('victoryModal').classList.remove('hidden');
    }

    /**
     * 保存成绩
     */
    saveScore() {
        const playerName = document.getElementById('savePlayerName').value.trim();
        if (!playerName) {
            document.getElementById('savePlayerName').style.borderColor = '#f56565';
            document.getElementById('savePlayerName').focus();
            document.getElementById('savePlayerName').addEventListener('input', function fixBorder() {
                this.style.borderColor = '';
                this.removeEventListener('input', fixBorder);
            });
            return;
        }

        // 获取选择的角色
        const saveCharacter = document.querySelector('input[name="saveCharacter"]:checked').value;

        // 保存记录
        const record = {
            ...this.pendingRecord,
            character: saveCharacter,
            playerName: playerName
        };

        leaderboard.addRecord(record);

        // 切换到已保存状态
        document.getElementById('saveScoreForm').classList.add('hidden');
        document.getElementById('savedMessage').classList.remove('hidden');

        // 更新排名显示
        const rank = leaderboard.getRank(record);
        const rankDisplay = rank <= 3 ? ['', '🥇 第1名', '🥈 第2名', '🥉 第3名'][rank] : `第${rank}名`;
        document.getElementById('victoryRank').textContent = rankDisplay;
    }

    /**
     * 跳过保存
     */
    skipSave() {
        document.getElementById('saveScoreForm').classList.add('hidden');
        document.getElementById('savedMessage').classList.remove('hidden');
        document.getElementById('savedMessage').innerHTML = '<p>😊 跳过保存</p>';
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