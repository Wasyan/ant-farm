/**
 * game.js - Ant Farm Puzzle: Complete Game Engine
 */

class AntFarmGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.currentLevelIndex = 0;
        this.level = null;
        this.grid = []; // 2D array of colors or null
        this.gridRows = 0;
        this.gridCols = 0;

        // Active slots (e.g. 5 slots where opened boxes sit)
        this.maxSlots = 5;
        this.activeSlots = []; // Array of { id, color, totalAnts, remainingAnts, antsInField, state: 'idle'|'active'|'stuck'|'finished', animOpen: 0 }

        // Upcoming conveyor queue of boxes
        this.conveyorBoxes = []; // Array of { id, color, count }

        // Live ants in the field
        this.ants = []; // Array of Ant instances
        this.particles = []; // Visual particle effects (dust, stars, confetti)

        // Game stats & state
        this.badMoves = 0;
        this.movesHistory = []; // For Undo functionality
        this.isGameOver = false;
        this.isVictory = false;
        this.gameSpeed = 1.0; // 1x, 1.5x, 2x
        this.targetedCubes = new Set(); // Set of "r,c" strings currently targeted by ants

        // Dimensions and layout
        this.width = 900;
        this.height = 700;
        this.dpr = window.devicePixelRatio || 1;
        this.cellSize = 44;
        this.gridOriginX = 0;
        this.gridOriginY = 0;

        this.lastTime = performance.now();
        this.animFrameId = null;

        this.initDOM();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.loadLevel(0);
        this.startLoop();
    }

    initDOM() {
        // Top controls
        document.getElementById('btnRestart').addEventListener('click', () => {
            window.soundManager.playClick();
            this.restartLevel();
        });

        document.getElementById('btnUndo').addEventListener('click', () => {
            window.soundManager.playClick();
            this.undoMove();
        });

        document.getElementById('btnSpeed').addEventListener('click', () => {
            window.soundManager.playClick();
            this.toggleSpeed();
        });

        document.getElementById('btnSound').addEventListener('click', () => {
            const muted = window.soundManager.toggleMute();
            document.getElementById('btnSound').innerHTML = muted ? '🔇 Звук: Выкл' : '🔊 Звук: Вкл';
        });

        document.getElementById('btnLevels').addEventListener('click', () => {
            window.soundManager.playClick();
            this.showLevelsModal();
        });

        document.getElementById('btnCustom').addEventListener('click', () => {
            window.soundManager.playClick();
            this.showCustomLevelModal();
        });

        // Canvas interactions
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));

        // Modal buttons
        document.getElementById('modalNextLevel').addEventListener('click', () => {
            window.soundManager.playClick();
            this.hideModals();
            this.loadLevel(this.currentLevelIndex + 1);
        });

        document.getElementById('modalRestart').addEventListener('click', () => {
            window.soundManager.playClick();
            this.hideModals();
            this.restartLevel();
        });

        const btnDefeatRestart = document.getElementById('modalDefeatRestart');
        if (btnDefeatRestart) {
            btnDefeatRestart.addEventListener('click', () => {
                window.soundManager.playClick();
                this.hideModals();
                this.restartLevel();
            });
        }

        document.getElementById('modalUndo').addEventListener('click', () => {
            window.soundManager.playClick();
            this.hideModals();
            this.undoMove();
        });

        document.getElementById('modalCloseLevels').addEventListener('click', () => {
            window.soundManager.playClick();
            this.hideModals();
        });

        document.getElementById('modalCloseCustom').addEventListener('click', () => {
            window.soundManager.playClick();
            this.hideModals();
        });

        document.getElementById('btnPlayCustom').addEventListener('click', () => {
            window.soundManager.playClick();
            this.startCustomLevel();
        });
    }

    resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        this.width = Math.max(700, Math.min(1000, rect.width));
        this.height = Math.max(650, Math.min(850, window.innerHeight - 140));

        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.recalculateLayout();
    }

    recalculateLayout() {
        if (!this.grid || this.gridRows === 0) return;

        // Determine optimal cell size based on grid rows/cols and canvas size
        const maxGridWidth = this.width * 0.75;
        const maxGridHeight = this.height * 0.45;
        const cellW = maxGridWidth / this.gridCols;
        const cellH = maxGridHeight / this.gridRows;

        this.cellSize = Math.floor(Math.min(52, Math.max(34, Math.min(cellW, cellH))));

        this.gridOriginX = Math.round((this.width - this.gridCols * this.cellSize) / 2);
        this.gridOriginY = 80; // top padding for header
    }

    loadLevel(levelIndex) {
        if (levelIndex >= LEVELS.length) {
            levelIndex = 0; // loop or win all
        }
        this.currentLevelIndex = levelIndex;
        this.level = LEVELS[levelIndex];

        document.getElementById('levelTitle').textContent = this.level.title;
        document.getElementById('levelSubtitle').textContent = this.level.subtitle;

        // Clone grid
        this.gridRows = this.level.grid.length;
        this.gridCols = this.level.grid[0].length;
        this.grid = this.level.grid.map(row => [...row]);

        // Max slots
        this.maxSlots = this.level.maxSlots || 5;
        this.activeSlots = new Array(this.maxSlots).fill(null);

        // Clone conveyor boxes
        this.conveyorBoxes = this.level.boxes.map((b, idx) => ({
            id: `box_${Date.now()}_${idx}`,
            color: b.color,
            count: b.count
        }));

        this.ants = [];
        this.particles = [];
        this.badMoves = 0;
        this.movesHistory = [];
        this.targetedCubes.clear();
        this.isGameOver = false;
        this.isVictory = false;

        this.saveState(); // Initial state for undo
        this.recalculateLayout();
        this.updateStatsUI();
        this.hideModals();
    }

    restartLevel() {
        this.loadLevel(this.currentLevelIndex);
    }

    toggleSpeed() {
        if (this.gameSpeed === 1.0) {
            this.gameSpeed = 1.5;
            document.getElementById('btnSpeed').innerHTML = '⚡ 1.5x';
        } else if (this.gameSpeed === 1.5) {
            this.gameSpeed = 2.2;
            document.getElementById('btnSpeed').innerHTML = '⚡⚡ 2.2x';
        } else {
            this.gameSpeed = 1.0;
            document.getElementById('btnSpeed').innerHTML = '▶ 1.0x';
        }
    }

    updateStatsUI() {
        const remainingCubes = this.countRemainingCubes();
        document.getElementById('cubesCount').textContent = remainingCubes;
        document.getElementById('badMovesCount').textContent = this.badMoves;

        const freeSlots = this.activeSlots.filter(s => s === null).length;
        document.getElementById('slotsCount').textContent = `${this.maxSlots - freeSlots}/${this.maxSlots}`;
    }

    countRemainingCubes() {
        let count = 0;
        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                if (this.grid[r][c] !== null) count++;
            }
        }
        return count;
    }

    /**
     * Check if a cube at (r, c) is currently accessible:
     * Accessible if there is NO cube below it in the same column!
     * Ants crawl from bottom to top, so they take the lowest exposed cube in each column.
     */
    isCubeAccessible(r, c) {
        if (this.grid[r][c] === null) return false;
        if (this.targetedCubes.has(`${r},${c}`)) return false; // Already claimed by an ant

        // Check all rows strictly below this cell in column c
        for (let rowBelow = r + 1; rowBelow < this.gridRows; rowBelow++) {
            if (this.grid[rowBelow][c] !== null) {
                return false; // Obstructed by a cube underneath!
            }
        }
        return true;
    }

    /**
     * Get all currently accessible cubes of a specific color
     */
    getAccessibleCubes(color) {
        const cubes = [];
        for (let r = this.gridRows - 1; r >= 0; r--) {
            for (let c = 0; c < this.gridCols; c++) {
                if (this.grid[r][c] === color && this.isCubeAccessible(r, c)) {
                    cubes.push({ r, c, color });
                }
            }
        }
        return cubes;
    }

    /**
     * Get ALL accessible cubes across all colors
     */
    getAllAccessibleCubes() {
        const cubes = [];
        for (let r = this.gridRows - 1; r >= 0; r--) {
            for (let c = 0; c < this.gridCols; c++) {
                if (this.grid[r][c] !== null && this.isCubeAccessible(r, c)) {
                    cubes.push({ r, c, color: this.grid[r][c] });
                }
            }
        }
        return cubes;
    }

    /**
     * Snapshot state for Undo
     */
    saveState() {
        // Deep clone state
        const state = {
            grid: this.grid.map(row => [...row]),
            activeSlots: this.activeSlots.map(s => s ? { ...s } : null),
            conveyorBoxes: this.conveyorBoxes.map(b => ({ ...b })),
            badMoves: this.badMoves
        };
        this.movesHistory.push(state);
        if (this.movesHistory.length > 20) {
            this.movesHistory.shift();
        }
    }

    undoMove() {
        if (this.movesHistory.length <= 1) return;
        // If ants are currently marching, wait or clear
        if (this.ants.length > 0) {
            // Cancel current live ants to avoid desync
            this.ants = [];
            this.targetedCubes.clear();
        }

        // Pop current
        this.movesHistory.pop();
        const prev = this.movesHistory[this.movesHistory.length - 1];
        if (!prev) return;

        this.grid = prev.grid.map(row => [...row]);
        this.activeSlots = prev.activeSlots.map(s => s ? { ...s } : null);
        this.conveyorBoxes = prev.conveyorBoxes.map(b => ({ ...b }));
        this.badMoves = prev.badMoves;
        this.isGameOver = false;
        this.isVictory = false;

        this.hideModals();
        this.updateStatsUI();
        this.showFloatText(this.width / 2, this.height / 2, "Ход отменён ↩️", "#3b82f6");
    }

    /**
     * Player clicks an upcoming box to deploy and OPEN it in an active slot
     */
    openConveyorBox(conveyorIndex) {
        if (this.isGameOver || this.isVictory) return;
        if (conveyorIndex < 0 || conveyorIndex >= this.conveyorBoxes.length) return;

        // Find first empty active slot
        const emptySlotIndex = this.activeSlots.findIndex(s => s === null);
        if (emptySlotIndex === -1) {
            // All slots full!
            window.soundManager.playBadMove();
            this.showFloatText(this.width / 2, this.height - 180, "Все слоты заняты!", "#ef4444");
            return;
        }

        this.saveState();

        const boxData = this.conveyorBoxes.splice(conveyorIndex, 1)[0];
        window.soundManager.playBoxOpen();

        // Place box in slot
        const activeBox = {
            id: boxData.id,
            slotIndex: emptySlotIndex,
            color: boxData.color,
            totalAnts: boxData.count,
            remainingAnts: boxData.count, // Ants still inside box waiting to carry cubes
            antsInField: 0,              // Ants currently outside on a mission
            status: 'opening',           // 'opening', 'active', 'stuck', 'finished'
            openAnim: 0,                 // 0 to 1 for smooth lid popping
            shaking: 0,
            confusedTimer: 0
        };

        this.activeSlots[emptySlotIndex] = activeBox;
        this.updateStatsUI();

        // Check if there are accessible cubes for this box right now
        const accessible = this.getAccessibleCubes(activeBox.color);
        if (accessible.length === 0) {
            // Bad move! Box opened with no matching accessible cubes!
            this.badMoves++;
            activeBox.status = 'stuck';
            activeBox.confusedTimer = 180; // Show '?' emote
            activeBox.shaking = 15;
            window.soundManager.playBadMove();
            this.showFloatText(
                this.getSlotCenter(emptySlotIndex).x,
                this.getSlotCenter(emptySlotIndex).y - 40,
                "Плохой ход! Нет кубиков ⚠️",
                "#f59e0b"
            );
            this.updateStatsUI();
            this.checkDeadlock();
        } else {
            // Good move! Dispatch ants
            activeBox.status = 'active';
            this.dispatchAntsFromBox(activeBox);
        }
    }

    /**
     * Dispatch available ants from an active box to accessible cubes
     */
    dispatchAntsFromBox(activeBox) {
        if (!activeBox || activeBox.remainingAnts <= 0) return;

        const accessibleCubes = this.getAccessibleCubes(activeBox.color);
        if (accessibleCubes.length === 0) {
            if (activeBox.remainingAnts > 0 && activeBox.antsInField === 0) {
                activeBox.status = 'stuck';
            }
            return;
        }

        // How many ants can we send out right now?
        const sendCount = Math.min(activeBox.remainingAnts, accessibleCubes.length);

        for (let i = 0; i < sendCount; i++) {
            const targetCube = accessibleCubes[i];
            // Mark target cube so no other ant targets it simultaneously
            this.targetedCubes.add(`${targetCube.r},${targetCube.c}`);

            activeBox.remainingAnts--;
            activeBox.antsInField++;

            // Create ant
            const slotPos = this.getSlotCenter(activeBox.slotIndex);
            const cubePos = this.getCubeCenter(targetCube.r, targetCube.c);

            const ant = new Ant({
                box: activeBox,
                color: activeBox.color,
                startX: slotPos.x,
                startY: slotPos.y,
                targetR: targetCube.r,
                targetC: targetCube.c,
                targetX: cubePos.x,
                targetY: cubePos.y,
                speedMultiplier: this.gameSpeed,
                onGrab: (antRef) => this.onAntGrabCube(antRef),
                onDeliver: (antRef) => this.onAntDeliverCube(antRef)
            });

            // Stagger ants slightly for cute line appearance
            ant.delay = i * 6;
            this.ants.push(ant);
        }
    }

    /**
     * Callback when an ant reaches the target cube and lifts it up
     */
    onAntGrabCube(ant) {
        const { targetR, targetC, color } = ant;

        // Remove cube from grid!
        if (this.grid[targetR][targetC] === color) {
            this.grid[targetR][targetC] = null;
            this.targetedCubes.delete(`${targetR},${targetC}`);

            window.soundManager.playBlockGrab();

            // Spawn dust particles
            this.spawnParticles(ant.x, ant.y, color, 8);

            this.updateStatsUI();

            // Crucial: Removing this cube may have exposed cubes above it!
            // Check if any active box in slots can now claim newly unblocked cubes!
            this.checkCascades();
        }
    }

    /**
     * Callback when an ant brings the cube back down into the box
     */
    onAntDeliverCube(ant) {
        const box = ant.box;
        box.antsInField--;

        window.soundManager.playBlockStore();
        this.spawnParticles(ant.x, ant.y, box.color, 5, 'star');

        // Check if box is now completely finished (0 remaining inside, 0 in field)
        if (box.remainingAnts === 0 && box.antsInField === 0) {
            box.status = 'finished';
            window.soundManager.playBoxCompleted();
            this.showFloatText(
                this.getSlotCenter(box.slotIndex).x,
                this.getSlotCenter(box.slotIndex).y - 45,
                "Готово! ✨",
                "#10b981"
            );

            // Animate box leaving slot, then remove from slot
            setTimeout(() => {
                if (this.activeSlots[box.slotIndex] && this.activeSlots[box.slotIndex].id === box.id) {
                    this.activeSlots[box.slotIndex] = null;
                    this.updateStatsUI();
                    this.checkCascades();
                    this.checkVictoryOrDeadlock();
                }
            }, 400 / this.gameSpeed);
        } else {
            // Box still has ants left! Check if more matching cubes are now accessible
            this.dispatchAntsFromBox(box);
        }

        this.updateStatsUI();
        this.checkVictoryOrDeadlock();
    }

    /**
     * Cascade check: Whenever the grid changes, check ALL active boxes in slots!
     * If an open box has remaining ants and matching cubes are now accessible, deploy them!
     */
    checkCascades() {
        for (let i = 0; i < this.activeSlots.length; i++) {
            const box = this.activeSlots[i];
            if (box && (box.status === 'active' || box.status === 'stuck') && box.remainingAnts > 0) {
                const accessible = this.getAccessibleCubes(box.color);
                if (accessible.length > 0) {
                    box.status = 'active';
                    box.confusedTimer = 0;
                    this.dispatchAntsFromBox(box);
                }
            }
        }
    }

    /**
     * Check if player has won or if all slots are stuck with no possible moves
     */
    checkVictoryOrDeadlock() {
        // Victory check: grid is completely cleared!
        if (this.countRemainingCubes() === 0) {
            if (this.ants.length === 0 && !this.isVictory) {
                this.triggerVictory();
            }
            return;
        }

        this.checkDeadlock();
    }

    checkDeadlock() {
        if (this.isGameOver || this.isVictory) return;
        if (this.ants.length > 0) return; // Wait until active ants finish

        // Check if all slots are occupied
        const fullSlots = this.activeSlots.every(s => s !== null);
        if (!fullSlots) return; // Still have free slots to deploy new boxes!

        // All slots full. Can ANY active box pick any accessible cube right now?
        let canAnyBoxAct = false;
        for (const box of this.activeSlots) {
            if (box && box.remainingAnts > 0) {
                const accessible = this.getAccessibleCubes(box.color);
                if (accessible.length > 0) {
                    canAnyBoxAct = true;
                    break;
                }
            }
        }

        if (!canAnyBoxAct) {
            // DEADLOCK! All slots full, no box can make a move!
            this.triggerGameOver();
        }
    }

    triggerVictory() {
        this.isVictory = true;
        window.soundManager.playVictory();

        // Confetti explosion
        for (let i = 0; i < 70; i++) {
            this.spawnConfetti();
        }

        const stars = this.badMoves === 0 ? '⭐⭐⭐' : this.badMoves <= 2 ? '⭐⭐' : '⭐';
        document.getElementById('victoryStars').textContent = stars;
        document.getElementById('victoryMsg').textContent =
            `Мозаика полностью разобрана! Ошибок: ${this.badMoves}`;

        // If last level
        if (this.currentLevelIndex >= LEVELS.length - 1) {
            document.getElementById('modalNextLevel').textContent = 'В начало (Ур. 1)';
        } else {
            document.getElementById('modalNextLevel').textContent = 'Следующий уровень ➡️';
        }

        document.getElementById('victoryModal').classList.add('active');
    }

    triggerGameOver() {
        this.isGameOver = true;
        window.soundManager.playDefeat();

        document.getElementById('defeatMsg').textContent =
            `Все ${this.maxSlots} слотов заняты коробами, у которых нет доступа к кубикам!`;
        document.getElementById('defeatModal').classList.add('active');
    }

    hideModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }

    showLevelsModal() {
        const list = document.getElementById('levelsList');
        list.innerHTML = '';

        LEVELS.forEach((lvl, idx) => {
            const btn = document.createElement('button');
            btn.className = `level-select-btn ${idx === this.currentLevelIndex ? 'current' : ''}`;
            btn.innerHTML = `
                <div class="level-num">${idx + 1}</div>
                <div class="level-info">
                    <strong>${lvl.title}</strong>
                    <span>${lvl.subtitle}</span>
                </div>
            `;
            btn.addEventListener('click', () => {
                window.soundManager.playClick();
                this.hideModals();
                this.loadLevel(idx);
            });
            list.appendChild(btn);
        });

        document.getElementById('levelsModal').classList.add('active');
    }

    showCustomLevelModal() {
        // Prepare editor grid
        const editorContainer = document.getElementById('customGridEditor');
        editorContainer.innerHTML = '';

        const rows = 5;
        const cols = 6;
        this.customEditorData = Array.from({ length: rows }, () => Array(cols).fill(null));
        this.selectedColor = 'red';

        // Render palette buttons
        const palContainer = document.getElementById('customPalette');
        palContainer.innerHTML = '';
        Object.keys(COLOR_PALETTE).forEach(colKey => {
            const palBtn = document.createElement('div');
            palBtn.className = `pal-swatch ${colKey === this.selectedColor ? 'active' : ''}`;
            palBtn.style.backgroundColor = COLOR_PALETTE[colKey].hex;
            palBtn.title = COLOR_PALETTE[colKey].name;
            palBtn.addEventListener('click', () => {
                this.selectedColor = colKey;
                palContainer.querySelectorAll('.pal-swatch').forEach(s => s.classList.remove('active'));
                palBtn.classList.add('active');
            });
            palContainer.appendChild(palBtn);
        });

        // Eraser button
        const eraserBtn = document.createElement('div');
        eraserBtn.className = 'pal-swatch eraser';
        eraserBtn.innerHTML = '🧹';
        eraserBtn.title = 'Ластик';
        eraserBtn.addEventListener('click', () => {
            this.selectedColor = null;
            palContainer.querySelectorAll('.pal-swatch').forEach(s => s.classList.remove('active'));
            eraserBtn.classList.add('active');
        });
        palContainer.appendChild(eraserBtn);

        // Render grid cells
        for (let r = 0; r < rows; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'custom-grid-row';
            for (let c = 0; c < cols; c++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'custom-grid-cell';
                cellDiv.dataset.r = r;
                cellDiv.dataset.c = c;

                cellDiv.addEventListener('click', () => {
                    this.customEditorData[r][c] = this.selectedColor;
                    if (this.selectedColor) {
                        cellDiv.style.backgroundColor = COLOR_PALETTE[this.selectedColor].hex;
                    } else {
                        cellDiv.style.backgroundColor = 'transparent';
                    }
                });
                rowDiv.appendChild(cellDiv);
            }
            editorContainer.appendChild(rowDiv);
        }

        document.getElementById('customModal').classList.add('active');
    }

    startCustomLevel() {
        const grid = this.customEditorData;
        const boxes = createBoxesForGrid(grid, 4);

        if (boxes.length === 0) {
            alert('Нарисуйте хотя бы несколько кубиков на поле!');
            return;
        }

        this.level = {
            id: 999,
            title: "Свой уровень: Моя мозаика",
            subtitle: "Ваш собственный шедевр! Разберите его муравьями.",
            maxSlots: 5,
            grid: grid,
            boxes: boxes
        };

        this.currentLevelIndex = 999;
        this.hideModals();

        // Load this custom level directly
        this.gridRows = grid.length;
        this.gridCols = grid[0].length;
        this.grid = grid.map(r => [...r]);
        this.maxSlots = 5;
        this.activeSlots = new Array(this.maxSlots).fill(null);
        this.conveyorBoxes = boxes.map((b, idx) => ({
            id: `box_custom_${Date.now()}_${idx}`,
            color: b.color,
            count: b.count
        }));
        this.ants = [];
        this.particles = [];
        this.badMoves = 0;
        this.movesHistory = [];
        this.targetedCubes.clear();
        this.isGameOver = false;
        this.isVictory = false;

        document.getElementById('levelTitle').textContent = this.level.title;
        document.getElementById('levelSubtitle').textContent = this.level.subtitle;
        this.saveState();
        this.recalculateLayout();
        this.updateStatsUI();
    }

    // Coordinates helpers
    getCubeCenter(r, c) {
        return {
            x: this.gridOriginX + c * this.cellSize + this.cellSize / 2,
            y: this.gridOriginY + r * this.cellSize + this.cellSize / 2
        };
    }

    getSlotRect(slotIndex) {
        const slotWidth = 70;
        const slotHeight = 65;
        const gap = 16;
        const totalW = this.maxSlots * slotWidth + (this.maxSlots - 1) * gap;
        const startX = (this.width - totalW) / 2;
        const y = this.height - 180;

        return {
            x: startX + slotIndex * (slotWidth + gap),
            y: y,
            w: slotWidth,
            h: slotHeight
        };
    }

    getSlotCenter(slotIndex) {
        const r = this.getSlotRect(slotIndex);
        return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    }

    getConveyorBoxRect(idx) {
        const boxWidth = 72;
        const boxHeight = 60;
        const gap = 14;
        const visibleCount = Math.min(this.conveyorBoxes.length, 5);
        const totalW = visibleCount * boxWidth + (visibleCount - 1) * gap;
        const startX = (this.width - totalW) / 2;
        const y = this.height - 85;

        return {
            x: startX + idx * (boxWidth + gap),
            y: y,
            w: boxWidth,
            h: boxHeight
        };
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (this.width / rect.width);
        const my = (e.clientY - rect.top) * (this.height / rect.height);

        // Check if player clicked an upcoming box on the conveyor
        const visibleCount = Math.min(this.conveyorBoxes.length, 5);
        for (let i = 0; i < visibleCount; i++) {
            const bRect = this.getConveyorBoxRect(i);
            if (mx >= bRect.x && mx <= bRect.x + bRect.w && my >= bRect.y && my <= bRect.y + bRect.h) {
                this.openConveyorBox(i);
                return;
            }
        }

        // Check if player clicked a slot box (for sound or visual feedback)
        for (let i = 0; i < this.activeSlots.length; i++) {
            const sRect = this.getSlotRect(i);
            if (mx >= sRect.x && mx <= sRect.x + sRect.w && my >= sRect.y && my <= sRect.y + sRect.h) {
                const box = this.activeSlots[i];
                if (box) {
                    box.shaking = 10;
                    window.soundManager.playAntScurry();
                }
                return;
            }
        }
    }

    handleCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (this.width / rect.width);
        const my = (e.clientY - rect.top) * (this.height / rect.height);

        let pointer = false;
        const visibleCount = Math.min(this.conveyorBoxes.length, 5);
        for (let i = 0; i < visibleCount; i++) {
            const bRect = this.getConveyorBoxRect(i);
            if (mx >= bRect.x && mx <= bRect.x + bRect.w && my >= bRect.y && my <= bRect.y + bRect.h) {
                pointer = true;
                break;
            }
        }
        this.canvas.style.cursor = pointer ? 'pointer' : 'default';
    }

    spawnParticles(x, y, colorKey, count = 6, type = 'dust') {
        const pal = COLOR_PALETTE[colorKey] || COLOR_PALETTE.red;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.2 + Math.random() * 2.8;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.0,
                color: pal.hex,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                size: 3 + Math.random() * 4,
                type: type
            });
        }
    }

    spawnConfetti() {
        const x = Math.random() * this.width;
        const y = -10;
        const keys = Object.keys(COLOR_PALETTE);
        const color = COLOR_PALETTE[keys[Math.floor(Math.random() * keys.length)]].hex;

        this.particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 3,
            vy: 2 + Math.random() * 4,
            color,
            alpha: 1.0,
            decay: 0.005 + Math.random() * 0.005,
            size: 6 + Math.random() * 6,
            rotation: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.1,
            type: 'confetti'
        });
    }

    showFloatText(x, y, text, color = '#ffffff') {
        this.particles.push({
            x,
            y,
            vx: 0,
            vy: -1.2,
            text,
            color,
            alpha: 1.0,
            decay: 0.015,
            size: 16,
            type: 'text'
        });
    }

    // --- Main Game Loop ---
    startLoop() {
        const loop = (now) => {
            const dt = Math.min(50, now - this.lastTime);
            this.lastTime = now;

            this.update(dt);
            this.render();

            this.animFrameId = requestAnimationFrame(loop);
        };
        this.animFrameId = requestAnimationFrame(loop);
    }

    update(dt) {
        // Update Ants
        for (let i = this.ants.length - 1; i >= 0; i--) {
            const ant = this.ants[i];
            ant.update(dt * this.gameSpeed);
            if (ant.finished) {
                this.ants.splice(i, 1);
            }
        }

        // Update active slots animations
        for (const box of this.activeSlots) {
            if (box) {
                if (box.openAnim < 1.0) {
                    box.openAnim = Math.min(1.0, box.openAnim + 0.06 * this.gameSpeed);
                }
                if (box.shaking > 0) {
                    box.shaking *= 0.88;
                    if (box.shaking < 0.1) box.shaking = 0;
                }
                if (box.confusedTimer > 0) {
                    box.confusedTimer--;
                }
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * this.gameSpeed;
            p.y += p.vy * this.gameSpeed;
            p.alpha -= p.decay * this.gameSpeed;

            if (p.type === 'confetti') {
                p.rotation += p.rotSpeed * this.gameSpeed;
            }

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.save();
        ctx.scale(this.dpr, this.dpr);

        ctx.clearRect(0, 0, this.width, this.height);

        // Draw soft ambient garden backdrop
        this.drawBackground(ctx);

        // Draw Top Mosaic Grid
        this.drawGrid(ctx);

        // Draw Active Slots (Parked Boxes)
        this.drawActiveSlots(ctx);

        // Draw Conveyor belt and upcoming boxes
        this.drawConveyor(ctx);

        // Draw Ants crawling across canvas
        for (const ant of this.ants) {
            ant.draw(ctx);
        }

        // Draw Particles & Floating labels
        this.drawParticles(ctx);

        ctx.restore();
    }

    drawBackground(ctx) {
        // Clean warm wooden picnic / garden background
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(0.55, '#f1f5f9');
        grad.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Subtle honeycomb or grass pattern
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.lineWidth = 1;
        const step = 40;
        for (let x = 0; x < this.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
    }

    drawGrid(ctx) {
        const time = performance.now() * 0.003;

        // Draw backing board
        const boardW = this.gridCols * this.cellSize + 24;
        const boardH = this.gridRows * this.cellSize + 24;
        const boardX = this.gridOriginX - 12;
        const boardY = this.gridOriginY - 12;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        this.roundRect(ctx, boardX, boardY, boardW, boardH, 16, true, true);

        // Draw grid cells
        for (let r = 0; r < this.gridRows; r++) {
            for (let c = 0; c < this.gridCols; c++) {
                const colorKey = this.grid[r][c];
                const x = this.gridOriginX + c * this.cellSize;
                const y = this.gridOriginY + r * this.cellSize;
                const size = this.cellSize;

                // Subtle empty cell placeholder
                ctx.strokeStyle = 'rgba(203, 213, 225, 0.35)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);

                if (!colorKey) continue;

                const isAccessible = this.isCubeAccessible(r, c);
                const isTargeted = this.targetedCubes.has(`${r},${c}`);
                const pal = COLOR_PALETTE[colorKey] || COLOR_PALETTE.red;

                ctx.save();

                // Gentle floating bob if accessible
                let drawY = y;
                if (isAccessible) {
                    drawY += Math.sin(time + c * 0.8) * 2;
                }

                // Shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
                this.roundRect(ctx, x + 4, drawY + 6, size - 8, size - 8, 8, true, false);

                // Cube main body
                ctx.fillStyle = pal.hex;
                this.roundRect(ctx, x + 4, drawY + 4, size - 8, size - 8, 8, true, false);

                // Top 3D glossy highlight
                ctx.fillStyle = pal.lightHex;
                ctx.globalAlpha = 0.6;
                this.roundRect(ctx, x + 5, drawY + 5, size - 10, (size - 8) * 0.45, 6, true, false);
                ctx.globalAlpha = 1.0;

                // Border
                if (isAccessible) {
                    // Pulsating golden/white accessible aura!
                    const pulse = 0.5 + 0.5 * Math.sin(time * 3);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 + 0.3 * pulse})`;
                    ctx.lineWidth = 2.5;
                    this.roundRect(ctx, x + 4, drawY + 4, size - 8, size - 8, 8, false, true);

                    // Tiny green access marker
                    ctx.fillStyle = '#10b981';
                    ctx.beginPath();
                    ctx.arc(x + size - 10, drawY + size - 10, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Slightly shaded / locked look
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
                    this.roundRect(ctx, x + 4, drawY + 4, size - 8, size - 8, 8, true, false);
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.lineWidth = 1;
                    this.roundRect(ctx, x + 4, drawY + 4, size - 8, size - 8, 8, false, true);
                }

                ctx.restore();
            }
        }
    }

    drawActiveSlots(ctx) {
        // Label for Active slots
        ctx.fillStyle = '#64748b';
        ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`АКТИВНЫЕ СЛОТЫ ДЛЯ КОРОБОК (${this.activeSlots.filter(s => s !== null).length}/${this.maxSlots})`, this.width / 2, this.height - 195);

        for (let i = 0; i < this.maxSlots; i++) {
            const rect = this.getSlotRect(i);
            const box = this.activeSlots[i];

            // Slot pedestal / socket
            ctx.save();
            ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            this.roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12, true, true);
            ctx.setLineDash([]);

            if (!box) {
                // Empty slot prompt
                ctx.fillStyle = '#94a3b8';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText(`Слот ${i + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2 + 4);
                ctx.restore();
                continue;
            }

            // Draw Opened Box in this slot
            const pal = COLOR_PALETTE[box.color] || COLOR_PALETTE.red;
            const shakeX = (Math.random() - 0.5) * box.shaking;
            const bx = rect.x + shakeX;
            const by = rect.y;

            // Box shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            this.roundRect(ctx, bx + 3, by + 5, rect.w - 6, rect.h - 8, 10, true, false);

            // Box body (wooden / colored cardboard)
            ctx.fillStyle = pal.darkHex;
            this.roundRect(ctx, bx + 3, by + 8, rect.w - 6, rect.h - 12, 10, true, false);

            ctx.fillStyle = pal.hex;
            this.roundRect(ctx, bx + 5, by + 10, rect.w - 10, rect.h - 16, 8, true, false);

            // Open lid animation
            const lidAngle = box.openAnim * 0.7; // open flap
            ctx.save();
            ctx.translate(bx + 5, by + 10);
            ctx.rotate(-lidAngle);
            ctx.fillStyle = pal.lightHex;
            this.roundRect(ctx, 0, -6, rect.w - 10, 8, 4, true, false);
            ctx.restore();

            // Ant count badge
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(bx + rect.w / 2, by + rect.h / 2 + 2, 14, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = pal.darkHex;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Number of ants remaining inside
            ctx.fillStyle = pal.darkHex;
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${box.remainingAnts}🐜`, bx + rect.w / 2, by + rect.h / 2 + 2);

            // If box is stuck / bad move emote
            if (box.status === 'stuck' || box.confusedTimer > 0) {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 18px sans-serif';
                ctx.fillText('❓', bx + rect.w - 8, by + 4);
            }

            ctx.restore();
        }
    }

    drawConveyor(ctx) {
        // Label for conveyor
        ctx.fillStyle = '#64748b';
        ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(`ОЧЕРЕДЬ КОРОБОК (нажмите, чтобы открыть): всего осталось ${this.conveyorBoxes.length}`, this.width / 2, this.height - 98);

        const visibleCount = Math.min(this.conveyorBoxes.length, 5);
        for (let i = 0; i < visibleCount; i++) {
            const bData = this.conveyorBoxes[i];
            const rect = this.getConveyorBoxRect(i);
            const pal = COLOR_PALETTE[bData.color] || COLOR_PALETTE.red;

            ctx.save();

            // Hover / bounce effect
            ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
            this.roundRect(ctx, rect.x + 3, rect.y + 4, rect.w - 6, rect.h - 6, 10, true, false);

            // Box base
            ctx.fillStyle = pal.hex;
            this.roundRect(ctx, rect.x + 3, rect.y + 2, rect.w - 6, rect.h - 8, 10, true, false);

            // Wooden texture stripes / packaging tape
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.fillRect(rect.x + rect.w / 2 - 6, rect.y + 2, 12, rect.h - 8);

            // Ant count pill badge
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            this.roundRect(ctx, rect.x + 8, rect.y + rect.h / 2 - 11, rect.w - 16, 22, 11, true, false);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${bData.count} 🐜`, rect.x + rect.w / 2, rect.y + rect.h / 2);

            // Color label tag
            ctx.fillStyle = pal.lightHex;
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(pal.name, rect.x + rect.w / 2, rect.y + rect.h - 12);

            ctx.restore();
        }
    }

    drawParticles(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);

            if (p.type === 'text') {
                ctx.fillStyle = p.color;
                ctx.font = 'bold 15px -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
            } else if (p.type === 'confetti') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            } else if (p.type === 'star') {
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Dust particle
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    roundRect(ctx, x, y, w, h, r, fill = true, stroke = false) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }
}

