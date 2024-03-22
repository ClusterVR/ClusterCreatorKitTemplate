// 釣り竿を投げる動きにかかる時間
const castMotionTimeSeconds = 1;
// 釣り竿の最初の角度
const castMotionDefault = new Vector3(-30, -10, 0);
// 釣り竿を投げたときの角度
const castMotionTarget = new Vector3(0, 0, 0);

// ヒットするまでの時間の最小・最大
const hitTimeSecondsMin = 10;
const hitTimeSecondsMax = 180;

// 動かすモデル
const motionRoot = $.subNode("Rods");

// ヒット表示・エフェクトなど
const isHitState = "isHit";
const isInWaterState = "isInWater";

const hitSignalState = "Hit";
const castSignalState = "Cast";
const catchSignalState = "Catch";

// PlayerがTargetのStateは他と被らないようPrefixをつける
const playerStatePrefix = "fishing_";

// プレイヤーの所持ポイント
const pointState = playerStatePrefix + "points";

// 釣り上げた際の結果表示用
const resultSignal = playerStatePrefix + "ShowResult";
const resultSizeState = playerStatePrefix + "resultSize";
const resultPointState = playerStatePrefix + "resultPoints";
const resultNewRecordState = playerStatePrefix + "resultSizeIsNewRecord";
const resultNewSpecyState = playerStatePrefix + "resultNewSpecy";

const resultNewRecordSignalState = playerStatePrefix + "UpdateMaxSize";
const resultNewSpecySignalState = playerStatePrefix + "GetNewSpecy";

// 魚の種類ごとのデータ
// subNode: 表示する子オブジェクト
// probability: 確率の比率
// standardSize: サイズの基準値
// sizeRandom: standardSizeから最大値・最小値までの幅
// points: 獲得ポイント
const fishes = [
    { index: 1, subNode: $.subNode("Prize_1"), probability: 1, standardSize: 20, sizeRandom: 5, points: 10 },
    { index: 2, subNode: $.subNode("Prize_2"), probability: 0.25, standardSize: 20, sizeRandom: 5, points: 5 },
    { index: 3, subNode: $.subNode("Prize_3"), probability: 0.9, standardSize: 30, sizeRandom: 7, points: 20 },
    { index: 4, subNode: $.subNode("Prize_4"), probability: 0.225, standardSize: 30, sizeRandom: 7, points: 50 },
    { index: 5, subNode: $.subNode("Prize_5"), probability: 0.8, standardSize: 15, sizeRandom: 5, points: 15 },
    { index: 6, subNode: $.subNode("Prize_6"), probability: 0.2, standardSize: 15, sizeRandom: 5, points: 30 },
    { index: 7, subNode: $.subNode("Prize_7"), probability: 0.7, standardSize: 40, sizeRandom: 10, points: 30 },
    { index: 8, subNode: $.subNode("Prize_8"), probability: 0.175, standardSize: 40, sizeRandom: 10, points: 60 },
    { index: 9, subNode: $.subNode("Prize_9"), probability: 0.175, standardSize: 40, sizeRandom: 10, points: 50 },
    { index: 10, subNode: $.subNode("Prize_10"), probability: 0.0875, standardSize: 40, sizeRandom: 10, points: 100 },
    { index: 11, subNode: $.subNode("Prize_11"), probability: 0.6, standardSize: 15, sizeRandom: 5, points: 20 },
    { index: 12, subNode: $.subNode("Prize_12"), probability: 0.15, standardSize: 15, sizeRandom: 5, points: 40 },
    { index: 13, subNode: $.subNode("Prize_13"), probability: 0.6, standardSize: 25, sizeRandom: 5, points: 0 },
    { index: 14, subNode: $.subNode("Prize_14"), probability: 0.6, standardSize: 10, sizeRandom: 2, points: 0 },
    { index: 15, subNode: $.subNode("Prize_15"), probability: 0.6, standardSize: 30, sizeRandom: 5, points: 0 },
    { index: 16, subNode: $.subNode("Prize_16"), probability: 0.05, standardSize: 20, sizeRandom: 2, points: 100 }
];

// 個別の魚に関するState
// 後ろにindexをつけて使う
const getFlagStates = playerStatePrefix + "getFlag";
const getCountStates = playerStatePrefix + "getCount";
const maxSizeStates = playerStatePrefix + "maxSize";

// 釣り竿を投げる操作の処理用
const additionalAxisInputState = "additionalAxis";
const castInputThreshold = 0.5;
const castInputWaitTimeSeconds = 1;

// 椅子の高さ調整用
const heightInputThreshold = -0.5;
const seat = $.subNode("Seat");
const seatHeightMax = 0.2;
const seatHeightMin = -0.1;
const seatHeightUnit = 0.06;

