// 박스 하나는 무조건 포인트 획득
// 가챠 확률 100%
export const rewardTableBox1 = [
  { point: 500, chance: 40 }, // 1포인트 획득 확률 40%
  { point: 700, chance: 30 },
  { point: 1000, chance: 10 },
  { point: 3000, chance: 10 },
  { point: 5000, chance: 5 },
  { point: 10000, chance: 3.2 },
  { point: 50000, chance: 1.2 },
  { point: 100000, chance: 0.5 },
  { point: 500000, chance: 0.09 },
  { point: 1000000, chance: 0.01 },
];

// 나머지 박스는 꽝
export const rewardTableBox2 = [{ point: 0, chance: 100 }];