/**
 * Ant Class - Handles individual ant kinematics, crawling legs, carrying cubes
 */
class Ant {
    constructor(config) {
        this.box = config.box;
        this.color = config.color;
        this.startX = config.startX;
        this.startY = config.startY;
        this.targetR = config.targetR;
        this.targetC = config.targetC;
        this.targetX = config.targetX;
        this.targetY = config.targetY;
        this.speedMultiplier = config.speedMultiplier || 1.0;

        this.onGrab = config.onGrab;
        this.onDeliver = config.onDeliver;

        this.x = this.startX;
        this.y = this.startY;
        this.progress = 0; // 0 to 1
        this.state = 'go_to_cube'; // 'go_to_cube', 'grabbing', 'return_to_box', 'done'
        this.hasCube = false;
        this.finished = false;
        this.delay = config.delay || 0;

        this.legPhase = 0;
        this.walkCycleSpeed = 0.35;
        this.baseSpeed = 0.016; // progress per frame
    }

    update(dt) {
        if (this.delay > 0) {
            this.delay -= 1;
            return;
        }

        this.legPhase += this.walkCycleSpeed * this.speedMultiplier;

        if (this.state === 'go_to_cube') {
            this.progress += this.baseSpeed * this.speedMultiplier;
            if (this.progress >= 1.0) {
                this.progress = 1.0;
                this.state = 'grabbing';
                this.grabTimer = 8; // pause for grab
            }

            // Interpolate position along smooth path
            this.x = this.startX + (this.targetX - this.startX) * this.progress;
            this.y = this.startY + (this.targetY - this.startY) * this.progress;

        } else if (this.state === 'grabbing') {
            this.grabTimer -= 1 * this.speedMultiplier;
            if (this.grabTimer <= 0) {
                this.hasCube = true;
                if (this.onGrab) this.onGrab(this);
                this.state = 'return_to_box';
                this.progress = 0;
            }

        } else if (this.state === 'return_to_box') {
            this.progress += this.baseSpeed * this.speedMultiplier;
            if (this.progress >= 1.0) {
                this.progress = 1.0;
                this.state = 'done';
                this.finished = true;
                if (this.onDeliver) this.onDeliver(this);
            }

            // Interpolate position back to box
            this.x = this.targetX + (this.startX - this.targetX) * this.progress;
            this.y = this.targetY + (this.startY - this.targetY) * this.progress;
        }
    }

