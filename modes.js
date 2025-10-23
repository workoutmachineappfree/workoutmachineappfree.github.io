// modes.js - Workout mode definitions and parameters
// Converted from modes.go

// Program modes
const ProgramMode = {
    OLD_SCHOOL: 0,
    PUMP: 1,
    TUT: 2,
    TUT_BEAST: 3,
    JUST_LIFT: 4
};

const ProgramModeNames = {
    [ProgramMode.OLD_SCHOOL]: "Old School",
    [ProgramMode.PUMP]: "Pump",
    [ProgramMode.TUT]: "TUT",
    [ProgramMode.TUT_BEAST]: "TUT Beast",
    [ProgramMode.JUST_LIFT]: "Just Lift"
};

// Echo levels
const EchoLevel = {
    HARD: 0,
    HARDER: 1,
    HARDEST: 2,
    EPIC: 3
};

const EchoLevelNames = {
    [EchoLevel.HARD]: "Hard",
    [EchoLevel.HARDER]: "Harder",
    [EchoLevel.HARDEST]: "Hardest",
    [EchoLevel.EPIC]: "Epic"
};

// Helper functions for writing binary data
function writeU16LE(buffer, offset, val) {
    const view = new DataView(buffer);
    view.setUint16(offset, val, true); // true = little endian
}

function writeI16LE(buffer, offset, val) {
    const view = new DataView(buffer);
    view.setInt16(offset, val, true);
}

function writeF32LE(buffer, offset, val) {
    const view = new DataView(buffer);
    view.setFloat32(offset, val, true);
}

// Get Echo parameters for a given level
function getEchoParams(level, eccentricPct) {
    const params = {
        level: level,
        eccentricPct: eccentricPct,
        concentricPct: 50, // constant
        smoothing: 0.1,
        floor: 0.0,
        negLimit: -100.0,
        gain: 1.0,
        cap: 50.0
    };

    switch (level) {
        case EchoLevel.HARD:
            params.gain = 1.00;
            params.cap = 50.0;
            break;
        case EchoLevel.HARDER:
            params.gain = 1.25;
            params.cap = 40.0;
            break;
        case EchoLevel.HARDEST:
            params.gain = 1.667;
            params.cap = 30.0;
            break;
        case EchoLevel.EPIC:
            params.gain = 3.333;
            params.cap = 15.0;
            break;
    }

    return params;
}

