// Source of truth: TypeScript. Vite generates content-hashed browser bundles under public/build/.
export function filterPracticeSigns(signs, activeGroupId) {
  const source = Array.isArray(signs) ? signs : [];
  if (activeGroupId === "all") return source;
  if (activeGroupId === null || activeGroupId === undefined || activeGroupId === "") return [];
  const groupId = Number(activeGroupId);
  if (!Number.isFinite(groupId)) return [];
  return source.filter((sign) => Number(sign?.groupId) === groupId);
}

export function findPracticeGroup(groups, activeGroupId) {
  if (activeGroupId === "all") {
    return {
      id: "all",
      name: "すべてのサイン",
      description: "登録されているすべてのサインをまとめて練習します。",
      videoId: ""
    };
  }
  if (activeGroupId === null || activeGroupId === undefined || activeGroupId === "") return null;
  const groupId = Number(activeGroupId);
  if (!Number.isFinite(groupId)) return null;
  return (Array.isArray(groups) ? groups : []).find((group) => Number(group?.id) === groupId) || null;
}

export function getPracticeOptions(signCount) {
  const count = Math.max(0, Number(signCount) || 0);
  if (count === 0) return [];
  if (count < 5) {
    return [{ count: "all", main: `${count}問で練習する`, sub: `登録されている全${count}サイン`, recommended: true, badge: "全サイン" }];
  }
  if (count === 5) {
    return [{ count: "all", main: "5問で練習する", sub: "登録されている全サイン", recommended: true, badge: "全サイン" }];
  }
  if (count < 10) {
    return [
      { count: 5, main: "5問ではじめる", sub: "サクッと練習", recommended: false },
      { count: "all", main: `${count}問で練習する`, sub: `全${count}サインをじっくり練習`, recommended: true, badge: "全サイン" }
    ];
  }
  return [
    { count: 10, main: "10問ではじめる", sub: "しっかり練習", recommended: true, badge: "おすすめ" },
    { count: 5, main: "5問ではじめる", sub: "サクッと練習", recommended: false },
    { count: "all", main: "全てのサイン", sub: `じっくり練習 · ${count}種類`, recommended: false }
  ];
}