    draw(ctx) {
        if (this.delay > 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Direction angle
        let angle = 0;
        if (this.state === 'go_to_cube') {
            angle = Math.atan2(this.targetY - this.startY, this.targetX - this.startX) + Math.PI / 2;
        } else {
            angle = Math.atan2(this.startY - this.targetY, this.startX - this.targetX) + Math.PI / 2;
        }
        ctx.rotate(angle);

        const pal = COLOR_PALETTE[this.color] || COLOR_PALETTE.red;

        // Draw 6 animated crawling legs
        ctx.strokeStyle = pal.antBody;
        ctx.lineWidth = 1.8;
        const legSwing = Math.sin(this.legPhase) * 4;

        // Front legs
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.lineTo(-10 + legSwing, -10);
        ctx.moveTo(4, -6);
        ctx.lineTo(10 - legSwing, -10);

        // Middle legs
        ctx.moveTo(-4, 0);
        ctx.lineTo(-11 - legSwing, 0);
        ctx.moveTo(4, 0);
        ctx.lineTo(11 + legSwing, 0);

        // Back legs
        ctx.moveTo(-4, 6);
        ctx.lineTo(-10 + legSwing, 10);
        ctx.moveTo(4, 6);
        ctx.lineTo(10 - legSwing, 10);
        ctx.stroke();

        // Abdomen (back)
        ctx.fillStyle = pal.antBody;
        ctx.beginPath();
        ctx.ellipse(0, 8, 4.5, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Thorax (middle)
        ctx.fillStyle = pal.antColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head (front)
        ctx.fillStyle = pal.antColor;
        ctx.beginPath();
        ctx.arc(0, -6, 4, 0, Math.PI * 2);
        ctx.fill();

        // Antennae
        ctx.strokeStyle = pal.antBody;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-2, -8);
        ctx.lineTo(-5, -13);
        ctx.moveTo(2, -8);
        ctx.lineTo(5, -13);
        ctx.stroke();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1.5, -7, 1.2, 0, Math.PI * 2);
        ctx.arc(1.5, -7, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Carried Cube (if returning with cube)
        if (this.hasCube) {
            ctx.save();
            ctx.translate(0, -14); // carried overhead
            ctx.fillStyle = pal.hex;
            this.roundRect(ctx, -8, -8, 16, 16, 4, true, false);

            ctx.fillStyle = pal.lightHex;
            ctx.globalAlpha = 0.5;
            this.roundRect(ctx, -7, -7, 14, 6, 2, true, false);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            this.roundRect(ctx, -8, -8, 16, 16, 4, false, true);
            ctx.restore();
        }

        ctx.restore();
    }

    roundRect(ctx, x, y, w, h, r, fill = true, stroke = false) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) ctx.fill();
        if (stroke) ctx.stroke();
    }
}

// Instantiate game once DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    window.game = new AntFarmGame();
});