// Get mode profile block for program modes (32 bytes)
function getModeProfile(mode) {
    const buffer = new ArrayBuffer(32);
    const data = new Uint8Array(buffer);

    switch (mode) {
        case ProgramMode.OLD_SCHOOL:
        case ProgramMode.JUST_LIFT:
            // Old School (Just Lift uses same profile but with reps=0xFF)
            writeU16LE(buffer, 0x00, 0);
            writeU16LE(buffer, 0x02, 20);
            writeF32LE(buffer, 0x04, 3.0);
            writeU16LE(buffer, 0x08, 75);
            writeU16LE(buffer, 0x0A, 600);
            writeF32LE(buffer, 0x0C, 50.0);
            writeI16LE(buffer, 0x10, -1300);
            writeI16LE(buffer, 0x12, -1200);
            writeF32LE(buffer, 0x14, 100.0);
            writeI16LE(buffer, 0x18, -260);
            writeI16LE(buffer, 0x1A, -110);
            writeF32LE(buffer, 0x1C, 0.0);
            break;

        case ProgramMode.PUMP:
            writeU16LE(buffer, 0x00, 50);
            writeU16LE(buffer, 0x02, 450);
            writeF32LE(buffer, 0x04, 10.0);
            writeU16LE(buffer, 0x08, 500);
            writeU16LE(buffer, 0x0A, 600);
            writeF32LE(buffer, 0x0C, 50.0);
            writeI16LE(buffer, 0x10, -700);
            writeI16LE(buffer, 0x12, -550);
            writeF32LE(buffer, 0x14, 1.0);
            writeI16LE(buffer, 0x18, -100);
            writeI16LE(buffer, 0x1A, -50);
            writeF32LE(buffer, 0x1C, 1.0);
            break;

        case ProgramMode.TUT:
            writeU16LE(buffer, 0x00, 250);
            writeU16LE(buffer, 0x02, 350);
            writeF32LE(buffer, 0x04, 7.0);
            writeU16LE(buffer, 0x08, 450);
            writeU16LE(buffer, 0x0A, 600);
            writeF32LE(buffer, 0x0C, 50.0);
            writeI16LE(buffer, 0x10, -900);
            writeI16LE(buffer, 0x12, -700);
            writeF32LE(buffer, 0x14, 70.0);
            writeI16LE(buffer, 0x18, -100);
            writeI16LE(buffer, 0x1A, -50);
            writeF32LE(buffer, 0x1C, 14.0);
            break;

        case ProgramMode.TUT_BEAST:
            writeU16LE(buffer, 0x00, 150);
            writeU16LE(buffer, 0x02, 250);
            writeF32LE(buffer, 0x04, 7.0);
            writeU16LE(buffer, 0x08, 350);
            writeU16LE(buffer, 0x0A, 450);
            writeF32LE(buffer, 0x0C, 50.0);
            writeI16LE(buffer, 0x10, -900);
            writeI16LE(buffer, 0x12, -700);
            writeF32LE(buffer, 0x14, 70.0);
            writeI16LE(buffer, 0x18, -100);
            writeI16LE(buffer, 0x1A, -50);
            writeF32LE(buffer, 0x1C, 28.0);
            break;
    }

    return data;
}

// Predefined color schemes (from real app)
const PredefinedColorSchemes = {
    blue: {
        name: "Blue",
        brightness: 0.4,
        colors: [
            { r: 0x00, g: 0xA8, b: 0xDD },
            { r: 0x00, g: 0xCF, b: 0xFC },
            { r: 0x5D, g: 0xDF, b: 0xFC }
        ]
    },
    green: {
        name: "Green",
        brightness: 0.4,
        colors: [
            { r: 0x7D, g: 0xC1, b: 0x47 },
            { r: 0xA1, g: 0xD8, b: 0x6A },
            { r: 0xBA, g: 0xE0, b: 0x94 }
        ]
    },
    teal: {
        name: "Teal",
        brightness: 0.4,
        colors: [
            { r: 0x3E, g: 0x9A, b: 0xB7 },
            { r: 0x83, g: 0xBE, b: 0xD1 },
            { r: 0xC2, g: 0xDF, b: 0xE8 }
        ]
    },
    yellow: {
        name: "Yellow",
        brightness: 0.4,
        colors: [
            { r: 0xFF, g: 0x90, b: 0x51 },
            { r: 0xFF, g: 0xD6, b: 0x47 },
            { r: 0xFF, g: 0xB7, b: 0x00 }
        ]
    },
    pink: {
        name: "Pink",
        brightness: 0.4,
        colors: [
            { r: 0xFF, g: 0x00, b: 0x4C },
            { r: 0xFF, g: 0x23, b: 0x8C },
            { r: 0xFF, g: 0x8C, b: 0x8C }
        ]
    },
    red: {
        name: "Red",
        brightness: 0.4,
        colors: [
            { r: 0xFF, g: 0x00, b: 0x00 },
            { r: 0xFF, g: 0x55, b: 0x55 },
            { r: 0xFF, g: 0xAA, b: 0xAA }
        ]
    },
    purple: {
        name: "Purple",
        brightness: 0.4,
        colors: [
            { r: 0x88, g: 0x00, b: 0xFF },
            { r: 0xAA, g: 0x55, b: 0xFF },
            { r: 0xDD, g: 0xAA, b: 0xFF }
        ]
    }
};