// 値を上下限の範囲に収める
const saturate = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};

// aとbの中間の値を返す
const lerp = (a, b, rate) => {
    return a + rate * (b - a);
};

// 重み付きルーレット
const weightenRoulette = (array, weightFunction) => {
    let weightSum = 0;
    array.forEach(element => {
        weightSum += weightFunction(element);
    });

    let roulette = Math.random() * weightSum;

    let selected = array.find(element => {
        let probability = weightFunction(element);
        if (probability >= roulette) return true;
        roulette -= probability;
        return false;
    });

    return selected;
};

// 平均0・分散1の正規分布乱数
const gaussianRandom = () => {
    let r = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
    return r;
};

// 初期化処理
const initialize = () => {
    resetAll();
    $.state.castSignal = 0;
    $.state.resetSignal = 0;
};

const resetAll = () => {
    $.state.isCast = false;
    $.state.castMotionRate = 0;
    $.state.timeFromCast = 0;
    $.state.hitTime = 0;
    $.state.isHit = false;
    $.state.waitingCastInput = 0;
    $.state.additionalAxisInput = 0;
    $.state.seatHeight = 0;
    seat.setPosition(new Vector3(0, 0, 0));
    resetFishes();
};

// 釣り竿の状態切り替え
const castSwitch = () => {
    let isCast = $.state.isCast;
    let isHit = $.state.isHit;

    // 釣り竿を投げた後、ヒットするまでは引き上げられない
    if (isCast && !isHit) return;

    $.state.isCast = !isCast;
    // Maxに近い方が出やすいようにする
    $.state.hitTime = lerp(hitTimeSecondsMin, hitTimeSecondsMax, saturate(1 - Math.abs(gaussianRandom() * 0.5), 0, 1));
    $.state.timeFromCast = 0;

    if ($.state.isCast) {
        $.sendSignalCompat("this", castSignalState);
        resetFishes();
    }
};

// ヒットの判定
const hitCheck = (deltaTime) => {
    if (!$.state.isCast) return false;
    if ($.state.isHit) return true;

    let timeFromCast = $.state.timeFromCast + deltaTime;
    $.state.timeFromCast = timeFromCast;
    return timeFromCast >= $.state.hitTime;
};

// 釣り竿の動き
const applyCastMotion = (deltaTime) => {
    let castMotionDelta = deltaTime / castMotionTimeSeconds;

    // isCastの状態によって動きの向きを変える
    let isCast = $.state.isCast;
    if (!isCast) castMotionDelta = -castMotionDelta;

    // 動きの割合を更新
    let castMotionRate = saturate($.state.castMotionRate + castMotionDelta, 0, 1);

    // イージング
    let easedCastMotionRate = castMotionEasing(castMotionRate);

    // 動きを反映
    // イージングの結果が[0, 1]に収まらないのでQuaternion.slerpは使わない
    motionRoot.setRotation(new Quaternion().setFromEulerAngles(
        new Vector3(
            lerp(castMotionDefault.x, castMotionTarget.x, easedCastMotionRate),
            lerp(castMotionDefault.y, castMotionTarget.y, easedCastMotionRate),
            lerp(castMotionDefault.z, castMotionTarget.z, easedCastMotionRate),
        )
    ));

    // 更新した値を保存
    $.state.castMotionRate = castMotionRate;
};

const castMotionEasing = (x) => {
    const coeff = 8;
    
    return x < 0.5
      ? (Math.pow(2 * x, 2) * ((coeff + 1) * 2 * x - coeff)) / 2
      : (Math.pow(2 * x - 2, 2) * ((coeff + 1) * (x * 2 - 2) + coeff) + 2) / 2;
};


// 魚の種類をランダムに選択
const selectFish = () => {
    return weightenRoulette(fishes, fish => fish.probability);
};

// 魚のサイズをランダムに決定
const measureFish = (fish) => {
    // 分散0.5の正規分布は約95%が[-1, 1]に収まる
    let variance = 0.5;

    // 大きいサイズを釣ったことがあるほどサイズの振れ幅が大きくなり、より大きい魚が釣れやすくなる
    if (fish.sizeRandom > 0) {
        let maxSize = $.getStateCompat("owner", maxSizeStates + fish.index, "float");
        if (maxSize <= 0) maxSize = fish.standardSize;
        let maxSizeDiff = maxSize - fish.standardSize;
        let maxSizeRate = saturate(maxSizeDiff / fish.sizeRandom, 0.2, 1);
        variance *= maxSizeRate;
    }

    // [-1, 1]に収まる値が出るまで分散を小さくしていきながら再抽選
    let r = Infinity;
    while (Math.abs(r) > 1) {
        r = gaussianRandom() * variance;
        variance *= 0.9;
    }
    return fish.standardSize + r * fish.sizeRandom;
};

