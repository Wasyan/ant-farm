/**
 * levels.js - Level Definitions and Color Palette for Ant Farm Game
 */

const COLOR_PALETTE = {
    red: {
        name: 'Красный',
        hex: '#ef4444',
        darkHex: '#b91c1c',
        lightHex: '#fca5a5',
        antColor: '#dc2626',
        antBody: '#b91c1c',
        antEye: '#ffffff',
        shadow: 'rgba(239, 68, 68, 0.4)'
    },
    blue: {
        name: 'Синий',
        hex: '#3b82f6',
        darkHex: '#1d4ed8',
        lightHex: '#93c5fd',
        antColor: '#2563eb',
        antBody: '#1e40af',
        antEye: '#ffffff',
        shadow: 'rgba(59, 130, 246, 0.4)'
    },
    green: {
        name: 'Зелёный',
        hex: '#10b981',
        darkHex: '#047857',
        lightHex: '#6ee7b7',
        antColor: '#059669',
        antBody: '#065f46',
        antEye: '#ffffff',
        shadow: 'rgba(16, 185, 129, 0.4)'
    },
    yellow: {
        name: 'Жёлтый',
        hex: '#f59e0b',
        darkHex: '#b45309',
        lightHex: '#fde68a',
        antColor: '#d97706',
        antBody: '#92400e',
        antEye: '#ffffff',
        shadow: 'rgba(245, 158, 11, 0.4)'
    },
    purple: {
        name: 'Фиолетовый',
        hex: '#8b5cf6',
        darkHex: '#6d28d9',
        lightHex: '#c4b5fd',
        antColor: '#7c3aed',
        antBody: '#5b21b6',
        antEye: '#ffffff',
        shadow: 'rgba(139, 92, 246, 0.4)'
    },
    orange: {
        name: 'Оранжевый',
        hex: '#f97316',
        darkHex: '#c2410c',
        lightHex: '#fdba74',
        antColor: '#ea580c',
        antBody: '#9a3412',
        antEye: '#ffffff',
        shadow: 'rgba(249, 115, 22, 0.4)'
    },
    pink: {
        name: 'Розовый',
        hex: '#ec4899',
        darkHex: '#be185d',
        lightHex: '#fbcfe8',
        antColor: '#db2777',
        antBody: '#9d174d',
        antEye: '#ffffff',
        shadow: 'rgba(236, 72, 153, 0.4)'
    }
};

