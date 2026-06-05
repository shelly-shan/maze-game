/**
 * 排行榜管理模块
 */

class Leaderboard {
    constructor() {
        this.storageKey = 'mazeGameLeaderboard';
        this.currentDifficulty = 'easy';
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

        // 难度标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchDifficulty(e.target.dataset.difficulty);
            });
        });

        // 清除记录
        document.getElementById('clearRecords').addEventListener('click', () => {
            if (confirm('确定要清除所有排行榜记录吗？')) {
                this.clearAllRecords();
            }
        });

        // 点击模态框外部关闭
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
     * 添加新记录
     */
    addRecord(record) {
        const records = this.getAllRecords();
        records.push(record);

        // 按时间排序，保留每个难度下的前50条记录
        const sortedRecords = this.sortRecords(records);

        // 保存
        this.saveRecords(sortedRecords);

        return this.getRank(record);
    }

    /**
     * 排序记录（按时间升序）
     */
    sortRecords(records) {
        return records.sort((a, b) => a.time - b.time);
    }

    /**
     * 获取记录的排名
     */
    getRank(record) {
        const records = this.getAllRecords()
            .filter(r => r.difficulty === record.difficulty)
            .sort((a, b) => a.time - b.time);

        return records.findIndex(r =>
            r.time === record.time &&
            r.character === record.character &&
            r.date === record.date
        ) + 1;
    }

    /**
     * 获取指定难度的前N名记录
     */
    getTopRecords(difficulty, limit = 10) {
        const records = this.getAllRecords()
            .filter(r => r.difficulty === difficulty)
            .sort((a, b) => a.time - b.time);

        return records.slice(0, limit);
    }

    /**
     * 显示排行榜
     */
    showLeaderboard() {
        document.getElementById('leaderboardPanel').classList.remove('hidden');
        this.renderLeaderboard(this.currentDifficulty);
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
     * 切换难度标签
     */
    switchDifficulty(difficulty) {
        this.currentDifficulty = difficulty;

        // 更新标签样式
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
        });

        // 重新渲染
        this.renderLeaderboard(difficulty);
    }

    /**
     * 渲染排行榜内容
     */
    renderLeaderboard(difficulty) {
        const container = document.getElementById('leaderboardContent');
        const records = this.getTopRecords(difficulty);

        if (records.length === 0) {
            container.innerHTML = `
                <div class="leaderboard-empty">
                    <div class="leaderboard-empty-icon">🏆</div>
                    <p>还没有记录哦！<br>快来挑战吧！</p>
                </div>
            `;
            return;
        }

        const difficultyNames = { easy: '简单', medium: '中等', hard: '困难', expert: '专家' };

        container.innerHTML = records.map((record, index) => {
            const rank = index + 1;
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            const rankIcon = rank <= 3 ? ['', '🥇', '🥈', '🥉'][rank] : `#${rank}`;
            const characterInfo = CHARACTERS[record.character];

            return `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank ${rankClass}">${rankIcon}</div>
                    <div class="leaderboard-avatar">${characterInfo.emoji}</div>
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${characterInfo.name}</div>
                        <div class="leaderboard-date">${this.formatDate(record.date)}</div>
                    </div>
                    <div class="leaderboard-time">${this.formatTime(record.time)}</div>
                </div>
            `;
        }).join('');
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

        // 小于1小时
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return minutes < 1 ? '刚刚' : `${minutes}分钟前`;
        }

        // 小于1天
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}小时前`;
        }

        // 小于7天
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days}天前`;
        }

        // 显示完整日期
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}月${day}日`;
    }

    /**
     * 清除所有记录
     */
    clearAllRecords() {
        localStorage.removeItem(this.storageKey);
        this.renderLeaderboard(this.currentDifficulty);
    }

    /**
     * 清除指定难度的记录
     */
    clearDifficultyRecords(difficulty) {
        const records = this.getAllRecords().filter(r => r.difficulty !== difficulty);
        this.saveRecords(records);
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const records = this.getAllRecords();

        return {
            total: records.length,
            easy: records.filter(r => r.difficulty === 'easy').length,
            medium: records.filter(r => r.difficulty === 'medium').length,
            hard: records.filter(r => r.difficulty === 'hard').length,
            expert: records.filter(r => r.difficulty === 'expert').length,
            bestTimes: {
                easy: this.getBestTime('easy'),
                medium: this.getBestTime('medium'),
                hard: this.getBestTime('hard'),
                expert: this.getBestTime('expert')
            }
        };
    }

    /**
     * 获取指定难度的最佳成绩
     */
    getBestTime(difficulty) {
        const records = this.getTopRecords(difficulty, 1);
        return records.length > 0 ? records[0].time : null;
    }
}

// 创建全局实例
const leaderboard = new Leaderboard();