/**
 * 排行榜管理模块
 */

class Leaderboard {
    constructor() {
        this.storageKey = 'mazeGameLeaderboard';
        this.currentDifficulty = 'medium';
        this.currentMode = 'normal'; // 'normal' | 'fog'
        this.init();
    }

    /**
     * 初始化排行榜
     */
    init() {
        this.bindEvents();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 排行榜开关
        document.getElementById('leaderboardBtn').addEventListener('click', () => {
            this.showLeaderboard();
        });

        document.getElementById('closeLeaderboard').addEventListener('click', () => {
            this.hideLeaderboard();
        });

        document.getElementById('victoryLeaderboardBtn').addEventListener('click', () => {
            this.hideModal();
            this.showLeaderboard();
        });

        // 模式切换
        document.querySelectorAll('.mode-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
            });
        });

        // 难度标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchDifficulty(e.target.dataset.difficulty);
            });
        });

        // 清除记录
        document.getElementById('clearRecords').addEventListener('click', () => {
            if (confirm('确定要清除当前排行榜的所有记录吗？')) {
                this.clearRecords(this.currentMode, this.currentDifficulty);
            }
        });

        // 保存成绩按钮
        document.getElementById('saveScoreBtn').addEventListener('click', () => {
            game.saveScore();
        });

        // 跳过保存
        document.getElementById('skipSaveBtn').addEventListener('click', () => {
            game.skipSave();
        });

        // 点击模态框外部关闭排行榜
        document.getElementById('leaderboardPanel').addEventListener('click', (e) => {
            if (e.target.id === 'leaderboardPanel') {
                this.hideLeaderboard();
            }
        });
    }

    /**
     * 获取所有记录
     */
    getAllRecords() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    /**
     * 保存记录
     */
    saveRecords(records) {
        localStorage.setItem(this.storageKey, JSON.stringify(records));
    }

    /**
     * 添加新记录（暂存，等用户填写名字后保存）
     */
    addRecord(record) {
        const records = this.getAllRecords();
        records.push(record);

        // 按时间排序
        records.sort((a, b) => a.time - b.time);

        // 保存
        this.saveRecords(records);

        return this.getRank(record);
    }

    /**
     * 获取记录的排名
     */
    getRank(record) {
        const records = this.getAllRecords()
            .filter(r => r.difficulty === record.difficulty && r.mode === record.mode)
            .sort((a, b) => a.time - b.time);

        return records.findIndex(r =>
            r.time === record.time &&
            r.character === record.character &&
            r.date === record.date
        ) + 1;
    }

    /**
     * 获取指定模式和难度的前10名记录
     */
    getTopRecords(mode, difficulty, limit = 10) {
        const records = this.getAllRecords()
            .filter(r => r.mode === mode && r.difficulty === difficulty)
            .sort((a, b) => a.time - b.time);

        return records.slice(0, limit);
    }

    /**
     * 显示排行榜
     */
    showLeaderboard() {
        document.getElementById('leaderboardPanel').classList.remove('hidden');
        // 设置模式标签
        document.querySelectorAll('.mode-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.currentMode);
        });
        // 设置难度标签
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === this.currentDifficulty);
        });
        this.renderLeaderboard();
    }

    /**
     * 隐藏排行榜
     */
    hideLeaderboard() {
        document.getElementById('leaderboardPanel').classList.add('hidden');
    }

    /**
     * 隐藏胜利弹窗
     */
    hideModal() {
        document.getElementById('victoryModal').classList.add('hidden');
    }

    /**
     * 切换模式
     */
    switchMode(mode) {
        this.currentMode = mode;

        document.querySelectorAll('.mode-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        this.renderLeaderboard();
    }

    /**
     * 切换难度标签
     */
    switchDifficulty(difficulty) {
        this.currentDifficulty = difficulty;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
        });

        this.renderLeaderboard();
    }

    /**
     * 渲染排行榜内容
     */
    renderLeaderboard() {
        const container = document.getElementById('leaderboardContent');
        const records = this.getTopRecords(this.currentMode, this.currentDifficulty);

        if (records.length === 0) {
            container.innerHTML = `
                <div class="leaderboard-empty">
                    <div class="leaderboard-empty-icon">🏆</div>
                    <p>还没有记录哦！<br>快来挑战吧！</p>
                </div>
            `;
            return;
        }

        container.innerHTML = records.map((record, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            const rankIcon = rank <= 3 ? ['', '🥇', '🥈', '🥉'][rank] : `#${rank}`;
            const characterInfo = CHARACTERS[record.character] || { emoji: '🎮', name: '未知' };
            const playerName = record.playerName || characterInfo.name;

            return `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank ${rankClass}">${rankIcon}</div>
                    <div class="leaderboard-avatar">${characterInfo.emoji}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${this.escapeHtml(playerName)}</div>
                        <div class="leaderboard-date">${this.formatDate(record.date)}</div>
                    </div>
                    <div class="leaderboard-time">${this.formatTime(record.time)}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * HTML 转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    /**
     * 格式化日期
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return minutes < 1 ? '刚刚' : `${minutes}分钟前`;
        }

        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}小时前`;
        }

        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days}天前`;
        }

        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}月${day}日`;
    }

    /**
     * 清除当前模式和难度的记录
     */
    clearRecords(mode, difficulty) {
        const records = this.getAllRecords()
            .filter(r => !(r.mode === mode && r.difficulty === difficulty));
        this.saveRecords(records);
        this.renderLeaderboard();
    }

    /**
     * 清除所有记录
     */
    clearAllRecords() {
        localStorage.removeItem(this.storageKey);
        this.renderLeaderboard();
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const records = this.getAllRecords();

        return {
            total: records.length,
            normal: records.filter(r => r.mode === 'normal').length,
            fog: records.filter(r => r.mode === 'fog').length
        };
    }

    /**
     * 获取指定模式的最佳成绩
     */
    getBestTime(mode) {
        const records = this.getAllRecords()
            .filter(r => r.mode === mode)
            .sort((a, b) => a.time - b.time);
        return records.length > 0 ? records[0].time : null;
    }

    /**
     * 设置排行榜显示的模式
     */
    setCurrentMode(mode) {
        this.currentMode = mode;
    }

    /**
     * 设置排行榜显示的难度
     */
    setCurrentDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
    }
}

// 创建全局实例
const leaderboard = new Leaderboard();