const TYPE_HINTS = [
  ["AthenaWeapon", "Weapon Definition"],
  ["WeaponStats", "Weapon Stats"],
  ["AthenaCharacter", "Character Item"],
  ["SkeletalMesh", "Skeletal Mesh"],
  ["StaticMesh", "Static Mesh"],
  ["Texture2D", "Texture"],
  ["MaterialInstance", "Material Instance"],
  ["Material", "Material"],
  ["SoundWave", "Sound"],
  ["SoundCue", "Sound"],
  ["AnimSequence", "Animation"],
  ["AnimMontage", "Animation"],
  ["Niagara", "VFX"],
  ["Blueprint", "Blueprint"],
  ["DataAsset", "Data Asset"],
  ["DataTable", "Data Table"]
];

export class FortniteClassifier {
  classify(asset) {
    const haystack = `${asset.fileName} ${asset.objectName} ${asset.assetType} ${asset.names?.map((x) => x.value).join(" ")}`;
    return TYPE_HINTS.find(([needle]) => haystack.includes(needle))?.[1] ?? asset.assetType ?? "Unknown";
  }
}
