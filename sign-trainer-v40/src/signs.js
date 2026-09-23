const DEFAULT_SIGNS = [
  { id: "steal", name: "盗塁", videos: ["ykwIJYh8oxo"] },
  { id: "bunt", name: "バント", videos: ["_2ujH2nEtOc"] },
  { id: "take", name: "待て", videos: ["fT0yEpxO9PQ"] },
  { id: "hit-and-run", name: "ヒットエンドラン", videos: ["IJNHoysk3-c"] },
  { id: "buster", name: "バスター", videos: ["A2FEzscDhJY"] },
  { id: "safety-bunt", name: "セーフティバント", videos: ["nqnyCmyfZ7k"] },
  { id: "squeeze", name: "スクイズ", videos: ["8cYBvzQKelc"] },
  { id: "run-and-hit", name: "ランエンドヒット", videos: ["JYT0yxyvHJU"] },
  { id: "free-swing", name: "サイン解除／自由に打て", videos: ["SLGZzjdatb0"] },
  { id: "sacrifice-bunt", name: "送りバント", videos: ["76OBENrzcXc"] }
];

function isValidSign(sign) {
  return Boolean(
    sign &&
      typeof sign.id === "string" &&
      typeof sign.name === "string" &&
      Array.isArray(sign.videos) &&
      sign.videos.length > 0 &&
      sign.videos.every((videoId) => typeof videoId === "string" && videoId.length > 0)
  );
}

export function getSigns(env) {
  if (env.SIGNS_JSON) {
    try {
      const parsed = JSON.parse(env.SIGNS_JSON);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValidSign)) {
        return parsed;
      }
      console.warn("SIGNS_JSON is present but invalid; falling back to src/signs.js");
    } catch (error) {
      console.warn("SIGNS_JSON could not be parsed; falling back to src/signs.js", error);
    }
  }

  return DEFAULT_SIGNS;
}