const LEVELS = [
    {
        id: 1,
        title: "Уровень 1: Сердечко",
        subtitle: "Обучение. Открывайте коробки с муравьями нужного цвета!",
        maxSlots: 5,
        grid: [
            [null,  'red', null,  'red', null],
            ['red', 'red', 'red', 'red', 'red'],
            ['red', 'red', 'red', 'red', 'red'],
            [null,  'red', 'red', 'red', null],
            [null,  null,  'red', null,  null]
        ],
        // 14 red cubes total.
        // Queue of boxes: [ { color: 'red', count: 4 }, { color: 'red', count: 5 }, { color: 'red', count: 5 } ]
        boxes: [
            { color: 'red', count: 4 },
            { color: 'red', count: 5 },
            { color: 'red', count: 5 }
        ]
    },
    {
        id: 2,
        title: "Уровень 2: Сочное яблочко",
        subtitle: "Два цвета! Сверху листик, снизу яблоко.",
        maxSlots: 5,
        grid: [
            [null,    null,    'green', 'green', null,    null],
            [null,    null,    'green', null,    null,    null],
            [null,    'red',   'red',   'red',   'red',   null],
            ['red',   'red',   'red',   'red',   'red',   'red'],
            ['red',   'red',   'red',   'red',   'red',   'red'],
            [null,    'red',   'red',   'red',   'red',   null]
        ],
        // Green: 3 cubes (top). Red: 18 cubes (bottom).
        // If you open a green box first, green is blocked by red! Green will get stuck until red is cleared!
        // This teaches the core puzzle mechanic!
        boxes: [
            { color: 'green', count: 3 }, // Trap if opened first!
            { color: 'red',   count: 6 },
            { color: 'red',   count: 6 },
            { color: 'red',   count: 6 }
        ]
    },
    {
        id: 3,
        title: "Уровень 3: Утёнок",
        subtitle: "Следите за доступными кубиками снизу вверх.",
        maxSlots: 5,
        grid: [
            [null,     'yellow', 'yellow', null,     null,     null],
            ['orange', 'yellow', 'yellow', 'yellow', null,     null],
            [null,     'yellow', 'yellow', 'yellow', null,     null],
            [null,     'yellow', 'yellow', 'yellow', 'yellow', null],
            ['blue',   'blue',   'blue',   'blue',   'blue',   'blue'],
            ['blue',   'blue',   'blue',   'blue',   'blue',   'blue']
        ],
        // Blue at the bottom (12 cubes), Yellow duck body (11 cubes), Orange beak (1 cube)
        boxes: [
            { color: 'blue',   count: 6 },
            { color: 'orange', count: 1 }, // Orange is high up on row 1!
            { color: 'blue',   count: 6 },
            { color: 'yellow', count: 4 },
            { color: 'yellow', count: 4 },
            { color: 'yellow', count: 3 }
        ]
    },
    {
        id: 4,
        title: "Уровень 4: Весёлый мухомор",
        subtitle: "Красная шляпка, белая ножка и сочная полянка.",
        maxSlots: 5,
        grid: [
            [null,    'red',    'red',    'red',    'red',    null],
            ['red',   'yellow', 'red',    'yellow', 'red',    'red'],
            ['red',   'red',    'red',    'red',    'red',    'red'],
            [null,    null,     'purple', 'purple', null,     null],
            [null,    null,     'purple', 'purple', null,     null],
            ['green', 'green',  'green',  'green',  'green',  'green']
        ],
        // Bottom: green (6). Middle: purple stem (4). Top: red cap (16) with 2 yellow spots.
        boxes: [
            { color: 'green',  count: 6 },
            { color: 'red',    count: 4 }, // High up!
            { color: 'purple', count: 4 },
            { color: 'red',    count: 6 },
            { color: 'yellow', count: 2 },
            { color: 'red',    count: 6 }
        ]
    },
    {
        id: 5,
        title: "Уровень 5: Космическая ракета",
        subtitle: "Многослойный узор. Распределяйте слоты с умом!",
        maxSlots: 5,
        grid: [
            [null,     null,     'red',    null,     null],
            [null,     'blue',   'blue',   'blue',   null],
            [null,     'blue',   'yellow', 'blue',   null],
            [null,     'blue',   'blue',   'blue',   null],
            ['purple', 'blue',   'blue',   'blue',   'purple'],
            ['orange', 'orange', 'orange', 'orange', 'orange'],
            [null,     'yellow', null,     'yellow', null]
        ],
        boxes: [
            { color: 'yellow', count: 2 },
            { color: 'orange', count: 5 },
            { color: 'purple', count: 2 },
            { color: 'blue',   count: 5 },
            { color: 'blue',   count: 5 },
            { color: 'yellow', count: 1 },
            { color: 'red',    count: 1 }
        ]
    },
    {
        id: 6,
        title: "Уровень 6: Радужная бабочка",
        subtitle: "Сложная мозаика из множества ярких оттенков!",
        maxSlots: 5,
        grid: [
            ['pink',   'pink',   null,     'pink',   'pink'],
            ['pink',   'yellow', 'purple', 'yellow', 'pink'],
            ['orange', 'pink',   'purple', 'pink',   'orange'],
            ['orange', 'orange', 'purple', 'orange', 'orange'],
            [null,     'green',  'green',  'green',  null]
        ],
        boxes: [
            { color: 'green',  count: 3 },
            { color: 'orange', count: 3 },
            { color: 'pink',   count: 4 },
            { color: 'purple', count: 3 },
            { color: 'yellow', count: 2 },
            { color: 'orange', count: 3 },
            { color: 'pink',   count: 4 }
        ]
    },
    {
        id: 7,
        title: "Уровень 7: Царство Муравейника",
        subtitle: "Большая крепость. Максимальная концентрация!",
        maxSlots: 6,
        grid: [
            [null,     null,     'red',    'red',    null,     null],
            [null,     'purple', 'yellow', 'yellow', 'purple', null],
            ['blue',   'purple', 'green',  'green',  'purple', 'blue'],
            ['blue',   'orange', 'green',  'green',  'orange', 'blue'],
            ['blue',   'orange', 'orange', 'orange', 'orange', 'blue'],
            ['yellow', 'yellow', 'yellow', 'yellow', 'yellow', 'yellow']
        ],
        boxes: [
            { color: 'yellow', count: 6 },
            { color: 'orange', count: 3 },
            { color: 'blue',   count: 4 },
            { color: 'orange', count: 3 },
            { color: 'green',  count: 4 },
            { color: 'blue',   count: 2 },
            { color: 'purple', count: 4 },
            { color: 'yellow', count: 2 },
            { color: 'red',    count: 2 }
        ]
    }
];

/**
 * Utility to generate a randomized puzzle from any pattern grid
 */
function createBoxesForGrid(grid, maxBoxSize = 5) {
    const counts = {};
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            const color = grid[r][c];
            if (color) {
                counts[color] = (counts[color] || 0) + 1;
            }
        }
    }

    const boxes = [];
    Object.keys(counts).forEach(color => {
        let remaining = counts[color];
        while (remaining > 0) {
            let size = Math.min(remaining, Math.floor(Math.random() * (maxBoxSize - 2 + 1)) + 2);
            if (remaining - size === 1) size += 1; // avoid single 1 leftovers if possible
            if (size > remaining) size = remaining;
            boxes.push({ color, count: size });
            remaining -= size;
        }
    });

    // Shuffle boxes gently, keeping some accessible colors near start
    for (let i = boxes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [boxes[i], boxes[j]] = [boxes[j], boxes[i]];
    }

    return boxes;
}