// 魚を釣り上げる処理
const catchFish = (fish) => {
    fish.subNode.setEnabled(true);
    $.setStateCompat("owner", getFlagStates + fish.index, true);

    let size = measureFish(fish);
    let maxSize = $.getStateCompat("owner", maxSizeStates + fish.index, "float");
    if (size > maxSize) {
        // maxSizeが初期値（0）＝新種
        if (maxSize == 0) {
            $.setStateCompat("owner", resultNewRecordState, false);
            $.setStateCompat("owner", resultNewSpecyState, true);
            $.sendSignalCompat("owner", resultNewSpecySignalState);
        }
        else {
            $.setStateCompat("owner", resultNewRecordState, true);
            $.setStateCompat("owner", resultNewSpecyState, false);
            $.sendSignalCompat("owner", resultNewRecordSignalState);
        }
        $.setStateCompat("owner", maxSizeStates + fish.index, size);
    }
    else {
        $.setStateCompat("owner", resultNewRecordState, false);
        $.setStateCompat("owner", resultNewSpecyState, false);
    }

    let count = $.getStateCompat("owner", getCountStates + fish.index, "integer");
    count++;
    $.setStateCompat("owner", getCountStates + fish.index, count);

    let points = $.getStateCompat("owner", pointState, "integer");
    points += fish.points;
    $.setStateCompat("owner", pointState, points);

    // 結果表示
    $.setStateCompat("owner", resultPointState, fish.points);
    $.setStateCompat("owner", resultSizeState, size);
    $.sendSignalCompat("owner", resultSignal);
};

// 魚の表示をリセット
const resetFishes = () => {
    fishes.forEach(fish => {
        fish.subNode.setEnabled(false);
    });
};

// 竿の操作の入力
const getCastInput = (deltaTime, currentInput, oldInput) => {
    // 前回の入力から一定時間は入力を受け付けない
    let waitingCastInput = $.state.waitingCastInput - deltaTime;
    if (waitingCastInput > 0) {
        $.state.waitingCastInput = waitingCastInput;
        return false;
    }

    let trigger = false;

    // 入力がしきい値を超えた瞬間に入力判定
    // Spaceキー入力＝Additional Axisがプラスになったとき
    if (oldInput < castInputThreshold && currentInput >= castInputThreshold) {
        trigger = true;
        $.state.waitingCastInput = castInputWaitTimeSeconds;
    }

    return trigger;
};

// 椅子の座り位置を調整する入力
const getSeatInput = (currentInput, oldInput) => {
    let trigger = false;

    // 入力がしきい値を超えた瞬間に入力判定
    // Shiftキー入力＝Additional Axisがマイナスになったとき
    if (oldInput > heightInputThreshold && currentInput <= heightInputThreshold) {
        trigger = true;
    }

    return trigger;
}

// 座り位置を調整
const updateSeatHeight = () => {
    let seatHeight = $.state.seatHeight + seatHeightUnit;
    if (seatHeight > seatHeightMax) {
        seatHeight = seatHeightMin;
    }
    seat.setPosition(new Vector3(0, seatHeight, 0));
    $.state.seatHeight = seatHeight;
};

$.onStart(() => {
    initialize();
});

$.onUpdate((deltaTime) => {
    // リセット
    // チェアから降りたときなどにSignalが通知される
    let resetSignal = $.getStateCompat("this", "Reset", "signal").getTime();
    if (resetSignal != $.state.resetSignal) {
        resetAll();
        $.state.resetSignal = resetSignal;
    }

    let additionalAxisInput = $.getStateCompat("this", additionalAxisInputState, "float");
    let oldAdditionalAxisInput = $.state.additionalAxisInput;
    // 釣り竿操作
    if (getCastInput(deltaTime, additionalAxisInput, oldAdditionalAxisInput)) {
        castSwitch();

        // 釣り竿を引き上げたとき
        if (!$.state.isCast) {
            if ($.state.isHit) {
                let fish = selectFish();
                catchFish(fish);
                $.sendSignalCompat("this", catchSignalState);
            }
        }
    }

    if (getSeatInput(additionalAxisInput, oldAdditionalAxisInput)) {
        updateSeatHeight();
    }

    $.state.additionalAxisInput = additionalAxisInput;

    // 釣り竿の動きを更新
    applyCastMotion(deltaTime);

    // ヒット判定
    let isHit = hitCheck(deltaTime);
    
    // ヒットした瞬間を通知
    if ($.state.isHit == false && isHit == true) $.sendSignalCompat("this", hitSignalState);

    $.state.isHit = isHit;
    $.setStateCompat("this", isHitState, isHit);
    $.setStateCompat("this", isInWaterState, $.state.castMotionRate >= 1);
});