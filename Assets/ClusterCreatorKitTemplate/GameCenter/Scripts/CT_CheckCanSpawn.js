const canSpawnState = "canSpawn";
const cannotSpawnState = "cannotSpawn";

const capsuleSpawn = $.subNode("CapsuleSpawn");
const capsuleCheckDistance = 0.05;

$.onUpdate((deltaTime) => {
    let spawnPosition = $.getPosition().add(capsuleSpawn.getPosition().applyQuaternion($.getRotation()));
    let itemsNearSpawnPosition = $.getItemsNear(spawnPosition, capsuleCheckDistance);

    // 取り出し口に商品が残っていると購入できない
    let canSpawn = (itemsNearSpawnPosition.length === 0);
    $.setStateCompat("this", canSpawnState, canSpawn);
    $.setStateCompat("this", cannotSpawnState, !canSpawn);
});