const playerStatePrefix = "fishing_";
const pointState = playerStatePrefix + "points";
const getFlagStates = playerStatePrefix + "getFlag";
const getCountStates = playerStatePrefix + "getCount";
const maxSizeStates = playerStatePrefix + "maxSize";

// 椅子の高さ調整用
const additionalAxisInputState = "additionalAxis";
const heightInputThreshold = -0.5;
const seat = $.subNode("Seat");
const seatHeightMax = 0.2;
const seatHeightMin = -0.1;
const seatHeightUnit = 0.06;

const resetAll = () => {
    $.state.additionalAxisInput = 0;
    $.state.seatHeight = 0;
    seat.setPosition(new Vector3(0, 0, 0));
};

const getSeatInput = (currentInput, oldInput) => {
    let trigger = false;

    // 入力がしきい値を超えた瞬間に入力判定
    // Shiftキー入力＝Additional Axisがマイナスになったとき
    if (oldInput > heightInputThreshold && currentInput <= heightInputThreshold) {
        trigger = true;
    }

    return trigger;
};

$.onStart(() => {
    resetAll();
});

// 座った人の記録を取得する
$.onRide((isGetOn, player) => {
    if (!isGetOn) {
        resetAll();
        return;
    }

    $.setStateCompat("this", pointState, $.getStateCompat("owner", pointState, "integer"));
    
    for(let i = 1; i <= 16; i++) {
        $.setStateCompat("this", getFlagStates + i, $.getStateCompat("owner", getFlagStates + i, "boolean"));
        $.setStateCompat("this", getCountStates + i, $.getStateCompat("owner", getCountStates + i, "integer"));
        $.setStateCompat("this", maxSizeStates + i, $.getStateCompat("owner", maxSizeStates + i, "float"));
    }
});

// 座り位置を調整
const updateSeatHeight = () => {
    let seatHeight = $.state.seatHeight + seatHeightUnit;
    if (seatHeight > seatHeightMax) {
        seatHeight = seatHeightMin;
    }
    seat.setPosition(new Vector3(0, seatHeight, 0));
    $.state.seatHeight = seatHeight;
};

$.onUpdate((deltaTime) => {
    let additionalAxisInput = $.getStateCompat("this", additionalAxisInputState, "float");
    let oldAdditionalAxisInput = $.state.additionalAxisInput;
    if (getSeatInput(additionalAxisInput, oldAdditionalAxisInput)) {
        updateSeatHeight();
    }

    $.state.additionalAxisInput = additionalAxisInput;
});